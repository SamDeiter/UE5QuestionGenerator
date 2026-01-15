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
import {
  clearAllQuestionsFromFirestore,
  deleteSoftDeletedQuestionsFromFirestore,
} from "../../services/firebaseQueries";

const db = getFirestore(app);

// Magic Number Constants
const TEXT_TRUNCATE_LIMIT = 40;
const RECENT_LIMIT = 50;
const SHORT_LIMIT = 5;
const LIST_LIMIT = 3;
const COOLDOWN_WAIT_MS = 6500;
const BATCH_SIZE_DEFAULT = 500;
const DEFAULT_LIMIT = 10;
const MAX_SUSPICIOUS_LOGS = 10;

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

  const batchSize = BATCH_SIZE_DEFAULT;
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
 */
async function backfillAIScoresForVerified(onProgress, dryRun = false) {
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
        wasVerified: data.humanVerified === true,
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
        }: "${q.question?.substring(0, TEXT_TRUNCATE_LIMIT)}..." (by ${
          q.verifiedBy
        })`
      );

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
        await updateDoc(ref, {
          critiqueScore: score,
          critique: text || "",
          _backfilledScore: true,
          _backfilledAt: new Date().toISOString(),
        });
        updated++;
      } else {
        failed++;
      }
    } catch (error) {
      logger.error(`❌ Failed for ${q.id}:`, error.message);
      failed++;
    }

    await new Promise((resolve) => setTimeout(resolve, API_RATE_LIMIT_MS));
  }

  return { updated, failed, total: needsScore.length, dryRun: false };
}

/**
 * Restore kicked-back questions with AI scores.
 */
async function restoreKickedBack(onProgress, dryRun = false) {
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
        }: "${q.question?.substring(0, TEXT_TRUNCATE_LIMIT)}..." (by ${
          q.originalVerifier
        })`
      );

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
        await updateDoc(ref, {
          critiqueScore: score,
          critique: text || "",
          status: "accepted",
          humanVerified: true,
          humanVerifiedBy: q.originalVerifier,
          humanVerifiedAt: new Date().toISOString(),
          _restoredAt: new Date().toISOString(),
          _restoredWithScore: true,
        });
        updated++;
      } else {
        failed++;
      }
    } catch (error) {
      logger.error(`❌ Restore failed for ${q.id}:`, error.message);
      failed++;
    }

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

  const batchSize = BATCH_SIZE_DEFAULT;
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
 */
async function kickBackMissingScores(onProgress, dryRun = false) {
  const snapshot = await getDocs(
    query(collection(db, "questions"), where("status", "==", "accepted"))
  );

  const needsKickBack = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.critiqueScore === null || data.critiqueScore === undefined) {
      needsKickBack.push({
        id: docSnap.id,
        question: data.question?.substring(0, RECENT_LIMIT) + "...",
      });
    }
  });

  onProgress(
    `Found ${needsKickBack.length} accepted questions without AI Score`
  );

  if (dryRun || needsKickBack.length === 0) {
    return { updated: 0, total: needsKickBack.length, dryRun };
  }

  const batchSize = BATCH_SIZE_DEFAULT;
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
 * Backfill humanVerifiedBy for questions missing verifier names
 */
async function backfillVerifierNames(onProgress, dryRun = false) {
  const snapshot = await getDocs(
    query(collection(db, "questions"), where("humanVerified", "==", true))
  );

  const needsUpdate = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
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

  const batchSize = BATCH_SIZE_DEFAULT;
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
    if (tags.length < LIST_LIMIT) {
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

      const newTags = await generateTagsSecure(q.question, q.options);

      if (newTags && newTags.length > 0) {
        const mergedTags = [
          ...new Set([
            ...q.currentTags,
            ...newTags.map((t) => t.replace(/^#/, "")),
          ]),
        ].slice(0, SHORT_LIMIT);

        const ref = doc(db, "questions", String(q.id));
        await updateDoc(ref, {
          tags: mergedTags,
          tagsBackfilledAt: new Date().toISOString(),
        });
        updated++;
      }

      await new Promise((resolve) => setTimeout(resolve, COOLDOWN_WAIT_MS));
    } catch (error) {
      logger.error("Tag generation failed:", error);
      failed++;
    }
  }

  return { updated, failed, total: needsTags.length, dryRun: false };
}

// Sub-component for individual maintenance actions
const MaintenanceActionCard = ({
  title,
  icon,
  iconColor,
  description,
  onDryRun,
  onExecute,
  executeLabel,
  processing,
  variant = "slate",
}) => {
  const bgColors = {
    slate: "bg-slate-800/50 border-slate-700",
    red: "bg-red-950/30 border-red-700/50",
    indigo: "bg-indigo-950/30 border-indigo-700/50",
    emerald: "bg-emerald-950/30 border-emerald-700/50",
  };

  const btnColors = {
    slate: "bg-emerald-700 hover:bg-emerald-600",
    red: "bg-red-700 hover:bg-red-600",
    indigo: "bg-indigo-700 hover:bg-indigo-600",
    emerald: "bg-emerald-700 hover:bg-emerald-600",
  };

  return (
    <div className={`p-3 rounded border-2 ${bgColors[variant]}`}>
      <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
        <Icon name={icon} size={14} className={iconColor} />
        {title}
      </h4>
      <p className="text-xs opacity-80 mb-3">{description}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onDryRun(true)}
          disabled={processing}
          className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-50"
        >
          Dry Run
        </button>
        <button
          onClick={() => onExecute(false)}
          disabled={processing}
          className={`px-3 py-1.5 text-xs text-white rounded font-bold disabled:opacity-50 ${btnColors[variant]}`}
        >
          {executeLabel}
        </button>
      </div>
    </div>
  );
};

