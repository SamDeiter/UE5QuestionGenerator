/**
 * Data Maintenance - Backfill Operations
 *
 * Admin-only component for running data maintenance operations:
 * - Backfill humanVerified for accepted questions
 * - Backfill tags for questions with fewer than 3 tags
 */

import { useState } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, firestoreDatabaseId } from "../../services/firebase";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";
import { logger } from "../../utils/logger";
import { useMessage } from "../../contexts/MessageContext";
import { TOAST_DURATION } from "../../utils/constants";
import * as tasks from "../../services/dataMaintenanceTasks";
import {
  clearAllQuestionsFromFirestore,
  deleteSoftDeletedQuestionsFromFirestore,
} from "../../services/firebaseQueries";

const db = firestoreDatabaseId
  ? getFirestore(app, firestoreDatabaseId)
  : getFirestore(app);
const functions = getFunctions(app, "us-central1");

// Magic Number Constants - Simplified
const MAX_SUSPICIOUS_LOGS = 10;
const DEFAULT_LIMIT = 10;
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

const DataMaintenance = ({ isCollapsed, onToggle }) => {
  const { showMessage } = useMessage();
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

        {/* Cloud Functions Migrations - Firestore Optimization */}
        <div className="p-3 bg-indigo-950/30 border-2 border-indigo-700/50 rounded">
          <h4 className="text-sm font-bold text-indigo-200 mb-2 flex items-center gap-2">
            <Icon name="cloud" size={14} className="text-indigo-400" />
            Cloud Function Migrations (Firestore Optimization)
          </h4>
          <p className="text-xs text-indigo-300/80 mb-3">
            Run these to enable server-side aggregations and custom claims.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={async () => {
                setProcessing(true);
                setProgress("Running backfillQuestionStats...");
                try {
                  const fn = httpsCallable(functions, "backfillQuestionStats");
                  const result = await fn({});
                  logger.log("backfillQuestionStats result:", result.data);
                  setLastResult(result.data);
                  showMessage(
                    `✅ Question stats backfill complete`,
                    TOAST_DURATION.EXTENDED
                  );
                } catch (error) {
                  logger.error("backfillQuestionStats failed:", error);
                  showMessage(
                    `❌ Failed: ${error.message}`,
                    TOAST_DURATION.EXTENDED
                  );
                } finally {
                  setProcessing(false);
                  setProgress("");
                }
              }}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded font-bold disabled:opacity-50"
            >
              Backfill Question Stats
            </button>
            <button
              onClick={async () => {
                setProcessing(true);
                setProgress("Running backfillCustomClaims...");
                try {
                  const fn = httpsCallable(functions, "backfillCustomClaims");
                  const result = await fn({});
                  logger.log("backfillCustomClaims result:", result.data);
                  setLastResult(result.data);
                  showMessage(
                    `✅ Custom claims backfill complete`,
                    TOAST_DURATION.EXTENDED
                  );
                } catch (error) {
                  logger.error("backfillCustomClaims failed:", error);
                  showMessage(
                    `❌ Failed: ${error.message}`,
                    TOAST_DURATION.EXTENDED
                  );
                } finally {
                  setProcessing(false);
                  setProgress("");
                }
              }}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-purple-700 hover:bg-purple-600 text-white rounded font-bold disabled:opacity-50"
            >
              Backfill Custom Claims
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MaintenanceActionCard
            title="Fix Missing AI Scores"
            icon="alert-triangle"
            iconColor="text-red-400"
            variant="red"
            description="Find accepted questions without AI scores and kick back to pending."
            onDryRun={(dr) =>
              runMaintenanceTask("Kick Back", () =>
                tasks.kickBackMissingScores(setProgress, dr)
              )
            }
            onExecute={(dr) =>
              runMaintenanceTask("Kick Back", () =>
                tasks.kickBackMissingScores(setProgress, dr)
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
                tasks.restoreKickedBack(setProgress, dr)
              )
            }
            onExecute={(dr) =>
              runMaintenanceTask("Restore", () =>
                tasks.restoreKickedBack(setProgress, dr)
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
                tasks.repairStatuses(setProgress, dr)
              )
            }
            onExecute={(dr) =>
              runMaintenanceTask("Repair Statuses", () =>
                tasks.repairStatuses(setProgress, dr)
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
                tasks.backfillAIScoresForVerified(setProgress, dr)
              )
            }
            onExecute={(dr) =>
              runMaintenanceTask("Backfill AI Scores", () =>
                tasks.backfillAIScoresForVerified(setProgress, dr)
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
                tasks.backfillHumanVerified(setProgress, dr)
              )
            }
            onExecute={(dr) =>
              runMaintenanceTask("Backfill HumanVerified", () =>
                tasks.backfillHumanVerified(setProgress, dr)
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
                tasks.backfillVerifierNames(setProgress, dr)
              )
            }
            onExecute={(dr) =>
              runMaintenanceTask("Backfill Names", () =>
                tasks.backfillVerifierNames(setProgress, dr)
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
                tasks.backfillTags(setProgress, dr)
              )
            }
            onExecute={(dr) =>
              runMaintenanceTask("Backfill Tags", () =>
                tasks.backfillTags(setProgress, dr)
              )
            }
            executeLabel="Run Backfill"
            processing={processing}
          />

          <MaintenanceActionCard
            title="Backfill Average Scores"
            icon="calculator"
            iconColor="text-pink-400"
            description="Apply reviewer average scores to rejected questions missing a score."
            onDryRun={(dr) =>
              runMaintenanceTask("Backfill Averages", () =>
                tasks.backfillAverageScores(setProgress, dr)
              )
            }
            onExecute={(dr) =>
              runMaintenanceTask("Backfill Averages", () =>
                tasks.backfillAverageScores(setProgress, dr)
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
