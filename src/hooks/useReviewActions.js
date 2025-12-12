import { useCallback } from "react";
import { QUALITY_PASS_THRESHOLD, TOAST_DURATION } from "../utils/constants";

/**
 * Hook for managing review mode bulk actions.
 * Handles clearing pending, bulk accepting, and bulk critiquing.
 *
 * @param {Object} params - Hook parameters
 * @param {Array} params.uniqueFilteredQuestions - Filtered questions list
 * @param {Function} params.setQuestions - Setter for questions state
 * @param {Function} params.handleUpdateStatus - Function to update question status
 * @param {Function} params.handleCritique - Function to critique a question
 * @param {Function} params.showMessage - Function to display toast messages
 * @returns {Object} Review action handlers
 */
export const useReviewActions = ({
  uniqueFilteredQuestions,
  setQuestions,
  handleUpdateStatus,
  handleCritique,
  showMessage,
}) => {
  /**
   * Clear all pending questions after confirmation.
   */
  const handleClearPending = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to delete ALL pending questions? This cannot be undone."
      )
    ) {
      setQuestions((prev) =>
        prev.filter((q) => q.status === "accepted" || q.status === "rejected")
      );
      showMessage("All pending questions cleared.", 3000);
    }
  }, [setQuestions, showMessage]);

  /**
   * Bulk accept all questions with critique score >= threshold that are human verified.
   */
  const handleBulkAcceptHighScores = useCallback(() => {
    const highScoreQuestions = uniqueFilteredQuestions.filter(
      (q) =>
        q.critiqueScore >= QUALITY_PASS_THRESHOLD &&
        q.status !== "accepted" &&
        q.humanVerified
    );

    if (highScoreQuestions.length === 0) {
      showMessage(
        `No verified questions with score ≥ ${QUALITY_PASS_THRESHOLD} to accept.`,
        TOAST_DURATION.MEDIUM
      );
      return;
    }

    highScoreQuestions.forEach((q) => handleUpdateStatus(q.id, "accepted"));
    showMessage(
      `✓ Accepted ${highScoreQuestions.length} high-scoring questions!`,
      4000
    );
  }, [uniqueFilteredQuestions, handleUpdateStatus, showMessage]);

  /**
   * Bulk critique all questions without critique scores.
   * Processes sequentially to avoid rate limits.
   */
  const handleBulkCritiqueAll = useCallback(async () => {
    const uncritiquedQuestions = uniqueFilteredQuestions.filter(
      (q) => q.critiqueScore === undefined || q.critiqueScore === null
    );

    if (uncritiquedQuestions.length === 0) {
      showMessage("All questions already have critique scores.", 3000);
      return;
    }

    showMessage(
      `Running critique on ${uncritiquedQuestions.length} questions...`,
      3000
    );

    // Process sequentially to avoid rate limits
    for (const q of uncritiquedQuestions) {
      await handleCritique(q);
    }

    showMessage(
      `✓ Critique complete for ${uncritiquedQuestions.length} questions!`,
      4000
    );
  }, [uniqueFilteredQuestions, handleCritique, showMessage]);

  return {
    handleClearPending,
    handleBulkAcceptHighScores,
    handleBulkCritiqueAll,
  };
};
