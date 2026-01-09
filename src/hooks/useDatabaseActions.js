import { useCallback } from "react";

import { logger } from "../utils/logger";
import { QUESTION_STATUS, QUESTION_SOURCES } from "../utils/constants";

/**
 * Hook for managing database view actions.
 * Handles updating database questions and kicking questions back to review.
 *
 * @param {Object} params - Hook parameters
 * @param {Function} params.showMessage - Function to display toast messages
 * @returns {Object} Database action handlers
 */
export const useDatabaseActions = ({
  showMessage,
  handleLoadFromFirestore,
  moveQuestion,
  updateQuestionInState,
}) => {
  /**
   * Update a single question in the database view (local only).
   * User must sync to Firestore manually.
   *
   * @param {string|number} id - Question ID
   * @param {Object|Function} update - Update data or updater function
   */
  const handleUpdateDatabaseQuestion = useCallback(
    (id, update) => {
      updateQuestionInState(id, (current) => {
        const newData = typeof update === "function" ? update(current) : update;
        return { ...current, ...newData };
      });
      showMessage(
        "Question updated locally. Click 'Sync to Firestore' to save changes.",
        3000
      );
    },
    [updateQuestionInState, showMessage]
  );

  /**
   * Remove question from database and send it back to Review Mode.
   * Deletes from Firestore and adds to historical questions as pending.
   *
   * @param {Object} question - Question to kick back
   */
  const handleKickBackToReview = useCallback(
    async (question) => {
      if (moveQuestion) {
        logger.log("🔄 [Kick Back] Using moveQuestion action");
        await moveQuestion(question.id, QUESTION_SOURCES.SESSION, {
          status: QUESTION_STATUS.PENDING,
          kickedBackAt: new Date().toISOString(),
          kickedBackBy: "user",
          kickedBackReason: "Moved from Database to Review",
        });

        if (handleLoadFromFirestore) {
          await handleLoadFromFirestore();
        }
        return;
      }
    },
    [showMessage, handleLoadFromFirestore, moveQuestion]
  );

  return {
    handleUpdateDatabaseQuestion,
    handleKickBackToReview,
  };
};
