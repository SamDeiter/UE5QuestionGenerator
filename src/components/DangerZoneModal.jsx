import { useState } from "react";
import Icon from "./Icon";
import ConfirmDialog from "./ConfirmDialog";
import PromptDialog from "./PromptDialog";
import { clearQuestionsFromSheets } from "../services/googleSheets";
import {
  clearAllQuestionsFromFirestore,
  auth,
  deleteQuestionFromFirestore,
  getDb,
} from "../services/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { logger } from "../utils/logger";
import { MAINTENANCE } from "../utils/constants";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { normalizeStatus } from "../utils/questionHelpers";

import MigrationTools from "./Admin/DangerZone/MigrationTools";
import HealthIntegrityTools from "./Admin/DangerZone/HealthIntegrityTools";
import DestructiveOperations from "./Admin/DangerZone/DestructiveOperations";
import { MAINTENANCE_CONFIG } from "../utils/constants";

/**
 * DangerZoneModal - Separate modal for destructive operations
 * Refactored into smaller sub-components for maintainability.
 */
const DangerZoneModal = ({
  isOpen,
  onClose,
  config,
  onClearData,
  isAdmin = false,
}) => {
  const { colorblindMode } = useAccessibility();

  const [isResetting, setIsResetting] = useState(false);
  const [showFactoryResetConfirm, setShowFactoryResetConfirm] = useState(false);
  const [showFactoryResetPrompt, setShowFactoryResetPrompt] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const [isNuking, setIsNuking] = useState(false);
  const [nukeProgress, setNukeProgress] = useState({ current: 0, total: 0 });
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState(null);

  const handleFactoryResetClick = () => {
    setShowFactoryResetConfirm(true);
  };

  const handleFirstConfirm = () => {
    setShowFactoryResetConfirm(false);
    setShowFactoryResetPrompt(true);
  };

  const handlePromptConfirm = async (typedValue) => {
    if (typedValue !== "DELETE EVERYTHING") {
      alert(
        "Factory reset cancelled. You must type 'DELETE EVERYTHING' exactly."
      );
      setShowFactoryResetPrompt(false);
      return;
    }

    logger.log("⚠️ FACTORY RESET INITIATED");
    setShowFactoryResetPrompt(false);
    setIsResetting(true);

    try {
      let deletedCount = 0;

      // 1. Clear Firestore FIRST (critical)
      logger.log("Clearing Firestore...");
      try {
        deletedCount = await clearAllQuestionsFromFirestore();
        logger.log(`✅ Deleted ${deletedCount} questions from Firestore`);
      } catch (firestoreError) {
        logger.error("❌ Firestore deletion failed:", firestoreError);
        throw new Error(`Firestore deletion failed: ${firestoreError.message}`);
      }

      // 2. Clear Google Spreadsheet
      if (config.sheetUrl) {
        logger.log("Clearing Google Spreadsheet...");
        try {
          clearQuestionsFromSheets(config.sheetUrl);
          logger.log("✅ Spreadsheet clear request sent (check new tab)");
        } catch (sheetsError) {
          logger.error("❌ Sheets clearing failed:", sheetsError);
        }
      }

      // 3. Clear localStorage
      logger.log("Clearing localStorage...");
      localStorage.clear();
      logger.log("✅ Local storage cleared");

      // 4. Reload
      alert(
        `Factory Reset Complete!\n\n• Firestore: ${deletedCount} questions deleted\n• Spreadsheet: ${
          config.sheetUrl ? "Clearing in new tab" : "Skipped"
        }\n• Local Storage: Cleared\n\nPage will reload.`
      );
      window.location.reload();
    } catch (error) {
      logger.error("❌ Factory reset error:", error);
      alert(
        "Error during factory reset:\n\n" +
          error.message +
          "\n\nCheck console for details."
      );
      setIsResetting(false);
    }
  };

  const handleBackfillCreatorNames = async () => {
    if (
      !confirm(
        'This will add your creator name to all questions that currently show "N/A". Continue?'
      )
    ) {
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);

    try {
      const creatorName = config.creatorName || "Unknown";
      const querySnapshot = await getDocs(collection(getDb(), "questions"));

      const questionsToUpdate = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const creator = data.creatorName;
        // Catch: null, undefined, empty string, 'N/A', or whitespace-only
        if (
          !creator ||
          creator.trim() === "" ||
          creator === "N/A" ||
          creator === "Unknown"
        ) {
          questionsToUpdate.push({
            firestoreId: docSnap.id, // Use Firestore document ID
            ...data,
          });
        }
      });

      if (questionsToUpdate.length === 0) {
        setMigrationResult({
          success: 0,
          total: 0,
          message: "All questions already have creator names!",
        });
        setIsMigrating(false);
        return;
      }

      let successCount = 0;
      for (const question of questionsToUpdate) {
        try {
          logger.log(
            "Updating question:",
            question.firestoreId,
            "Creator:",
            question.creatorName
          );
          const questionRef = doc(getDb(), "questions", question.firestoreId);
          await updateDoc(questionRef, {
            creatorName: creatorName,
            backfilledAt: new Date().toISOString(),
          });
          successCount++;
          logger.log("✓ Successfully updated:", question.firestoreId);
        } catch (err) {
          logger.error(
            `Failed to update question ${question.firestoreId}:`,
            err.message,
            err
          );
        }
      }

      setMigrationResult({
        success: successCount,
        total: questionsToUpdate.length,
        message: `Successfully updated ${successCount} of ${questionsToUpdate.length} questions!`,
      });
    } catch (error) {
      logger.error("Migration failed:", error);
      alert("Migration failed: " + error.message);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRepairDatabase = async () => {
    if (
      !confirm(
        'This will audit all questions and repair statuses (e.g., "Approved" -> "accepted") and missing timestamps. Continue?'
      )
    ) {
      return;
    }

    setIsRepairing(true);
    setRepairResult(null);

    try {
      const querySnapshot = await getDocs(collection(getDb(), "questions"));
      const questionsToFix = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const currentStatus = data.status;
        const normalizedStatus = normalizeStatus(currentStatus);
        const needsTimestamp = !data.firestoreUpdatedAt;

        if (currentStatus !== normalizedStatus || needsTimestamp) {
          questionsToFix.push({
            id: docSnap.id,
            status: normalizedStatus,
            needsTimestamp,
          });
        }
      });

      if (questionsToFix.length === 0) {
        setRepairResult({ message: "Database is already healthy!" });
        setIsRepairing(false);
        return;
      }

      let fixedCount = 0;
      for (const item of questionsToFix) {
        const docRef = doc(getDb(), "questions", item.id);
        const updates = { status: item.status };
        if (item.needsTimestamp) {
          updates.firestoreUpdatedAt = Timestamp.now();
        }
        await updateDoc(docRef, updates);
        fixedCount++;
      }

      setRepairResult({
        message: `Successfully repaired ${fixedCount} questions!`,
      });
    } catch (error) {
      logger.error("Repair failed:", error);
      alert("Repair failed: " + error.message);
    } finally {
      setIsRepairing(false);
    }
  };

  // Admin-only: Nuke ALL questions from Firestore (any user's questions)
  const handleNukeAllQuestions = async () => {
    if (!auth.currentUser) {
      alert("You must be signed in to use this feature.");
      return;
    }

    if (
      !confirm(
        "⚠️ ADMIN NUKE: This will delete ALL questions from ALL users. Are you sure?"
      )
    ) {
      return;
    }
    if (!confirm("⚠️ FINAL WARNING: This is IRREVERSIBLE. Continue?")) {
      return;
    }

    setIsNuking(true);
    setNukeProgress({ current: 0, total: 0 });

    try {
      logger.log("🔥 Admin nuke initiated by:", auth.currentUser.email);

      // Fetch ALL questions without filter
      const snapshot = await getDocs(collection(getDb(), "questions"));
      const allQuestions = snapshot.docs.map((doc) => ({
        uniqueId: doc.id,
        ...doc.data(),
      }));

      if (allQuestions.length === 0) {
        alert("No questions found in the database.");
        setIsNuking(false);
        return;
      }

      setNukeProgress({ current: 0, total: allQuestions.length });

      let deletedCount = 0;
      let errorCount = 0;
      const BATCH_SIZE =
        MAINTENANCE.NUKE_BATCH_SIZE || MAINTENANCE_CONFIG.NUKE_BATCH_SIZE;

      for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
        const batch = allQuestions.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (q) => {
            try {
              await deleteQuestionFromFirestore(q.uniqueId);
              deletedCount++;
            } catch (e) {
              logger.error("Delete failed for", q.uniqueId, e);
              errorCount++;
            }
          })
        );

        setNukeProgress({
          current: Math.min(i + BATCH_SIZE, allQuestions.length),
          total: allQuestions.length,
        });
      }

      alert(
        `Nuke complete!\n\nDeleted: ${deletedCount}\nFailed: ${errorCount}`
      );

      // Clear local storage and reload
      localStorage.clear();
      window.location.reload();
    } catch (error) {
      logger.error("Nuke failed:", error);
      alert("Nuke failed: " + error.message);
    } finally {
      setIsNuking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ zIndex: MAINTENANCE_CONFIG.MODAL_Z_INDEX }}
      >
        <div className="bg-red-950/50 border-2 border-red-500 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-red-900 flex justify-between items-center bg-red-900/50">
            <h2 className="text-lg font-bold text-red-300 flex items-center gap-2">
              <Icon name="alert-triangle" className="text-red-500" /> DANGER
              ZONE
            </h2>
            <button
              onClick={onClose}
              className="text-red-400 hover:text-white transition-colors"
              aria-label="Close Danger Zone"
            >
              <Icon name="x" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-900/50">
              <p className="text-sm text-red-300 mb-4">
                ⚠️ <strong>WARNING:</strong> These operations are{" "}
                <strong>PERMANENT</strong> and cannot be undone. Your data will
                be lost forever.
              </p>

              <div className="space-y-3">
                <MigrationTools
                  isMigrating={isMigrating}
                  onBackfill={handleBackfillCreatorNames}
                  migrationResult={migrationResult}
                  colorblindMode={colorblindMode}
                />

                <HealthIntegrityTools
                  isRepairing={isRepairing}
                  onRepair={handleRepairDatabase}
                  repairResult={repairResult}
                />

                <DestructiveOperations
                  onClearLocal={onClearData}
                  onFactoryReset={handleFactoryResetClick}
                  isResetting={isResetting}
                  isAdmin={isAdmin}
                  onNukeAll={handleNukeAllQuestions}
                  isNuking={isNuking}
                  nukeProgress={nukeProgress}
                />
              </div>

              <p className="text-[10px] text-red-400/70 mt-3 text-center">
                Factory Reset deletes ALL data: Spreadsheet + Firestore + Local
                Storage
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showFactoryResetConfirm}
        title="⚠️ FACTORY RESET WARNING ⚠️"
        message={`This will PERMANENTLY DELETE ALL data from:

• Google Spreadsheet (all Master_ sheets)
• Firestore Database (cloud)  
• Local storage (questions, settings, analytics)

This action CANNOT be undone. Are you ABSOLUTELY SURE?`}
        confirmText="Yes, I Understand"
        cancelText="Cancel"
        onConfirm={handleFirstConfirm}
        onCancel={() => setShowFactoryResetConfirm(false)}
        isDanger={true}
      />

      <PromptDialog
        isOpen={showFactoryResetPrompt}
        title="🔴 FINAL CONFIRMATION 🔴"
        message="Type 'DELETE EVERYTHING' (all caps, no quotes) to confirm permanent deletion of ALL data:"
        placeholder="Type DELETE EVERYTHING here"
        expectedValue="DELETE EVERYTHING"
        confirmText="Delete Everything Forever"
        cancelText="Cancel"
        onConfirm={handlePromptConfirm}
        onCancel={() => setShowFactoryResetPrompt(false)}
        isDanger={true}
      />
    </>
  );
};

export default DangerZoneModal;
