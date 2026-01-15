/**
 * Data Maintenance - Backfill Operations
 *
 * Admin-only component for running data maintenance operations:
 * - Backfill humanVerified for accepted questions
 * - Backfill tags for questions with fewer than 3 tags
 */

import { useState } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import { app } from "../../services/firebase";
import { auth } from "../../services/firebaseAuth";
import {
  generateTagsSecure,
  generateCritiqueSecure,
} from "../../services/geminiSecure";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";
import { logger } from "../../utils/logger";
import { normalizeStatus } from "../../utils/questionHelpers";
import { TOAST_DURATION } from "../../utils/constants";

const db = getFirestore(app);

// Rate limiting constant - 4 seconds between API calls (15/min, under Cloud Function 20/min limit)
const API_RATE_LIMIT_MS = 4000;
/**
 * Repair question statuses: Normalize statuses (e.g., "Approved" -> "accepted")
 * and backfill missing firestoreUpdatedAt timestamps.
 */
async function repairStatuses(onProgress, dryRun = false) {
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

  onProgress(
    `Found ${questionsToFix.length} questions with status/timestamp issues`
  );

  if (dryRun || questionsToFix.length === 0) {
    return { updated: 0, total: questionsToFix.length, dryRun };
  }

  const batchSize = 500;
  let updated = 0;

  for (let i = 0; i < questionsToFix.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = questionsToFix.slice(i, i + batchSize);

    chunk.forEach((item) => {
      const ref = doc(db, "questions", String(item.id));
      const updates = { status: item.normalizedStatus };
      if (item.needsTimestamp) {
        updates.firestoreUpdatedAt = new Date().toISOString();
      }
      batch.update(ref, updates);
    });

    await batch.commit();
    updated += chunk.length;
    onProgress(`Repaired ${updated}/${questionsToFix.length}...`);
  }

  return { updated, total: questionsToFix.length, dryRun: false };
}

/**
 * Backfill AI critique scores for accepted questions that are missing scores.
 * Also ensures humanVerified is set for consistency.
 * PRESERVES existing humanVerifiedBy if present.
 */
async function backfillAIScoresForVerified(onProgress, dryRun = false) {
  // Find ALL accepted questions - we'll filter for missing scores in JS
  const snapshot = await getDocs(
    query(collection(db, "questions"), where("status", "==", "accepted"))
  );

  const needsScore = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    // Only include questions without a critique score
    if (data.critiqueScore === null || data.critiqueScore === undefined) {
      needsScore.push({
        id: docSnap.id,
        question: data.question,
        options: data.options,
        correct: data.correct || data.correctLetter,
        sourceExcerpt: data.sourceExcerpt,
        verifiedBy: data.humanVerifiedBy || data.acceptedBy || "Unknown",
        wasVerified: data.humanVerified === true, // Track if already verified
      });
    }
  });

  onProgress(`Found ${needsScore.length} accepted questions without AI Score`);

  if (dryRun || needsScore.length === 0) {
    return { updated: 0, failed: 0, total: needsScore.length, dryRun };
  }

  let updated = 0;
  let failed = 0;

  for (const q of needsScore) {
    try {
      onProgress(
        `Critiquing ${updated + failed + 1}/${
          needsScore.length
        }: "${q.question?.substring(0, 40)}..." (by ${q.verifiedBy})`
      );

      // Run AI critique to get score
      const result = await generateCritiqueSecure(null, {
        question: q.question,
        options: q.options,
        correct: q.correct,
        sourceExcerpt: q.sourceExcerpt,
      });

      const score = result?.score;
      const text = result?.text;

      if (score !== null && score !== undefined) {
        const ref = doc(db, "questions", String(q.id));
        // Ensure consistent state: score + humanVerified
        const updateData = {
          critiqueScore: score,
          critique: text || "",
          _scoreBackfilledAt: new Date().toISOString(),
        };
        // Only set humanVerified if not already set (preserve Greg's timestamps)
        if (!q.wasVerified) {
          updateData.humanVerified = true;
          updateData.humanVerifiedBy = q.verifiedBy;
          updateData.humanVerifiedAt = new Date().toISOString();
          updateData._verifiedByBackfill = true;
        }
        await updateDoc(ref, updateData);
        updated++;
        logger.log(`✅ Backfilled score ${score} for question ${q.id}`);
      } else {
        failed++;
        logger.warn(`⚠️ No score returned for question ${q.id}`);
      }
    } catch (error) {
      logger.error(`❌ Critique failed for question ${q.id}:`, error.message);
      failed++;
      // Continue to next question - don't stop the whole process
    }

    // Rate limit - avoid API throttling
    await new Promise((resolve) => setTimeout(resolve, API_RATE_LIMIT_MS));
  }

  return { updated, failed, total: needsScore.length, dryRun: false };
}

