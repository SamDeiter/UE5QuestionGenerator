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
   * Trim excess pending questions that exceed the target count.
   * Marks excess questions as 'deleted' to remove them from the active pool.
   */
  const handleTrimExcess = useCallback(
    async (discipline) => {
      // 1. Group questions by category key (e.g., "Beginner MC")
      const groups = {};
      const pendingToDelete = [];
      let deleteCount = 0;

      // Initialize groups
      uniqueFilteredQuestions.forEach((q) => {
        if (q.discipline !== discipline) return;

        const typeAbbrev = q.type === "True/False" ? "T/F" : "MC";
        const key = `${q.difficulty} ${typeAbbrev}`;

        if (!groups[key]) {
          groups[key] = {
            accepted: [],
            pending: [],
            rejected: [],
          };
        }

        if (q.status === "accepted") groups[key].accepted.push(q);
        else if (q.status === "rejected") groups[key].rejected.push(q);
        else groups[key].pending.push(q);
      });

      // 2. Determine which pending questions to delete
      Object.entries(groups).forEach(([_key, group]) => {
        const currentTotal = group.accepted.length + group.pending.length;
        const target = 40; // Hardcoded default for now

        if (currentTotal > target) {
          const surplus = currentTotal - target;
          const deletableCount = Math.min(surplus, group.pending.length);

          if (deletableCount > 0) {
            // Remove newest pending questions first (assuming LIFO is safer for "runaway generation")
            // Wait, existing questions are usually sorted Newest First in unifiedQuestions.
            // So slice(0, N) takes the NEWEST ones. Yes, delete the surplus new ones.
            const toRemove = group.pending.slice(0, deletableCount);
            toRemove.forEach((q) => pendingToDelete.push(q));
            deleteCount += toRemove.length;
          }
        }
      });

      if (deleteCount === 0) {
        showMessage("No excess pending questions found to trim.", 3000);
        return;
      }

      if (
        window.confirm(
          `Found ${deleteCount} excess pending questions in ${discipline}.\n\nThis will permanently delete them to match the target of ${40} per category.\n\nProceed?`
        )
      ) {
        // Mark as deleted individually (or bulk if we had an atomic bulk op)
        // For now, update status to 'deleted' which removes them from views
        let processed = 0;
        for (const q of pendingToDelete) {
          await handleUpdateStatus(q.id, "deleted", "Trimmed excess");
          processed++;
        }
        showMessage(`Trimmed ${processed} questions.`, 4000);
      }
    },
    [uniqueFilteredQuestions, handleUpdateStatus, showMessage]
  );

  /**
   * Bulk move selected questions to a different discipline.
   */
  const handleBulkMove = useCallback(
    (selectedIds, newDiscipline) => {
      if (!selectedIds || selectedIds.size === 0) return;

      // Convert Set to Array
      const ids = Array.from(selectedIds);
      let count = 0;

      // Identify questions to move
      const questionsToMove = uniqueFilteredQuestions.filter(
        (q) => ids.includes(q.id) || ids.includes(q.uniqueId)
      );

      // Persist changes using handleUpdateQuestion
      questionsToMove.forEach((q) => {
        handleUpdateQuestion(q.id, {
          discipline: newDiscipline,
          modifiedAt: new Date().toISOString(),
        });
        count++;
      });

      showMessage(`Moved ${count} questions to ${newDiscipline}`, 3000);
    },
    [uniqueFilteredQuestions, handleUpdateQuestion, showMessage]
  );

  /**
   * Auto-classifies selected questions into the correct discipline using Gemini.
   */
  const handleAutoClassify = useCallback(
    async (selectedIds, apiKey) => {
      if (!selectedIds || selectedIds.size === 0) return;
      if (!apiKey) {
        showMessage("API Key required for auto-classification.", 3000);
        return;
      }

      const ids = Array.from(selectedIds);
      const questionsToProcess = uniqueFilteredQuestions.filter(
        (q) => ids.includes(q.id) || ids.includes(q.uniqueId)
      );

      showMessage(
        `Classifying ${questionsToProcess.length} questions...`,
        3000
      );

      let processed = 0;
      // Static import used
      // const { classifyQuestionDiscipline } = await import("../services/gemini");

      for (const q of questionsToProcess) {
        try {
          const discipline = await classifyQuestionDiscipline(
            apiKey,
            q.question
          );
          if (discipline) {
            handleUpdateQuestion(q.id, { discipline }); // Use persisted handler
            processed++;
          }
        } catch (error) {
          console.error("Classification failed for:", q.id, error);
        }
      }

      showMessage(`Auto-classified ${processed} questions.`, 4000);
    },
    [uniqueFilteredQuestions, handleUpdateQuestion, showMessage]
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

  /**
   * Auto-generates tags for selected questions using Gemini.
   */
  const handleAutoTag = useCallback(
    async (selectedIds, apiKey) => {
      if (!selectedIds || selectedIds.size === 0) return;
      // Removed strict apiKey check to allow internal env

      const ids = Array.from(selectedIds);
      const questionsToProcess = uniqueFilteredQuestions.filter(
        (q) => ids.includes(q.id) || ids.includes(q.uniqueId)
      );

      showMessage(`Tagging ${questionsToProcess.length} questions...`, 3000);

      let processed = 0;
      const { generateTagsForQuestion } = await import("../services/gemini");

      for (const q of questionsToProcess) {
        try {
          const tags = await generateTagsForQuestion(apiKey, q.question);
          if (tags && Array.isArray(tags)) {
            // Append new tags, unique only
            const existingTags = q.tags || [];
            const mergedTags = [...new Set([...existingTags, ...tags])];

            handleUpdateQuestion(q.id, { tags: mergedTags }); // Use persisted handler
            processed++;
          }
        } catch (error) {
          console.error("Tagging failed for:", q.id, error);
        }
      }

      showMessage(`Auto-tagged ${processed} questions.`, 4000);
    },
    [uniqueFilteredQuestions, handleUpdateQuestion, showMessage]
  );

  return {
    handleClearPending,
    handleBulkAcceptHighScores,
    handleBulkCritiqueAll,
    handleTrimExcess,
    handleBulkMove,
    handleAutoClassify,
    handleAutoTag,
    handleAutoTagAll,
  };
};
