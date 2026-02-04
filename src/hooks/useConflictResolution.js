import { useCallback } from "react";
import { TOAST_DURATION } from "../utils/constants";

/**
 * Hook for handling concurrent editing conflict resolution
 *
 * Provides handlers for the conflict modal actions (discard local, overwrite server)
 * using lazy-loaded agent imports to avoid circular dependencies.
 *
 * @param {Object} options - Hook options
 * @param {Object} options.conflictData - The current conflict data
 * @param {Function} options.handleUpdateQuestion - Handler to update question in state
 * @param {Function} options.showMessage - Toast notification function
 * @param {Function} options.setShowConflictModal - Setter for conflict modal visibility
 * @param {Object} options.user - Current user object
 * @returns {Function} - Conflict resolution handler
 */
export function useConflictResolution({
  conflictData,
  handleUpdateQuestion,
  showMessage,
  setShowConflictModal,
  user,
}) {
  const handleResolveConflict = useCallback(
    async (action) => {
      if (action === "DISCARD") {
        // Reload the latest version from server
        const { loadAgent } = await import("../agents").then((m) =>
          m.getAgents()
        );
        if (loadAgent && conflictData) {
          const result = await loadAgent.loadQuestion(
            conflictData.serverQuestion.id
          );
          if (result.success) {
            handleUpdateQuestion(result.question.id, result.question);
            showMessage("✓ Reloaded latest version", TOAST_DURATION.MEDIUM);
          }
        }
      } else if (action === "OVERWRITE") {
        // Force save local changes
        const { saveGuardAgent } = await import("../agents").then((m) =>
          m.getAgents()
        );
        if (saveGuardAgent && conflictData) {
          await saveGuardAgent.saveQuestion(
            conflictData.serverQuestion.id,
            conflictData.localChanges,
            conflictData.serverVersion, // Use server version to force overwrite
            user?.uid || "unknown",
            user?.email || "unknown@example.com"
          );
          showMessage("✓ Overwrote server changes", TOAST_DURATION.MEDIUM);
        }
      }
      setShowConflictModal(false);
    },
    [
      conflictData,
      handleUpdateQuestion,
      showMessage,
      setShowConflictModal,
      user,
    ]
  );

  return handleResolveConflict;
}
