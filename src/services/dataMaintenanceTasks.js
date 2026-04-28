/**
 * Data Maintenance Actions
 */
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { app } from "./firebase";
import { auth } from "./firebaseAuth";
import { generateTagsSecure, generateCritiqueSecure } from "./geminiSecure";
import { logger } from "../utils/logger";
import { normalizeStatus } from "../utils/questionHelpers";
import { calculateReviewerAverageScore } from "../utils/reviewerAnalytics";

const db = getFirestore(app);

// Constants
const BATCH_SIZE_DEFAULT = 500;
const API_RATE_LIMIT_MS = 4000;
const TEXT_TRUNCATE_LIMIT = 40;
const LIST_LIMIT = 3;
const COOLDOWN_WAIT_MS = 6500;
const SHORT_LIMIT = 5;

/** Normalizes statuses and timestamps */
export async function repairStatuses(onProgress, dryRun = false) {
  const snapshot = await getDocs(collection(db, "questions"));
  const questionsToFix = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const currentStatus = data.status;
    const normalizedStatus = normalizeStatus(currentStatus);
    const needsTimestamp = !data.firestoreUpdatedAt;
    if (currentStatus !== normalizedStatus || needsTimestamp) {
      questionsToFix.push({
        id: docSnap.id,
        currentStatus,
        normalizedStatus,
        needsTimestamp,
      });
    }
  });

  if (dryRun || questionsToFix.length === 0)
    return { updated: 0, total: questionsToFix.length, dryRun };

  const batchSize = BATCH_SIZE_DEFAULT;
  let updated = 0;
  for (let i = 0; i < questionsToFix.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = questionsToFix.slice(i, i + batchSize);
    chunk.forEach((item) => {
      const ref = doc(db, "questions", String(item.id));
      const updates = { status: item.normalizedStatus };
      if (item.needsTimestamp) updates.firestoreUpdatedAt = Timestamp.now();
      batch.update(ref, updates);
    });
    await batch.commit();
    updated += chunk.length;
    onProgress(`Repaired ${updated}/${questionsToFix.length}...`);
  }
  return { updated, total: questionsToFix.length, dryRun: false };
}

/** Backfills AI critique scores */
export async function backfillAIScoresForVerified(onProgress, dryRun = false) {
  const snapshot = await getDocs(
    query(collection(db, "questions"), where("status", "==", "accepted"))
  );
  const needsScore = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.critiqueScore === null || data.critiqueScore === undefined) {
      needsScore.push({
        id: docSnap.id,
        question: data.question,
        options: data.options,
        correct: data.correct || data.correctLetter,
        sourceExcerpt: data.sourceExcerpt,
        verifiedBy: data.humanVerifiedBy || data.acceptedBy || "Unknown",
      });
    }
  });

  if (dryRun || needsScore.length === 0)
    return { updated: 0, failed: 0, total: needsScore.length, dryRun };

  let updated = 0;
  let failed = 0;
  for (const q of needsScore) {
    try {
      onProgress(
        `Critiquing: "${q.question?.substring(0, TEXT_TRUNCATE_LIMIT)}..."`
      );
      const result = await generateCritiqueSecure(null, {
        question: q.question,
        options: q.options,
        correct: q.correct,
        sourceExcerpt: q.sourceExcerpt,
      });
      if (result?.score !== null && result?.score !== undefined) {
        await updateDoc(doc(db, "questions", String(q.id)), {
          critiqueScore: result.score,
          critique: result.text || "",
          _backfilledScore: true,
          _backfilledAt: new Date().toISOString(),
        });
        updated++;
      } else failed++;
    } catch (error) {
      logger.error("Maintenance task failed:", error);
      failed++;
    }
    await new Promise((r) => setTimeout(r, API_RATE_LIMIT_MS));
  }
  return { updated, failed, total: needsScore.length, dryRun: false };
}

