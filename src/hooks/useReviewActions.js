import { useCallback } from "react";
import { QUALITY_PASS_THRESHOLD, TOAST_DURATION } from "../utils/constants";
import {
  generateTagsSecure as generateTagsForQuestion,
  classifyQuestionDiscipline,
} from "../services/geminiSecure";

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
  handleUpdateQuestion, // Added persisted update handler
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

      // 2. Find the target count (Minimum Total across all groups)
      const groupKeys = Object.keys(groups);
      if (groupKeys.length === 0) {
        showMessage("No questions found in this discipline.", 3000);
        return;
      }

      let minTotal = Infinity;
      groupKeys.forEach((key) => {
        const count = groups[key].total;
        if (count < minTotal) minTotal = count;
      });

      // Safety floor - don't trim below 1 unless they only have 1?
      // User said "same amount". If one group has 0, target is 0? That would delete everything.
      // Let's assume a minimum safe floor of 10 or just strict equality.
      // If minTotal is 0, we probably shouldn't delete everything else to 0.
      // Let's ensure target is at least some reasonable number if minTotal is 0, or just warn.
      // Actually, if a group has 2 questions, we probably don't want to trim others to 2.
      // But user demand was explicit: "each section ahs the same aount".
      // I'll stick to minTotal but maybe warn if it's very low.

      const target = minTotal;

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
        showMessage(
          `Trimming ${pendingToDelete.length} questions... (please wait)`,
          TOAST_DURATION.LONG
        );

        // Parallelize updates to avoid sequential Firestore latency
        // Use allSettled to ensure one failure doesn't stop the rest
        const results = await Promise.allSettled(
          pendingToDelete.map((q) =>
            handleUpdateStatus(q.id, "deleted", "Trimmed to balance")
          )
        );

        const successCount = results.filter(
          (r) => r.status === "fulfilled"
        ).length;
        const failCount = results.length - successCount;

        if (failCount > 0) {
          console.warn(`Trim completed with ${failCount} failures.`);
          showMessage(
            `Trimmed ${successCount} questions (${failCount} failed). Check console.`,
            5000
          );
        } else {
          showMessage(`Trimmed ${successCount} questions successfully.`, 4000);
        }
      }
    },
    [uniqueFilteredQuestions, allQuestions, handleUpdateStatus, showMessage]
  );

  /**
   * Auto-tags all pending questions in a given discipline.
   */
  const handleAutoTagAll = useCallback(
    async (discipline, apiKey) => {
      const pendingQuestions = uniqueFilteredQuestions.filter(
        (q) => q.discipline === discipline && q.status === "pending"
      );

      if (pendingQuestions.length === 0) {
        showMessage("No pending questions found.", 3000);
        return;
      }

      let processed = 0;
      let errors = 0;
      let lastErrorMessage = "";

      showMessage(
        `Starting rate-limited tagging for ${pendingQuestions.length} questions. This will take time (approx 8.5s per item) to respect Cloud limits.`,
        TOAST_DURATION.LONG
      );

      for (const [index, q] of pendingQuestions.entries()) {
        // Enforce Cloud Function Rate Limit (Strict 10 per minute = 1 request every 6s)
        // Using 8.5s to be safe and account for network latency/server clock variance
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, 8500));
        }

        try {
          const newTags = await generateTagsForQuestion(apiKey, q.question);
          if (newTags && newTags.length > 0) {
            // Merge with existing tags (avoid duplicates)
            const existingTags = q.tags || [];
            const mergedTags = [
              ...new Set([
                ...existingTags,
                ...newTags.map((t) => t.replace(/^#/, "")),
              ]),
            ];
            handleUpdateQuestion(q.id, { tags: mergedTags }); // Use persisted handler
            processed++;
          }
        } catch (error) {
          console.error("Tag generation failed for:", q.id, error);
          errors++;
          lastErrorMessage = error.message;
        }
      }

      if (errors > 0 && processed === 0) {
        showMessage(
          `Failed to tag questions. Error: ${lastErrorMessage || "Unknown"}`,
          TOAST_DURATION.EXTENDED
        );
      } else if (errors > 0) {
        showMessage(
          `✓ Tagged ${processed} questions, but ${errors} failed. Check console for details.`,
          TOAST_DURATION.LONG
        );
      } else {
        showMessage(
          `✓ Successfully added tags to ${processed} questions!`,
          TOAST_DURATION.LONG
        );
      }
    },
    [uniqueFilteredQuestions, handleUpdateQuestion, showMessage]
  );

  return {
    handleClearPending,
    handleBulkAcceptHighScores,
    handleBulkCritiqueAll,
    handleTrimExcess,
    handleAutoTagAll,
  };
};
