import { useCallback } from 'react';
import { saveQuestionToFirestore } from '../services/firebase';

/**
 * Hook for managing database view actions.
 * Handles updating database questions and kicking questions back to review.
 * 
 * @param {Object} params - Hook parameters
 * @param {Function} params.setDatabaseQuestions - Setter for database questions state
 * @param {Function} params.setHistoricalQuestions - Setter for historical questions state
 * @param {Function} params.showMessage - Function to display toast messages
 * @returns {Object} Database action handlers
 */
export const useDatabaseActions = ({
  setDatabaseQuestions,
  setHistoricalQuestions,
  showMessage,
  handleLoadFromFirestore,
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
      setDatabaseQuestions((prev) =>
        prev.map((q) => {
          if (q.id !== id) return q;
          const newData = typeof update === "function" ? update(q) : update;
          return { ...q, ...newData };
        })
      );
      showMessage(
        "Question updated locally. Click 'Sync to Firestore' to save changes.",
        3000
      );
    },
    [setDatabaseQuestions, showMessage]
  );

  /**
   * Remove question from database and send it back to Review Mode.
   * Deletes from Firestore and adds to historical questions as pending.
   *
   * @param {Object} question - Question to kick back
   */
  const handleKickBackToReview = useCallback(
    async (question) => {
      try {
        // Update status to pending in Firestore (preserve the question)
        const updatedQuestion = {
          ...question,
          status: "pending",
          kickedBackAt: new Date().toISOString(),
          kickedBackBy: "user",
          kickedBackReason: "Moved from Database to Review",
        };

        console.log(
          "🔄 [Kick Back] Saving to Firestore:",
          updatedQuestion.uniqueId
        );
        await saveQuestionToFirestore(updatedQuestion);

        // Remove from database view (so it no longer shows)
        console.log("🔄 [Kick Back] Removing from databaseQuestions");
        setDatabaseQuestions((prev) =>
          prev.filter((q) => q.uniqueId !== question.uniqueId)
        );

        // Add to historical questions with 'pending' status so it appears in Review Mode
        console.log("🔄 [Kick Back] Adding to historicalQuestions");
        setHistoricalQuestions((prev) => {
          // Check if already exists to prevent duplicates
          if (prev.some((q) => q.uniqueId === question.uniqueId)) {
            console.log(
              "🔄 [Kick Back] Updating existing in historicalQuestions"
            );
            return prev.map((q) =>
              q.uniqueId === question.uniqueId ? updatedQuestion : q
            );
          }
          console.log(
            `🔄 [Kick Back] Historical: ${prev.length} -> ${prev.length + 1}`
          );
          return [...prev, updatedQuestion];
        });

        showMessage("Question kicked back to Review. Refreshing...", 3000);

        // Force refresh to ensure counts are updated
        if (handleLoadFromFirestore) {
          console.log("🔄 [Kick Back] Triggering Firestore refresh");
          await handleLoadFromFirestore();
        }
      } catch (error) {
        console.error("Error kicking back question:", error);
        showMessage("Failed to kick back question. Please try again.", 3000);
      }
    },
    [
      setDatabaseQuestions,
      setHistoricalQuestions,
      showMessage,
      handleLoadFromFirestore,
    ]
  );

  return {
    handleUpdateDatabaseQuestion,
    handleKickBackToReview,
  };
};
