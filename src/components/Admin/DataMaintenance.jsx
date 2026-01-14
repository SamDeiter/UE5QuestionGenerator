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
import { generateTagsSecure } from "../../services/geminiSecure";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";
import { logger } from "../../utils/logger";

const db = getFirestore(app);

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
          5000
        );
      } else {
        showMessage(`✅ Updated ${result.updated} questions`, 5000);
      }
    } catch (error) {
      logger.error("Backfill failed:", error);
      showMessage(`❌ Failed: ${error.message}`, 5000);
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
          5000
        );
      } else {
        showMessage(
          `✅ Updated ${result.updated}, Failed ${result.failed || 0}`,
          5000
        );
      }
    } catch (error) {
      logger.error("Backfill failed:", error);
      showMessage(`❌ Failed: ${error.message}`, 5000);
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
          5000
        );
      } else {
        showMessage(`✅ Updated ${result.updated} verifier names`, 5000);
      }
    } catch (error) {
      logger.error("Verifier backfill failed:", error);
      showMessage(`❌ Failed: ${error.message}`, 5000);
    } finally {
      setProcessing(false);
      setProgress("");
    }
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
            <span className="text-sm text-amber-200">{progress}</span>
          </div>
        )}

        {/* Last result */}
        {lastResult && !processing && (
          <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded text-sm text-emerald-200">
            {lastResult.dryRun
              ? `🔍 DRY RUN: Would update ${lastResult.total} questions`
              : `✅ Updated ${lastResult.updated} questions`}
          </div>
        )}

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
      </div>
    </CollapsibleSection>
  );
};

export default DataMaintenance;