const DataMaintenance = ({ showMessage, isCollapsed, onToggle }) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [lastResult, setLastResult] = useState(null);

  const runMaintenanceTask = async (taskName, taskFn) => {
    setProcessing(true);
    setProgress(`Starting ${taskName}...`);
    setLastResult(null);

    try {
      const result = await taskFn();
      setLastResult(result);
      if (result.dryRun) {
        showMessage(
          `🔍 DRY RUN: ${result.total} items would be affected`,
          TOAST_DURATION.EXTENDED
        );
      } else {
        showMessage(`✅ Task completed successfully`, TOAST_DURATION.EXTENDED);
      }
    } catch (error) {
      logger.error(`${taskName} failed:`, error);
      showMessage(`❌ Failed: ${error.message}`, TOAST_DURATION.EXTENDED);
    } finally {
      setProcessing(false);
      setProgress("");
    }
  };

  const handleSourceAudit = async () => {
    setProcessing(true);
    setProgress("Loading questions...");
    try {
      const snapshot = await getDocs(collection(db, "questions"));
      const urlStats = { valid: 0, invalid: 0, missing: 0, suspicious: [] };

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const url = data.sourceUrl || data.SourceURL;

        if (!url || url.trim() === "") {
          urlStats.missing++;
        } else if (!url.startsWith("https://dev.epicgames.com/documentation")) {
          urlStats.invalid++;
          if (urlStats.suspicious.length < MAX_SUSPICIOUS_LOGS) {
            urlStats.suspicious.push({
              id: docSnap.id,
              url,
              reason: "Wrong domain",
            });
          }
        } else {
          urlStats.valid++;
        }
      });

      const msg = `✅ Valid: ${urlStats.valid} | ⚠️ Invalid: ${urlStats.invalid} | ❌ Missing: ${urlStats.missing}`;
      setProgress(msg);
      alert(`Source Audit Complete:\n${msg}`);
    } catch (err) {
      setProgress(`Error: ${err.message}`);
    }
    setProcessing(false);
  };

  const getResultText = (res) => {
    if (!res) return "";
    const prefix = res.dryRun ? "[DRY RUN] " : "";
    let stats = "";

    if (res.updated !== undefined && res.total !== undefined) {
      stats = `Updated ${res.updated}/${res.total}`;
    } else {
      stats = String(res);
    }

    if (res.failed) stats += ` | Failed: ${res.failed}`;
    return prefix + stats;
  };

  return (
    <CollapsibleSection
      title="Data Maintenance"
      icon="wrench"
      isCollapsed={isCollapsed}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        {processing && (
          <div className="p-3 bg-blue-900/30 border border-blue-700/50 rounded animate-pulse">
            <p className="text-sm text-blue-200 flex items-center gap-2">
              <Icon name="loader" size={14} className="animate-spin" />
              {progress}
            </p>
          </div>
        )}

        {lastResult && (
          <div className="p-3 bg-slate-800/80 border border-slate-600 rounded">
            <p className="text-sm font-bold text-slate-200 mb-1">
              Last Result:
            </p>
            <p className="text-xs text-slate-400 font-mono">
              {getResultText(lastResult)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MaintenanceActionCard
            title="Fix Missing AI Scores"
            icon="alert-triangle"
            iconColor="text-red-400"
            variant="red"
            description="Find accepted questions without AI scores and kick back to pending."
            onDryRun={(dr) =>
              runMaintenanceTask("Kick Back", () =>
                kickBackMissingScores(setProgress, dr)
              )
            }
            onExecute={(dr) =>
              runMaintenanceTask("Kick Back", () =>
                kickBackMissingScores(setProgress, dr)
              )
            }
            executeLabel="Kick Back"
            processing={processing}
          />

          <MaintenanceActionCard
            title="Restore Kicked-Back"
            icon="refresh-cw"
            iconColor="text-emerald-400"
            variant="emerald"
            description="Add scores to kicked-back questions and restore to accepted."
            onDryRun={(dr) =>
              runMaintenanceTask("Restore", () =>
                restoreKickedBack(setProgress, dr)
              )
            }
            onExecute={(dr) =>
              runMaintenanceTask("Restore", () =>
                restoreKickedBack(setProgress, dr)
              )
            }
            executeLabel="Restore All"
            processing={processing}
          />

          <MaintenanceActionCard
            title="Repair Statuses"
            icon="wrench"
            iconColor="text-blue-400"
            description="Normalize statuses and backfill firestoreUpdatedAt timestamps."
            onDryRun={(dr) =>
              runMaintenanceTask("Repair Statuses", () =>
                repairStatuses(setProgress, dr)
              )
            }
            onExecute={(dr) =>
              runMaintenanceTask("Repair Statuses", () =>
                repairStatuses(setProgress, dr)
              )
            }
            executeLabel="Run Repair"
            processing={processing}
          />

          <MaintenanceActionCard
            title="Backfill AI Scores"
            icon="star"
            iconColor="text-yellow-400"
            description="Add AI scores to verified questions while preserving human reviews."
            onDryRun={(dr) =>
              runMaintenanceTask("Backfill AI Scores", () =>
                backfillAIScoresForVerified(setProgress, dr)
              )
            }
            onExecute={(dr) =>
              runMaintenanceTask("Backfill AI Scores", () =>
                backfillAIScoresForVerified(setProgress, dr)
              )
            }
            executeLabel="Run Backfill"
            processing={processing}
          />

          <MaintenanceActionCard
            title="Backfill HumanVerified"
            icon="check-circle"
            iconColor="text-emerald-400"
            description="Mark all accepted questions as humanVerified."
            onDryRun={(dr) =>
              runMaintenanceTask("Backfill HumanVerified", () =>
                backfillHumanVerified(setProgress, dr)
              )
            }
            onExecute={(dr) =>
              runMaintenanceTask("Backfill HumanVerified", () =>
                backfillHumanVerified(setProgress, dr)
              )
            }
            executeLabel="Run Backfill"
            processing={processing}
          />

          <MaintenanceActionCard
            title="Backfill Verifier Names"
            icon="user-check"
            iconColor="text-cyan-400"
            description="Populate missing humanVerifiedBy using acceptedBy."
            onDryRun={(dr) =>
              runMaintenanceTask("Backfill Names", () =>
                backfillVerifierNames(setProgress, dr)
              )
            }
            onExecute={(dr) =>
              runMaintenanceTask("Backfill Names", () =>
                backfillVerifierNames(setProgress, dr)
              )
            }
            executeLabel="Run Backfill"
            processing={processing}
          />

          <MaintenanceActionCard
            title="Backfill Tags"
            icon="tag"
            iconColor="text-purple-400"
            description="Generate AI tags for questions with < 3 tags."
            onDryRun={(dr) =>
              runMaintenanceTask("Backfill Tags", () =>
                backfillTags(setProgress, dr)
              )
            }
            onExecute={(dr) =>
              runMaintenanceTask("Backfill Tags", () =>
                backfillTags(setProgress, dr)
              )
            }
            executeLabel="Run Backfill"
            processing={processing}
          />
        </div>

        <MaintenanceActionCard
          title="Cleanup Soft-Deleted"
          icon="trash-2"
          iconColor="text-red-400"
          variant="red"
          description="Permanently purge all questions marked as deleted."
          onDryRun={(dr) =>
            runMaintenanceTask("Purge Deleted", () =>
              deleteSoftDeletedQuestionsFromFirestore(setProgress, dr)
            )
          }
          onExecute={(dr) =>
            runMaintenanceTask("Purge Deleted", () =>
              deleteSoftDeletedQuestionsFromFirestore(setProgress, dr)
            )
          }
          executeLabel="Purge All"
          processing={processing}
        />

        <div className="p-3 bg-orange-900/20 border border-orange-700/30 rounded">
          <h4 className="text-sm font-bold text-orange-200 mb-2 flex items-center gap-2">
            <Icon name="link" size={14} className="text-orange-400" />
            Source URL Audit
          </h4>
          <button
            onClick={handleSourceAudit}
            disabled={processing}
            className="px-3 py-1.5 text-xs bg-orange-700 hover:bg-orange-600 text-white rounded font-bold disabled:opacity-50"
          >
            Run Source Audit
          </button>
        </div>

        <div className="p-3 bg-red-950/20 border border-red-900/30 rounded">
          <h4 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
            <Icon name="bomb" size={14} />
            Destructive Zone
          </h4>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (
                  window.confirm("NUKE ALL QUESTIONS? This cannot be undone.")
                ) {
                  await runMaintenanceTask("NUKE", () =>
                    clearAllQuestionsFromFirestore(setProgress, DEFAULT_LIMIT)
                  );
                }
              }}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-red-900 hover:bg-red-800 text-white rounded font-bold disabled:opacity-50"
            >
              Nuke All questions
            </button>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};

export default DataMaintenance;