/**
 * Restore kicked-back questions: Add AI scores AND set back to accepted.
 * For questions that were verified by reviewers but kicked back due to missing scores.
 * Preserves the original verifier's name and restores to accepted status.
 */
async function restoreVerifiedWithScores(onProgress, dryRun = false) {
  // Find all pending questions that were kicked back (have kickedBackReason)
  const snapshot = await getDocs(
    query(collection(db, "questions"), where("status", "==", "pending"))
  );

  const needsRestore = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    // Find questions that were kicked back AND don't have a score yet
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
        // Preserve original verifier info from before kickback
        originalVerifier:
          data.kickedBackBy ||
          data.acceptedBy ||
          data.reviewerName ||
          "Unknown",
      });
    }
  });

  onProgress(`Found ${needsRestore.length} kicked-back questions to restore`);

  if (dryRun || needsRestore.length === 0) {
    return { updated: 0, failed: 0, total: needsRestore.length, dryRun };
  }

  let updated = 0;
  let failed = 0;

  for (const q of needsRestore) {
    try {
      onProgress(
        `Restoring ${updated + failed + 1}/${
          needsRestore.length
        }: "${q.question?.substring(0, 40)}..." (by ${q.originalVerifier})`
      );

      // Run AI critique to get score
      const result = await generateCritiqueSecure(null, {
        question: q.question,
        options: q.options,
        correct: q.correct,
        sourceExcerpt: q.sourceExcerpt,
      });

      const score = result?.score;
      const text = result?.text;

      if (score !== null && score !== undefined) {
        const ref = doc(db, "questions", String(q.id));
        // RESTORE: Add score + set to accepted + preserve verifier
        await updateDoc(ref, {
          critiqueScore: score,
          critique: text || "",
          status: "accepted", // Restore to accepted
          humanVerified: true,
          humanVerifiedBy: q.originalVerifier,
          humanVerifiedAt: new Date().toISOString(),
          _restoredAt: new Date().toISOString(),
          _restoredWithScore: true,
        });
        updated++;
        logger.log(
          `✅ Restored question ${q.id} with score ${score}, verified by ${q.originalVerifier}`
        );
      } else {
        failed++;
        logger.warn(`⚠️ No score returned for question ${q.id}`);
      }
    } catch (error) {
      logger.error(`❌ Restore failed for question ${q.id}:`, error.message);
      failed++;
    }

    // Rate limit - avoid API throttling
    await new Promise((resolve) => setTimeout(resolve, API_RATE_LIMIT_MS));
  }

  return { updated, failed, total: needsRestore.length, dryRun: false };
}

/**
 * Backfill humanVerified for all accepted questions
 */
