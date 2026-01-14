import { useCallback } from "react";
import {
  generateCritiqueSecure as generateCritique,
  generateTagsSecure,
} from "../../services/geminiSecure";
import { QUALITY_THRESHOLDS, TOAST_DURATION } from "../../utils/constants";
import { logger } from "../../utils/logger";

/**
 * Hook for handling question critique and feedback loop logic.
 * Extracted from useGeneration to reduce complexity.
 */
export const useQuestionCritique = ({
  effectiveApiKey,
  isApiReady,
  showMessage,
  setStatus,
  setIsProcessing,
  updateQuestionInState,
  updateAllVariantsInState,
}) => {
  /**
   * Generates a critique and suggested rewrite for a question.
   */
  const handleCritique = useCallback(
    async (q) => {
      if (!isApiReady) {
        showMessage(
          "API key is required for critique. Please enter it in the settings panel.",
          TOAST_DURATION.LONG
        );
        return;
      }

      setIsProcessing(true);
      setStatus("Critiquing...");

      try {
        const { score, text, rewrite, improvedScore, changes } =
          await generateCritique(effectiveApiKey, q);

        // Generate tags if question has fewer than 3
        let suggestedTags = Array.isArray(q.tags) ? q.tags : [];
        if (suggestedTags.length < 3) {
          try {
            const questionForTags = rewrite
              ? {
                  question: rewrite.question || q.question,
                  optionA: rewrite.optionA || q.options?.A,
                  optionB: rewrite.optionB || q.options?.B,
                  optionC: rewrite.optionC || q.options?.C,
                  optionD: rewrite.optionD || q.options?.D,
                }
              : {
                  question: q.question,
                  optionA: q.options?.A,
                  optionB: q.options?.B,
                  optionC: q.options?.C,
                  optionD: q.options?.D,
                };

            const newTags = await generateTagsSecure(
              effectiveApiKey,
              questionForTags
            );
            if (newTags && newTags.length > 0) {
              suggestedTags = [
                ...new Set([
                  ...suggestedTags,
                  ...newTags.map((t) => t.replace(/^#/, "")),
                ]),
              ].slice(0, 5);
            }
          } catch (error) {
            logger.error("Tag generation failed during critique:", error);
          }
        }
        // Normalize changes to array format
        let improvements = [];
        if (Array.isArray(changes)) {
          improvements = changes;
        } else if (changes) {
          improvements = [changes];
        }

        const updatedRewrite = rewrite
          ? {
              question: rewrite.question || q.question,
              options: {
                A: rewrite.optionA || q.options?.A || "",
                B: rewrite.optionB || q.options?.B || "",
                C: rewrite.optionC || q.options?.C || "",
                D: rewrite.optionD || q.options?.D || "",
              },
              correct: rewrite.correctLetter || q.correct || "A",
              improvements,
              critiqueScore: improvedScore,
              critiqueText: text,
              tags: suggestedTags,
              changesExplanation:
                rewrite.explanation ||
                "AI-suggested improvements to enhance question quality",
            }
          : null;

        const previousAttempts = q.critiqueAttempts || 0;
        const newAttemptCount = previousAttempts + 1;
        const PASSING_SCORE = QUALITY_THRESHOLDS.PASS;
        const MAX_ATTEMPTS = 3;

        const critiqueUpdate = (item) => ({
          ...item,
          critique: text,
          critiqueScore: score,
          improvedScore: improvedScore,
          suggestedRewrite: updatedRewrite,
          rewriteChanges: changes,
          critiqueAttempts: newAttemptCount,
          // Save generated tags immediately
          tags: suggestedTags.length > 0 ? suggestedTags : item.tags,
          ...(score < PASSING_SCORE && newAttemptCount >= MAX_ATTEMPTS
            ? {
                status: "rejected",
                rejectionReason: "low_score_after_retries",
                rejectedAt: new Date().toISOString(),
              }
            : {}),
        });

        if (q.uniqueId) {
          updateAllVariantsInState(q.uniqueId, critiqueUpdate);
          updateQuestionInState(q.id, critiqueUpdate);
        } else {
          updateQuestionInState(q.id, critiqueUpdate);
        }

        // CRITICAL: Persist critique results (including tags) to Firestore
        // Only send the fields that changed to comply with Firestore rules
        try {
          const { doc, updateDoc } = await import("firebase/firestore");
          const { getDb } = await import("../../services/firebase");
          const db = getDb();
          // IMPORTANT: Convert ID to string - IDs can be numbers which breaks Firestore doc()
          const questionRef = doc(db, "questions", String(q.id));

          // Only update the critique-related fields (matches Firestore rules whitelist)
          const critiqueFieldsOnly = {
            critique: text,
            critiqueScore: score,
            improvedScore: improvedScore,
            suggestedRewrite: updatedRewrite,
            rewriteChanges: changes,
            critiqueAttempts: newAttemptCount,
            tags: suggestedTags.length > 0 ? suggestedTags : q.tags || [],
            firestoreUpdatedAt: new Date().toISOString(),
            version: (q.version || 1) + 1,
            ...(score < PASSING_SCORE && newAttemptCount >= MAX_ATTEMPTS
              ? {
                  status: "rejected",
                  rejectionReason: "low_score_after_retries",
                  rejectedAt: new Date().toISOString(),
                }
              : {}),
          };

          await updateDoc(questionRef, critiqueFieldsOnly);
          logger.log(
            `[Critique] Saved critique fields for ${q.id} including ${suggestedTags.length} tags`
          );
        } catch (saveError) {
          logger.error(
            "[Critique] Failed to save critique results to Firestore:",
            saveError
          );
          // Don't fail silently - notify user
          showMessage(
            "⚠️ Critique saved locally but failed to sync to database",
            TOAST_DURATION.LONG
          );
        }

        if (score < PASSING_SCORE && newAttemptCount >= MAX_ATTEMPTS) {
          showMessage(
            `\u26D4 Auto-rejected: Score ${score}/100 after ${newAttemptCount} attempts. Quality too low.`,
            TOAST_DURATION.EXTENDED
          );
        } else {
          showMessage(
            `Critique Ready! Score: ${score}/100`,
            TOAST_DURATION.MEDIUM
          );
        }
      } catch (e) {
        logger.error("Critique failed:", e);
        setStatus("Fail");
        showMessage(`Critique Failed: ${e.message}`, TOAST_DURATION.LONG);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isApiReady,
      showMessage,
      effectiveApiKey,
      updateQuestionInState,
      updateAllVariantsInState,
      setStatus,
      setIsProcessing,
    ]
  );

  /**
   * Applies the suggested rewrite to the question.
   */
  const handleApplyRewrite = useCallback(
    (q) => {
      if (!q.suggestedRewrite) return;

      const updatedQ = {
        ...q,
        question: q.suggestedRewrite.question,
        options: q.suggestedRewrite.options,
        correct: q.suggestedRewrite.correct,
        // Include suggested tags if available
        tags: q.suggestedRewrite.tags || q.tags || [],
        suggestedRewrite: null,
        rewriteChanges: null,
        critique: null,
        critiqueScore: null,
        humanVerified: false,
        status: "pending",
        rejectionReason: null,
      };

      updateQuestionInState(q.id, () => updatedQ);
      showMessage("✓ Applied! Re-critiquing...", TOAST_DURATION.SHORT);

      // Re-trigger critique after a short delay
      setTimeout(() => {
        handleCritique({ ...updatedQ, id: q.id });
      }, 300);
    },
    [updateQuestionInState, showMessage, handleCritique]
  );

  return {
    handleCritique,
    handleApplyRewrite,
  };
};
