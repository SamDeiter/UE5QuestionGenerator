import { useCallback } from "react";
import {
  QUALITY_PASS_THRESHOLD,
  TOAST_DURATION,
  TARGET_PER_CATEGORY,
} from "../utils/constants";

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
  allQuestions, // Added: Full dataset for global operations
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

  /**
   * Trim excess pending questions to ensure equal distribution across categories.
   * Finds the category with the LEAST questions and trims all others to match.
   */
  const handleTrimExcess = useCallback(
    async (discipline) => {
      // 1. Group questions by category key (e.g., "Beginner MC")
      const groups = {};
      const pendingToDelete = [];

      // Initialize groups using ALL questions (not just filtered/visible ones)
      const sourceQuestions =
        allQuestions && allQuestions.length > 0
          ? allQuestions
          : uniqueFilteredQuestions;

      sourceQuestions.forEach((q) => {
        if (q.discipline !== discipline) return;

        const typeAbbrev = q.type === "True/False" ? "T/F" : "MC";
        const key = `${q.difficulty} ${typeAbbrev}`;

        if (!groups[key]) {
          groups[key] = {
            accepted: [],
            pending: [],
            rejected: [],
            total: 0,
          };
        }

        if (q.status === "accepted") groups[key].accepted.push(q);
        else if (q.status === "rejected") groups[key].rejected.push(q);
        else groups[key].pending.push(q);

        // Only count Accepted + Pending for the target (Rejected don't count towards "quota")
        if (q.status !== "rejected") {
          groups[key].total++;
        }
      });

      // 2. Use the standard target (40) instead of finding the minimum
      const target = TARGET_PER_CATEGORY;

      // 3. Determine which pending questions to delete
      let deleteCount = 0;
      Object.entries(groups).forEach(([_key, group]) => {
        const currentValid = group.accepted.length + group.pending.length;

        if (currentValid > target) {
          const surplus = currentValid - target;
          // We can only delete Pending questions. We cannot delete Accepted ones to reach target.
          const deletableCount = Math.min(surplus, group.pending.length);

          if (deletableCount > 0) {
            // Remove newest pending questions first
            const toRemove = group.pending.slice(0, deletableCount);
            toRemove.forEach((q) => pendingToDelete.push(q));
            deleteCount += toRemove.length;
          }
        }
      });

      if (deleteCount === 0) {
        showMessage(
          `Balanced! All sections already have ${target} (or fewer) questions.`,
          3000
        );
        return;
      }

      if (
        window.confirm(
          `Trimming to Common Count: ${target}\n\n` +
            `Found ${deleteCount} excess pending questions in ${discipline} that exceed the lowest section count (${target}).\n\n` +
            `Proceed to delete them?`
        )
      ) {
        // Get IDs of questions to delete
        const idsToDelete = new Set(pendingToDelete.map((q) => q.id));

        // Actually remove questions from the array
        setQuestions((prevQuestions) =>
          prevQuestions.filter((q) => !idsToDelete.has(q.id))
        );

        showMessage(
          `✅ Trimmed ${pendingToDelete.length} questions successfully!`,
          TOAST_DURATION.LONG
        );
      }
    },
    [uniqueFilteredQuestions, allQuestions, showMessage, setQuestions]
  );

  return {
    handleClearPending,
    handleBulkAcceptHighScores,
    handleBulkCritiqueAll,
    handleTrimExcess,
  };
};