async function backfillHumanVerified(onProgress, dryRun = false) {
  const userEmail = auth.currentUser?.email || "Unknown";

  const snapshot = await getDocs(
    query(collection(db, "questions"), where("status", "==", "accepted"))
  );

  const needsUpdate = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data.humanVerified) {
      needsUpdate.push({
        id: docSnap.id,
        acceptedBy: data.acceptedBy || data.creatorEmail || userEmail,
        acceptedAt:
          data.acceptedAt ||
          data.firestoreUpdatedAt?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
      });
    }
  });

  onProgress(
    `Found ${needsUpdate.length} accepted questions without humanVerified`
  );

  if (dryRun || needsUpdate.length === 0) {
    return { updated: 0, total: needsUpdate.length, dryRun };
  }

  // Batch update in groups of 500
  const batchSize = 500;
  let updated = 0;

  for (let i = 0; i < needsUpdate.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = needsUpdate.slice(i, i + batchSize);

    chunk.forEach((item) => {
      const ref = doc(db, "questions", String(item.id));
      batch.update(ref, {
        humanVerified: true,
        humanVerifiedBy: item.acceptedBy,
        humanVerifiedAt: item.acceptedAt,
        _backfilledHumanVerified: true,
        _backfilledAt: new Date().toISOString(),
      });
    });

    await batch.commit();
    updated += chunk.length;
    onProgress(`Updated ${updated}/${needsUpdate.length}...`);
  }

  return { updated, total: needsUpdate.length, dryRun: false };
}

/**
 * Kick back accepted questions that are missing critiqueScore to pending
 * This fixes the pipeline bug where questions were accepted without AI critique
 */
async function kickBackMissingScores(onProgress, dryRun = false) {
  const snapshot = await getDocs(
    query(collection(db, "questions"), where("status", "==", "accepted"))
  );

  const needsKickBack = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    // Find accepted questions WITHOUT a critique score
    if (data.critiqueScore === null || data.critiqueScore === undefined) {
      needsKickBack.push({
        id: docSnap.id,
        question: data.question?.substring(0, 50) + "...",
      });
    }
  });

  onProgress(
    `Found ${needsKickBack.length} accepted questions without AI Score`
  );

  if (dryRun || needsKickBack.length === 0) {
    return { updated: 0, total: needsKickBack.length, dryRun };
  }

  // Batch update in groups of 500
  const batchSize = 500;
  let updated = 0;

  for (let i = 0; i < needsKickBack.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = needsKickBack.slice(i, i + batchSize);

    chunk.forEach((item) => {
      const ref = doc(db, "questions", String(item.id));
      batch.update(ref, {
        status: "pending",
        humanVerified: false,
        humanVerifiedBy: null,
        humanVerifiedAt: null,
        kickedBackAt: new Date().toISOString(),
        kickedBackBy: auth.currentUser?.email || "System",
        kickedBackReason: "Missing AI critique score - pipeline fix",
      });
    });

    await batch.commit();
    updated += chunk.length;
    onProgress(`Kicked back ${updated}/${needsKickBack.length}...`);
  }

  return { updated, total: needsKickBack.length, dryRun: false };
}

/**
 * Backfill humanVerifiedBy for questions that have humanVerified=true but missing the verifier name
 */
async function backfillVerifierNames(onProgress, dryRun = false) {
  const snapshot = await getDocs(
    query(collection(db, "questions"), where("humanVerified", "==", true))
  );

  const needsUpdate = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    // Only update if humanVerifiedBy is missing but we have a fallback
    if (!data.humanVerifiedBy) {
      const fallbackName = data.acceptedBy || data.creatorEmail || null;
      if (fallbackName) {
        needsUpdate.push({
          id: docSnap.id,
          verifierName: fallbackName,
        });
      }
    }
  });

  onProgress(
    `Found ${needsUpdate.length} verified questions missing humanVerifiedBy`
  );

  if (dryRun || needsUpdate.length === 0) {
    return { updated: 0, total: needsUpdate.length, dryRun };
  }

  // Batch update
  const batchSize = 500;
  let updated = 0;

  for (let i = 0; i < needsUpdate.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = needsUpdate.slice(i, i + batchSize);

    chunk.forEach((item) => {
      const ref = doc(db, "questions", String(item.id));
      batch.update(ref, {
        humanVerifiedBy: item.verifierName,
        _verifierBackfilledAt: new Date().toISOString(),
      });
    });

    await batch.commit();
    updated += chunk.length;
    onProgress(`Updated ${updated}/${needsUpdate.length}...`);
  }

  return { updated, total: needsUpdate.length, dryRun: false };
}

/**
 * Backfill tags for questions with fewer than 3 tags
 */