/** Restores kicked-back questions */
export async function restoreKickedBack(onProgress, dryRun = false) {
  const snapshot = await getDocs(
    query(collection(db, "questions"), where("status", "==", "pending"))
  );
  const needsRestore = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (
      data.kickedBackReason &&
      (data.critiqueScore === null || data.critiqueScore === undefined)
    ) {
      needsRestore.push({
        id: docSnap.id,
        question: data.question,
        options: data.options,
        correct: data.correct || data.correctLetter,
        sourceExcerpt: data.sourceExcerpt,
        originalVerifier:
          data.kickedBackBy ||
          data.acceptedBy ||
          data.reviewerName ||
          "Unknown",
      });
    }
  });

  if (dryRun || needsRestore.length === 0)
    return { updated: 0, failed: 0, total: needsRestore.length, dryRun };

  let updated = 0;
  let failed = 0;
  for (const q of needsRestore) {
    try {
      onProgress(
        `Restoring: "${q.question?.substring(0, TEXT_TRUNCATE_LIMIT)}..."`
      );
      const result = await generateCritiqueSecure(null, {
        question: q.question,
        options: q.options,
        correct: q.correct,
        sourceExcerpt: q.sourceExcerpt,
      });
      if (result?.score !== null && result?.score !== undefined) {
        await updateDoc(doc(db, "questions", String(q.id)), {
          critiqueScore: result.score,
          critique: result.text || "",
          status: "accepted",
          humanVerified: true,
          humanVerifiedBy: q.originalVerifier,
          humanVerifiedAt: new Date().toISOString(),
        });
        updated++;
      } else failed++;
    } catch (error) {
      logger.error("Maintenance task failed:", error);
      failed++;
    }
    await new Promise((r) => setTimeout(r, API_RATE_LIMIT_MS));
  }
  return { updated, failed, total: needsRestore.length, dryRun: false };
}

/** Backfills humanVerified flag */
export async function backfillHumanVerified(onProgress, dryRun = false) {
  const snapshot = await getDocs(
    query(collection(db, "questions"), where("status", "==", "accepted"))
  );
  const needsUpdate = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data.humanVerified) {
      needsUpdate.push({
        id: docSnap.id,
        acceptedBy: data.acceptedBy || data.creatorEmail || "Unknown",
        acceptedAt: data.acceptedAt || new Date().toISOString(),
      });
    }
  });

  if (dryRun || needsUpdate.length === 0)
    return { updated: 0, total: needsUpdate.length, dryRun };

  const batchSize = BATCH_SIZE_DEFAULT;
  let updated = 0;
  for (let i = 0; i < needsUpdate.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = needsUpdate.slice(i, i + batchSize);
    chunk.forEach((item) => {
      batch.update(doc(db, "questions", String(item.id)), {
        humanVerified: true,
        humanVerifiedBy: item.acceptedBy,
        humanVerifiedAt: item.acceptedAt,
      });
    });
    await batch.commit();
    updated += chunk.length;
    onProgress(`Updated ${updated}/${needsUpdate.length}...`);
  }
  return { updated, total: needsUpdate.length, dryRun: false };
}

/** Kicks back missing scores */
export async function kickBackMissingScores(onProgress, dryRun = false) {
  const snapshot = await getDocs(
    query(collection(db, "questions"), where("status", "==", "accepted"))
  );
  const needsKickBack = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.critiqueScore === null || data.critiqueScore === undefined)
      needsKickBack.push({ id: docSnap.id });
  });

  if (dryRun || needsKickBack.length === 0)
    return { updated: 0, total: needsKickBack.length, dryRun };

  const batchSize = BATCH_SIZE_DEFAULT;
  let updated = 0;
  for (let i = 0; i < needsKickBack.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = needsKickBack.slice(i, i + batchSize);
    chunk.forEach((item) => {
      batch.update(doc(db, "questions", String(item.id)), {
        status: "pending",
        humanVerified: false,
        kickedBackAt: new Date().toISOString(),
        kickedBackBy: auth.currentUser?.email || "System",
        kickedBackReason: "Missing AI critique",
      });
    });
    await batch.commit();
    updated += chunk.length;
  }
  return { updated, total: needsKickBack.length, dryRun: false };
}

