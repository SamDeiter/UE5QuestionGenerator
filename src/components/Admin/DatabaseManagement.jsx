import React from "react";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";
import {
  clearAllQuestionsFromFirestore,
  deleteSoftDeletedQuestionsFromFirestore,
} from "../../services/firebase";
import { logger } from "../../utils/logger";
import { useMessage } from "../../contexts/MessageContext";

const DatabaseManagement = ({ isCollapsed, onToggle }) => {
  const { showMessage } = useMessage();
  return (
    <CollapsibleSection
      title="Database Management"
      icon="database"
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      variant="red"
    >
      <p className="text-xs text-slate-400 mb-4">
        ⚠️ Danger Zone: These operations permanently delete data and cannot be
        undone.
      </p>

      <div className="space-y-3">
        {/* Translation Migration Button */}
        <button
          onClick={async () => {
            if (
              !confirm(
                "🔗 Link Existing Translations?\n\nThis will:\n1. Find all translated questions (Chinese, Japanese, Korean, etc.)\n2. Match them with their English originals\n3. Ensure both share the same uniqueId\n4. Enable language switching\n\nThis is SAFE and won't delete any data.\n\nProceed?"
              )
            )
              return;

            try {
              showMessage("🔄 Starting translation migration...", 10000);

              // Call the Cloud Function
              const { migrateTranslationsViaCloudFunction } =
                await import("../../services/cloudFunctions.js");

              const result = await migrateTranslationsViaCloudFunction();

              if (result.success) {
                const { stats } = result;
                showMessage(
                  `✅ Migration complete!\n\n` +
                    `📊 Statistics:\n` +
                    `- Total questions: ${stats.totalQuestions}\n` +
                    `- Total translations: ${stats.totalTranslations}\n` +
                    `- Already linked: ${stats.alreadyLinked}\n` +
                    `- Newly linked: ${stats.newlyLinked}\n` +
                    `- Orphaned: ${stats.orphaned}\n\n` +
                    `Refresh the page to see results.`,
                  10000
                );
              }
            } catch (error) {
              showMessage(`❌ Migration failed: ${error.message}`, 5000);
              logger.error(error);
            }
          }}
          className="w-full px-4 py-3 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-blue-700/50"
        >
          <Icon name="link" size={16} />
          Link Existing Translations (Enable Language Switching)
        </button>

        <button
          onClick={async () => {
            if (
              !confirm(
                "⚠️ DELETE ALL QUESTIONS?\n\nThis will permanently delete ALL questions from the database for ALL users.\n\nThis action CANNOT be undone!\n\nType 'DELETE' to confirm."
              )
            )
              return;

            const confirmText = prompt("Type DELETE to confirm:");
            if (confirmText !== "DELETE") {
              showMessage("❌ Deletion cancelled", 3000);
              return;
            }

            try {
              showMessage("🗑️ Deleting all questions...", 10000);
              const count = await clearAllQuestionsFromFirestore();
              showMessage(`✅ Deleted ${count} questions from database`, 5000);
            } catch (error) {
              showMessage(`❌ Delete failed: ${error.message}`, 5000);
              logger.error(error);
            }
          }}
          className="w-full px-4 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-red-700/50"
        >
          <Icon name="trash-2" size={16} />
          Delete All Questions (ALL USERS)
        </button>

        <button
          onClick={async () => {
            if (
              !confirm(
                "Clear all rejected questions from the database?\n\nThis will only delete questions with status='rejected'."
              )
            )
              return;

            try {
              showMessage("🗑️ Clearing rejected questions...", 10000);
              // This would need a Cloud Function - for now just show message
              showMessage(
                "⚠️ Feature not yet implemented - needs Cloud Function",
                5000
              );
            } catch (error) {
              showMessage(`❌ Clear failed: ${error.message}`, 5000);
            }
          }}
          className="w-full px-4 py-3 bg-orange-900/30 hover:bg-orange-900/50 text-orange-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-orange-700/50"
        >
          <Icon name="filter" size={16} />
          Clear Rejected Questions
        </button>

        <button
          onClick={async () => {
            if (
              !confirm(
                "🧹 Cleanup Deleted Questions?\n\nThis will permanently remove all questions with status 'deleted' across ALL disciplines.\n\nThis is a maintenance operation to resolve count discrepancies.\n\nProceed?"
              )
            )
              return;

            try {
              showMessage("🧹 Cleaning up deleted questions...", 10000);
              const count = await deleteSoftDeletedQuestionsFromFirestore();
              showMessage(
                `✅ Successfully removed ${count} ghost questions.`,
                5000
              );
              // Clear local cache if needed (page refresh is safest)
              setTimeout(() => window.location.reload(), 2000);
            } catch (error) {
              showMessage(`❌ Cleanup failed: ${error.message}`, 5000);
              logger.error(error);
            }
          }}
          className="w-full px-4 py-3 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-emerald-700/50"
        >
          <Icon name="trash" size={16} />
          Cleanup Deleted Questions (Release Quota)
        </button>
      </div>
    </CollapsibleSection>
  );
};

export default DatabaseManagement;