async function backfillTags(onProgress, dryRun = false) {
  const snapshot = await getDocs(
    query(collection(db, "questions"), where("status", "==", "accepted"))
  );

  const needsTags = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const tags = Array.isArray(data.tags) ? data.tags : [];
    if (tags.length < 3) {
      needsTags.push({
        id: docSnap.id,
        question: data.question,
        options: data.options,
        currentTags: tags,
      });
    }
  });

  onProgress(`Found ${needsTags.length} questions with < 3 tags`);

  if (dryRun || needsTags.length === 0) {
    return { updated: 0, total: needsTags.length, dryRun };
  }

  let updated = 0;
  let failed = 0;

  for (const q of needsTags) {
    try {
      onProgress(
        `Generating tags for question ${updated + 1}/${needsTags.length}...`
      );

      // Use secure tag generation
      const newTags = await generateTagsSecure(q.question, q.options);

      if (newTags && newTags.length > 0) {
        // Merge with existing, dedupe, limit to 5
        const mergedTags = [
          ...new Set([
            ...q.currentTags,
            ...newTags.map((t) => t.replace(/^#/, "")),
          ]),
        ].slice(0, 5);

        const ref = doc(db, "questions", String(q.id));
        await updateDoc(ref, {
          tags: mergedTags,
          tagsBackfilledAt: new Date().toISOString(),
        });
        updated++;
      }

      // Rate limit - 6.5 seconds between calls (9 per minute to stay under 10/min limit)
      await new Promise((resolve) => setTimeout(resolve, 6500));
    } catch (error) {
      logger.error("Tag generation failed:", error);
      failed++;
    }
  }

  return { updated, failed, total: needsTags.length, dryRun: false };
}

const DataMaintenance = ({ showMessage, isCollapsed, onToggle }) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [lastResult, setLastResult] = useState(null);

  const handleBackfillHumanVerified = async (dryRun = false) => {
    setProcessing(true);
    setProgress("Starting humanVerified backfill...");
    setLastResult(null);

    try {
      const result = await backfillHumanVerified(setProgress, dryRun);
      setLastResult(result);
      if (dryRun) {
        showMessage(
          `🔍 DRY RUN: ${result.total} questions would be updated`,
          TOAST_DURATION.EXTENDED
        );
      } else {
        showMessage(
          `✅ Updated ${result.updated} questions`,
          TOAST_DURATION.EXTENDED
        );
      }
    } catch (error) {
      logger.error("Backfill failed:", error);
      showMessage(`❌ Failed: ${error.message}`, TOAST_DURATION.EXTENDED);
    } finally {
      setProcessing(false);
      setProgress("");
    }
  };

  const handleBackfillTags = async (dryRun = false) => {
    setProcessing(true);
    setProgress("Starting tags backfill...");
    setLastResult(null);

    try {
      const result = await backfillTags(setProgress, dryRun);
      setLastResult(result);
      if (dryRun) {
        showMessage(
          `🔍 DRY RUN: ${result.total} questions would be updated`,
          TOAST_DURATION.EXTENDED
        );
      } else {
        showMessage(
          `✅ Updated ${result.updated}, Failed ${result.failed || 0}`,
          TOAST_DURATION.EXTENDED
        );
      }
    } catch (error) {
      logger.error("Backfill failed:", error);
      showMessage(`❌ Failed: ${error.message}`, TOAST_DURATION.EXTENDED);
    } finally {
      setProcessing(false);
      setProgress("");
    }
  };

  const handleBackfillVerifierNames = async (dryRun = false) => {
    setProcessing(true);
    setProgress("Checking verified questions for missing verifier names...");
    setLastResult(null);

    try {
      const result = await backfillVerifierNames(setProgress, dryRun);
      setLastResult(result);
      if (dryRun) {
        showMessage(
          `🔍 DRY RUN: ${result.total} questions would be updated`,
          TOAST_DURATION.EXTENDED
        );
      } else {
        showMessage(
          `✅ Updated ${result.updated} verifier names`,
          TOAST_DURATION.EXTENDED
        );
      }
    } catch (error) {
      logger.error("Verifier backfill failed:", error);
      showMessage(`❌ Failed: ${error.message}`, TOAST_DURATION.EXTENDED);
    } finally {
      setProcessing(false);
      setProgress("");
    }
  };

  const handleKickBackMissingScores = async (dryRun = false) => {
    setProcessing(true);
    setProgress("Finding accepted questions without AI Score...");
    setLastResult(null);

    try {
      const result = await kickBackMissingScores(setProgress, dryRun);
      setLastResult(result);
      if (dryRun) {
        showMessage(
          `🔍 DRY RUN: ${result.total} questions would be kicked back to pending`,
          TOAST_DURATION.EXTENDED
        );
      } else {
        showMessage(
          `✅ Kicked back ${result.updated} questions to pending for re-review`,
          TOAST_DURATION.EXTENDED
        );
      }
    } catch (error) {
      logger.error("Kick back failed:", error);
      showMessage(`❌ Failed: ${error.message}`, TOAST_DURATION.EXTENDED);
    } finally {
      setProcessing(false);
      setProgress("");
    }
  };

  const handleBackfillAIScores = async (dryRun = false) => {
    setProcessing(true);
    setProgress("Finding verified questions without AI Score...");
    setLastResult(null);

    try {
      const result = await backfillAIScoresForVerified(setProgress, dryRun);
      setLastResult(result);
      if (dryRun) {
        showMessage(
          `🔍 DRY RUN: ${result.total} verified questions need AI scores`,
          TOAST_DURATION.EXTENDED
        );
      } else {
        showMessage(
          `✅ Added AI scores to ${result.updated} questions (${result.failed} failed). Verification data preserved!`,
          TOAST_DURATION.EXTENDED
        );
      }
    } catch (error) {
      logger.error("AI Score backfill failed:", error);
      showMessage(`❌ Failed: ${error.message}`, TOAST_DURATION.EXTENDED);
    } finally {
      setProcessing(false);
      setProgress("");
    }
  };

  const handleRestoreKickedBack = async (dryRun = false) => {
    setProcessing(true);
    setProgress("Finding kicked-back questions to restore...");
    setLastResult(null);

    try {
      const result = await restoreVerifiedWithScores(setProgress, dryRun);
      setLastResult(result);
      if (dryRun) {
        showMessage(
          `🔍 DRY RUN: ${result.total} kicked-back questions would be restored`,
          TOAST_DURATION.EXTENDED
        );
      } else {
        showMessage(
          `✅ Restored ${result.updated} questions to accepted with AI scores (${result.failed} failed)`,
          TOAST_DURATION.EXTENDED
        );
      }
    } catch (error) {
      logger.error("Restore failed:", error);
      showMessage(`❌ Failed: ${error.message}`, TOAST_DURATION.EXTENDED);
    } finally {
      setProcessing(false);
      setProgress("");
    }
  };

  const handleRepairStatuses = async (dryRun = false) => {
    setProcessing(true);
    setProgress("Auditing question statuses and timestamps...");
    setLastResult(null);

    try {
      const result = await repairStatuses(setProgress, dryRun);
      setLastResult(result);
      if (dryRun) {
        showMessage(
          `🔍 DRY RUN: ${result.total} questions need repair`,
          TOAST_DURATION.EXTENDED
        );
      } else {
        showMessage(
          `✅ Repaired ${result.updated} questions!`,
          TOAST_DURATION.EXTENDED
        );
      }
    } catch (error) {
      logger.error("Repair failed:", error);
      showMessage(`❌ Failed: ${error.message}`, TOAST_DURATION.EXTENDED);
    } finally {
      setProcessing(false);
      setProgress("");
    }
  };

  // Defensive rendering for lastResult and progress
  const progressText =
    typeof progress === "string" ? progress : JSON.stringify(progress);

  const getResultText = () => {
    if (!lastResult || typeof lastResult !== "object")
      return String(lastResult);
    if (lastResult.dryRun) {
      return `🔍 DRY RUN: Would update ${lastResult.total || 0} questions`;
    }
    const failedText = lastResult.failed
      ? ` (${lastResult.failed} failed)`
      : "";
    return `✅ Updated ${lastResult.updated || 0} questions${failedText}`;
  };

  return (
    <CollapsibleSection
      title="Data Maintenance"
      icon="wrench"
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      variant="amber"
    >
      <div className="space-y-4">
        {/* Progress indicator */}
        {processing && (
          <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-500/30 rounded">
            <Icon name="loader" className="animate-spin text-amber-400" />
            <span className="text-sm text-amber-200">{progressText}</span>
          </div>
        )}

        {/* Last result */}
        {lastResult && !processing && (
          <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded text-sm text-emerald-200">
            {getResultText()}
          </div>
        )}
        {/* STATUS REPAIR TOOL (CRITICAL) - Fixes "Other" Statuses */}
        <div className="p-3 bg-emerald-950/30 rounded border-2 border-emerald-700/50">
          <h4 className="text-sm font-bold text-emerald-200 mb-2 flex items-center gap-2">
            <Icon name="shield-check" size={14} className="text-emerald-400" />
            🛡️ Repair Statuses & Timestamps
          </h4>
          <p className="text-xs text-emerald-300/80 mb-3">
            Fix non-standard statuses (e.g., "Approved" → "accepted") and
            backfill missing firestoreUpdatedAt timestamps. Resolves "Other"
            status issues.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleRepairStatuses(true)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-50"
            >
              Dry Run (Count)
            </button>
            <button
              onClick={() => handleRepairStatuses(false)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold disabled:opacity-50"
            >
              Repair All
            </button>
          </div>
        </div>

        {/* FIX MISSING AI SCORES - Pipeline Fix (CRITICAL) */}
        <div className="p-3 bg-red-950/30 rounded border-2 border-red-700/50">
          <h4 className="text-sm font-bold text-red-200 mb-2 flex items-center gap-2">
            <Icon name="alert-triangle" size={14} className="text-red-400" />
            Fix Missing AI Scores (Pipeline Fix)
          </h4>
          <p className="text-xs text-red-300/80 mb-3">
            Find accepted questions without AI critique scores and kick them
            back to pending for re-review. This fixes the pipeline bug.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleKickBackMissingScores(true)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-50"
            >
              Dry Run (Count)
            </button>
            <button
              onClick={() => handleKickBackMissingScores(false)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-red-700 hover:bg-red-600 text-white rounded font-bold disabled:opacity-50"
            >
              Kick Back to Pending
            </button>
          </div>
        </div>

        {/* BACKFILL AI SCORES FOR VERIFIED - Preserves Greg's work */}
        <div className="p-3 bg-indigo-950/30 rounded border-2 border-indigo-700/50">
          <h4 className="text-sm font-bold text-indigo-200 mb-2 flex items-center gap-2">
            <Icon name="star" size={14} className="text-indigo-400" />
            Backfill AI Scores (Preserve Verification)
          </h4>
          <p className="text-xs text-indigo-300/80 mb-3">
            Run AI critique on verified questions to get scores WITHOUT changing
            the humanVerified data. Greg's reviews will be preserved!
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleBackfillAIScores(true)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-50"
            >
              Dry Run (Count)
            </button>
            <button
              onClick={() => handleBackfillAIScores(false)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded font-bold disabled:opacity-50"
            >
              Add AI Scores
            </button>
          </div>
        </div>

        {/* RESTORE KICKED-BACK QUESTIONS - Main tool for Greg's questions */}
        <div className="p-3 bg-emerald-950/30 rounded border-2 border-emerald-700/50">
          <h4 className="text-sm font-bold text-emerald-200 mb-2 flex items-center gap-2">
            <Icon name="refresh-cw" size={14} className="text-emerald-400" />
            Restore Kicked-Back Questions
          </h4>
          <p className="text-xs text-emerald-300/80 mb-3">
            Add AI scores to kicked-back questions AND restore them to accepted.
            Preserves original verifier name (e.g., Greg Berridge).
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleRestoreKickedBack(true)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-50"
            >
              Dry Run (Count)
            </button>
            <button
              onClick={() => handleRestoreKickedBack(false)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold disabled:opacity-50"
            >
              Restore to Accepted
            </button>
          </div>
        </div>

        {/* Backfill HumanVerified */}
        <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
          <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
            <Icon name="eye" size={14} className="text-emerald-400" />
            Backfill Human Verified
          </h4>
          <p className="text-xs text-slate-400 mb-3">
            Mark all accepted questions as humanVerified: true (for legacy data
            before verification step was added).
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleBackfillHumanVerified(true)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-50"
            >
              Dry Run
            </button>
            <button
              onClick={() => handleBackfillHumanVerified(false)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold disabled:opacity-50"
            >
              Run Backfill
            </button>
          </div>
        </div>

        {/* Backfill Verifier Names */}
        <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
          <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
            <Icon name="user-check" size={14} className="text-cyan-400" />
            Backfill Verifier Names
          </h4>
          <p className="text-xs text-slate-400 mb-3">
            Populate missing humanVerifiedBy field using acceptedBy as fallback.
            Run Dry Run first to see count.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleBackfillVerifierNames(true)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-50"
            >
              Dry Run (Count)
            </button>
            <button
              onClick={() => handleBackfillVerifierNames(false)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-cyan-700 hover:bg-cyan-600 text-white rounded font-bold disabled:opacity-50"
            >
              Run Backfill
            </button>
          </div>
        </div>

        {/* Backfill Tags */}
        <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
          <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
            <Icon name="tag" size={14} className="text-purple-400" />
            Backfill Tags
          </h4>
          <p className="text-xs text-slate-400 mb-3">
            Generate AI tags for accepted questions with fewer than 3 tags. Uses
            Gemini API (rate limited).
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleBackfillTags(true)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-50"
            >
              Dry Run
            </button>
            <button
              onClick={() => handleBackfillTags(false)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-purple-700 hover:bg-purple-600 text-white rounded font-bold disabled:opacity-50"
            >
              Run Backfill
            </button>
          </div>
        </div>

        {/* Source URL Audit */}
        <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
          <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
            <Icon name="link" size={14} className="text-orange-400" />
            Source URL Audit
          </h4>
          <p className="text-xs text-slate-400 mb-3">
            Scan all questions for broken or invalid source URLs. Click "Run
            Audit" to analyze.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={async () => {
                setProcessing(true);
                setProgress("Loading questions...");
                try {
                  const snapshot = await getDocs(collection(db, "questions"));
                  const urlStats = {
                    valid: 0,
                    invalid: 0,
                    missing: 0,
                    suspicious: [],
                  };

                  snapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const url = data.sourceUrl || data.SourceURL;

                    if (!url || url.trim() === "") {
                      urlStats.missing++;
                    } else if (
                      !url.startsWith("https://dev.epicgames.com/documentation")
                    ) {
                      urlStats.invalid++;
                      if (urlStats.suspicious.length < 10) {
                        urlStats.suspicious.push({
                          id: docSnap.id,
                          url,
                          reason: "Wrong domain",
                        });
                      }
                    } else if (url.includes("--")) {
                      urlStats.invalid++;
                      if (urlStats.suspicious.length < 10) {
                        urlStats.suspicious.push({
                          id: docSnap.id,
                          url,
                          reason: "Double hyphen",
                        });
                      }
                    } else {
                      urlStats.valid++;
                    }
                  });

                  const msg = `✅ Valid: ${urlStats.valid} | ⚠️ Invalid: ${urlStats.invalid} | ❌ Missing: ${urlStats.missing}`;
                  setProgress(msg);

                  if (urlStats.suspicious.length > 0) {
                    logger.log("Suspicious URLs found:", urlStats.suspicious);
                    alert(
                      `Source Audit Complete:\n${msg}\n\nSuspicious URLs logged to console (F12).`
                    );
                  } else {
                    alert(`Source Audit Complete:\n${msg}`);
                  }
                } catch (err) {
                  setProgress(`Error: ${err.message}`);
                }
                setProcessing(false);
              }}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-orange-700 hover:bg-orange-600 text-white rounded font-bold disabled:opacity-50"
            >
              Run Audit
            </button>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};

export default DataMaintenance;
