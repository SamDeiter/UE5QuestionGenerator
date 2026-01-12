import { useState, useCallback } from "react";
import { getAgents } from "../../agents";
import { logger } from "../../utils/logger";

/**
 * Hook for managing conflict resolution state and handlers.
 * Handles version conflicts when multiple users edit the same question.
 *
 * @param {Object} params - Hook parameters
 * @param {Function} params.updateQuestionInState - Updates a question in local state
 * @param {Function} params.setAllQuestions - State setter for all questions
 * @param {Function} params.showMessage - Toast notification function
 * @param {Object} params.config - App configuration (userId, userEmail)
 */
export const useConflictResolution = ({
  updateQuestionInState,
  setAllQuestions,
  showMessage,
  config,
}) => {
  // Conflict modal state
  const [conflictData, setConflictData] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Version tracking for concurrent editing
  const [questionVersions, setQuestionVersions] = useState(new Map());

  /**
   * Gets the tracked version for a question.
   * @param {string|number} questionId - Question ID
   * @param {number} fallback - Fallback version if not tracked
   * @returns {number} The tracked version
   */
  const getVersion = useCallback(
    (questionId, fallback = 1) => {
      return questionVersions.get(questionId) || fallback;
    },
    [questionVersions]
  );

  /**
   * Updates the tracked version for a question.
   * @param {string|number} questionId - Question ID
   * @param {number} newVersion - New version number
   */
  const updateVersion = useCallback((questionId, newVersion) => {
    setQuestionVersions((prev) => new Map(prev).set(questionId, newVersion));
  }, []);

  /**
   * Handles a version conflict by showing the conflict modal.
   * @param {Object} result - Save result containing conflict data
   * @param {Object} updates - Local changes that caused the conflict
   * @param {number} baseVersion - Version user was editing
   */
  const handleVersionConflict = useCallback((result, updates, baseVersion) => {
    setConflictData({
      serverQuestion: result.serverQuestion,
      serverVersion: result.serverVersion,
      localChanges: updates,
      expectedVersion: baseVersion,
    });
    setShowConflictModal(true);
  }, []);

  /**
   * Handles conflict resolution actions from the modal.
   * @param {string} action - Resolution action (DISCARD or OVERWRITE)
   * @param {string|number} questionId - Question being resolved
   */
  const handleConflictResolve = useCallback(
    async (action, questionId) => {
      const agents = getAgents();

      if (!agents?.conflictResolverAgent) {
        logger.error("ConflictResolverAgent not available");
        if (showMessage) {
          showMessage("⚠️ Conflict resolver unavailable", 3000);
        }
        return;
      }

      try {
        if (action === "DISCARD") {
          // Reload the server version
          const result = await agents.conflictResolverAgent.discardLocalChanges(
            questionId
          );

          if (result.success) {
            updateQuestionInState(questionId, result.question);
            updateVersion(questionId, result.baseVersion);
            if (showMessage) {
              showMessage("✓ Reloaded latest version", 2000);
            }
          } else {
            throw new Error(result.error);
          }
        } else if (action === "OVERWRITE") {
          // Force overwrite with local changes
          const result =
            await agents.conflictResolverAgent.overwriteServerChanges(
              questionId,
              conflictData.localChanges,
              config.userId,
              config.userEmail
            );

          if (result.success) {
            updateVersion(questionId, result.newVersion);
            if (showMessage) {
              showMessage("✓ Changes saved (overwritten)", 2000);
            }
          } else {
            throw new Error(result.error);
          }
        }
      } catch (err) {
        logger.error("Conflict resolution failed:", err);
        if (showMessage) {
          showMessage(`⚠️ Resolution failed: ${err.message}`, 4000);
        }
      } finally {
        // Always close the modal
        setShowConflictModal(false);
        setConflictData(null);
      }
    },
    [
      conflictData,
      config.userId,
      config.userEmail,
      updateQuestionInState,
      updateVersion,
      showMessage,
    ]
  );

  /**
   * Clears conflict state (used when question is deleted).
   */
  const clearConflict = useCallback(() => {
    setConflictData(null);
    setShowConflictModal(false);
  }, []);

  /**
   * Removes version tracking for a question (used on delete).
   * @param {string|number} questionId - Question ID
   */
  const removeVersion = useCallback((questionId) => {
    setQuestionVersions((prev) => {
      const newMap = new Map(prev);
      newMap.delete(questionId);
      return newMap;
    });
  }, []);

  return {
    // State
    conflictData,
    setConflictData,
    showConflictModal,
    setShowConflictModal,
    questionVersions,
    setQuestionVersions,
    // Methods
    getVersion,
    updateVersion,
    removeVersion,
    handleVersionConflict,
    handleConflictResolve,
    clearConflict,
  };
};