/** Backfills verifier names */
export async function backfillVerifierNames(onProgress, dryRun = false) {
  const snapshot = await getDocs(
    query(collection(db, "questions"), where("humanVerified", "==", true))
  );
  const needsUpdate = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data.humanVerifiedBy) {
      const fallback = data.acceptedBy || data.creatorEmail || null;
      if (fallback)
        needsUpdate.push({ id: docSnap.id, verifierName: fallback });
    }
  });

  if (dryRun || needsUpdate.length === 0)
    return { updated: 0, total: needsUpdate.length, dryRun };

  const batchSize = BATCH_SIZE_DEFAULT;
  let updated = 0;
  for (let i = 0; i < needsUpdate.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = needsUpdate.slice(i, i + batchSize);
    chunk.forEach((item) => {
      batch.update(doc(db, "questions", String(item.id)), {
        humanVerifiedBy: item.verifierName,
      });
    });
    await batch.commit();
    updated += chunk.length;
  }
  return { updated, total: needsUpdate.length, dryRun: false };
}

/** Backfills tags */
export async function backfillTags(onProgress, dryRun = false) {
  const snapshot = await getDocs(
    query(collection(db, "questions"), where("status", "==", "accepted"))
  );
  const needsTags = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const tags = Array.isArray(data.tags) ? data.tags : [];
    if (tags.length < LIST_LIMIT)
      needsTags.push({
        id: docSnap.id,
        question: data.question,
        options: data.options,
        currentTags: tags,
      });
  });

  if (dryRun || needsTags.length === 0)
    return { updated: 0, total: needsTags.length, dryRun };

  let updated = 0;
  for (const q of needsTags) {
    try {
      const newTags = await generateTagsSecure(q.question, q.options);
      if (newTags && newTags.length > 0) {
        const merged = [
          ...new Set([
            ...q.currentTags,
            ...newTags.map((t) => t.replace(/^#/, "")),
          ]),
        ].slice(0, SHORT_LIMIT);
        await updateDoc(doc(db, "questions", String(q.id)), { tags: merged });
        updated++;
      }
      await new Promise((r) => setTimeout(r, COOLDOWN_WAIT_MS));
    } catch (error) {
      logger.warn("Maintenance task ignored error:", error);
    }
  }
  return { updated, total: needsTags.length, dryRun: false };
}

/**
 * Backfills average scores for rejected questions missing a critiqueScore.
 * Uses the reviewer's personal average score if they have >= 10 scored reviews.
 */
export async function backfillAverageScores(onProgress, dryRun = false) {
  const snapshot = await getDocs(collection(db, "questions"));
  const allQuestions = [];
  snapshot.forEach((docSnap) =>
    allQuestions.push({ ...docSnap.data(), id: docSnap.id })
  );

  const needsUpdate = [];
  const reviewerCache = new Map(); // Cache calculated averages

  allQuestions.forEach((q) => {
    if (
      q.status === "rejected" &&
      (q.critiqueScore === null || q.critiqueScore === undefined)
    ) {
      const reviewerName =
        q.reviewerName ||
        q.acceptedBy ||
        q.creatorEmail ||
        q.creatorName ||
        "Unknown";

      // Calculate/Get average for this reviewer
      if (!reviewerCache.has(reviewerName)) {
        reviewerCache.set(
          reviewerName,
          calculateReviewerAverageScore(reviewerName, allQuestions)
        );
      }

      const { averageScore, totalScored } = reviewerCache.get(reviewerName);
      const THRESHOLD = 10;

      if (totalScored >= THRESHOLD && averageScore !== null) {
        needsUpdate.push({
          id: q.id,
          score: averageScore,
          reviewerName,
          totalScored,
        });
      }
    }
  });

  if (dryRun || needsUpdate.length === 0)
    return { updated: 0, total: needsUpdate.length, dryRun };

  let updated = 0;
  let failed = 0;
  for (const item of needsUpdate) {
    try {
      onProgress(
        `Applying average (${item.score}) to doc by ${item.reviewerName}...`
      );
      const ref = doc(db, "questions", String(item.id));
      await updateDoc(ref, {
        critiqueScore: item.score,
        _backfilledAverage: true,
        _backfilledAt: new Date().toISOString(),
        _basedOnCount: item.totalScored,
      });
      updated++;
    } catch (error) {
      if (error.code === "not-found") {
        logger.warn(`Document ${item.id} not found during backfill, skipping.`);
      } else {
        logger.error(`Failed to backfill score for ${item.id}:`, error);
        failed++;
      }
    }
  }
  return { updated, failed, total: needsUpdate.length, dryRun: false };
}
