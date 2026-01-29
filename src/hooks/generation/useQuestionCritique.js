import { useCallback } from "react";
import {
  generateCritiqueSecure as generateCritique,
  generateTagsSecure,
} from "../../services/geminiSecure";
import { TOAST_DURATION } from "../../utils/constants";
import { logger } from "../../utils/logger";
import { logError } from "../../utils/AppError";

/**
 * Safely infer the correct answer from a question object.
 * Handles cases where 'correct' is missing, empty, or malformed.
 * For T/F questions, attempts to infer from options.
 * @param {Object} q - Question object
 * @returns {string|null} The correct answer key (A, B, C, D) or null if unrecoverable
 */
const inferCorrectAnswer = (q) => {
  // If correct exists and is valid, return it
  if (q.correct && typeof q.correct === "string" && q.correct.trim()) {
    const val = q.correct.trim().toUpperCase();
    // Normalize "TRUE"/"FALSE" to A/B for T/F questions
    if (val === "TRUE") return "A";
    if (val === "FALSE") return "B";
    if (["A", "B", "C", "D"].includes(val)) return val;
  }

  // For True/False questions, we can infer from options
  const isT = q.type === "True/False" || q.type === "T/F";
  if (isT && q.options) {
    // Standard T/F: A=True, B=False
    const optA = (q.options.A || "").toLowerCase().trim();
    const optB = (q.options.B || "").toLowerCase().trim();

    // Check if we can determine from explicit marking
    // Some legacy data might have "True" or "False" as the correct value text
    if (q.correctAnswerText) {
      const txt = q.correctAnswerText.toLowerCase().trim();
      if (txt === "true" && optA === "true") return "A";
      if (txt === "false" && optB === "false") return "B";
    }

    // If options look like T/F, default to A (True) as conservative fallback
    // Reviewer can correct if wrong
    if (
      (optA === "true" || optA === "true.") &&
      (optB === "false" || optB === "false.")
    ) {
      logger.warn(
        `[inferCorrectAnswer] T/F question missing 'correct' - defaulting to 'A' (True). Question ID: ${q.id}`
      );
      return "A";
    }
  }

  // For MC questions with valid options but missing correct, default to 'A'
  // with warning - reviewer should verify
  if (q.options && (q.options.A || q.options.B)) {
    logger.warn(
      `[inferCorrectAnswer] Question missing 'correct' - defaulting to 'A'. Question ID: ${q.id}`
    );
    return "A";
  }

  // Truly unrecoverable
  return null;
};

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
      // Validate question object has required properties
      if (!q) {
        logger.error("[Critique] Question object is undefined or null");
        showMessage(
          "Critique failed: Invalid question data",
          TOAST_DURATION.LONG
        );
        return;
      }

      if (!q.question) {
        logger.error(
          "[Critique] Question object missing 'question' property:",
          q
        );
        showMessage(
          "Critique failed: Question text is missing",
          TOAST_DURATION.LONG
        );
        return;
      }

      if (!q.options || typeof q.options !== "object") {
        logger.error(
          "[Critique] Question object missing 'options' property:",
          q
        );
        showMessage(
          "Critique failed: Question options are missing",
          TOAST_DURATION.LONG
        );
        return;
      }

      // Try to infer correct answer if missing
      const effectiveCorrect = inferCorrectAnswer(q);
      if (!effectiveCorrect) {
        logger.error("[Critique] Could not determine correct answer:", {
          id: q.id,
          correct: q.correct,
          type: q.type,
        });
        showMessage(
          "Critique failed: Could not determine correct answer",
          TOAST_DURATION.LONG
        );
        return;
      }

      // Use the inferred/validated correct answer
      const normalizedQuestion = {
        ...q,
        correct: effectiveCorrect,
      };

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
          await generateCritique(effectiveApiKey, normalizedQuestion);

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
            logError(error, {
              operation: "generateTagsDuringCritique",
              questionId: q?.id,
            });
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
          ? (() => {
              // Handle both nested (rewrite.options.A) and flat (rewrite.optionA) formats
              const opts = rewrite.options || {};
              const newQuestion = rewrite.question || q.question;
              const newOptions = {
                A: opts.A || rewrite.optionA || q.options?.A || "",
                B: opts.B || rewrite.optionB || q.options?.B || "",
                C: opts.C || rewrite.optionC || q.options?.C || "",
                D: opts.D || rewrite.optionD || q.options?.D || "",
              };

              // CRITICAL FIX: Always preserve original correct answer
              // The AI should NEVER change which answer is correct - only improve wording
              // This prevents T/F questions from incorrectly flipping True<->False
              const newCorrect = q.correct || "A";

              // Log if AI tried to change the answer (for debugging)
              if (rewrite.correct && rewrite.correct !== q.correct) {
                logger.warn(
                  `[Critique] AI attempted to change correct answer from "${q.correct}" to "${rewrite.correct}" - PRESERVED ORIGINAL`
                );
              }

              // Check if rewrite is identical to original
              const isIdentical =
                newQuestion === q.question &&
                newOptions.A === (q.options?.A || "") &&
                newOptions.B === (q.options?.B || "") &&
                newOptions.C === (q.options?.C || "") &&
                newOptions.D === (q.options?.D || "");

              if (isIdentical) {
                // No real changes - return null to indicate no rewrite needed
                return null;
              }

              return {
                question: newQuestion,
                options: newOptions,
                correct: newCorrect,
                improvements,
                critiqueScore: improvedScore,
                critiqueText: text,
                tags: suggestedTags,
                changesExplanation:
                  rewrite.explanation ||
                  "AI-suggested improvements to enhance question quality",
              };
            })()
          : null;

        const previousAttempts = q.critiqueAttempts || 0;
        const newAttemptCount = previousAttempts + 1;

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
        });

        if (q.uniqueId) {
          updateAllVariantsInState(q.uniqueId, critiqueUpdate);
          updateQuestionInState(q.id, critiqueUpdate);
        } else {
          updateQuestionInState(q.id, critiqueUpdate);
        }

        // CRITICAL: Persist critique results (including tags) to Firestore
        // Use saveQuestionToFirestore which handles offline queue and permissions
        try {
          const { saveQuestionToFirestore } =
            await import("../../services/firebase");

          // Merge critique fields into the full question object
          const updatedQuestion = {
            ...q,
            critique: text,
            critiqueScore: score,
            improvedScore: improvedScore,
            suggestedRewrite: updatedRewrite,
            rewriteChanges: changes,
            critiqueAttempts: newAttemptCount,
            tags: suggestedTags.length > 0 ? suggestedTags : q.tags || [],
            firestoreUpdatedAt: new Date().toISOString(),
            version: (q.version || 1) + 1,
          };

          logger.log(
            `[Critique] Saving to Firestore via saveQuestionToFirestore: ${q.id}`
          );
          await saveQuestionToFirestore(updatedQuestion);
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

        showMessage(
          `Critique Ready! Score: ${score}/100`,
          TOAST_DURATION.MEDIUM
        );
      } catch (e) {
        logError(e, { operation: "handleCritique", questionId: q?.id });
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
   * Stores the original version for later comparison/revert.
   * NOTE: Does NOT auto re-critique - reviewer can proceed if satisfied.
   */
  const handleApplyRewrite = useCallback(
    (q) => {
      if (!q.suggestedRewrite) return;

      // Store original version before applying rewrite (for version comparison)
      const originalVersion = q.originalVersion || {
        question: q.question,
        options: { ...q.options },
        correct: q.correct,
        savedAt: new Date().toISOString(),
        savedBy: q.creatorEmail || "unknown",
      };

      const updatedQ = {
        ...q,
        question: q.suggestedRewrite.question,
        options: q.suggestedRewrite.options,
        correct: q.suggestedRewrite.correct,
        // Include suggested tags if available
        tags: q.suggestedRewrite.tags || q.tags || [],
        // Keep the suggested rewrite for comparison (don't clear it)
        suggestedRewrite: q.suggestedRewrite,
        rewriteChanges: null,
        // Keep the existing critique score - don't reset
        critique: q.critique,
        critiqueScore: q.improvedScore || q.critiqueScore, // Use improved score if available
        humanVerified: false,
        status: "pending",
        rejectionReason: null,
        improvementsApplied: true, // Mark that improvements were applied
        // Version tracking
        originalVersion,
        versionSource: "ai_rewrite",
        wasRewritten: true,
        rewriteAppliedAt: new Date().toISOString(),
        lastEditedBy: null, // Will be set when user manually edits
        lastEditedAt: new Date().toISOString(),
      };

      updateQuestionInState(q.id, () => updatedQ);
      showMessage(
        "✓ AI rewrite applied! Click Critique to compare versions.",
        TOAST_DURATION.SHORT
      );
      // NOTE: No auto re-critique - reviewer can proceed with verification
    },
    [updateQuestionInState, showMessage]
  );

  /**
   * Reverts the question to its original version (before AI rewrite).
   */
  const handleRevertToOriginal = useCallback(
    (q) => {
      if (!q.originalVersion) {
        showMessage("No original version available", TOAST_DURATION.SHORT);
        return;
      }

      const updatedQ = {
        ...q,
        question: q.originalVersion.question,
        options: { ...q.originalVersion.options },
        correct: q.originalVersion.correct,
        // Keep the suggested rewrite for potential re-apply
        suggestedRewrite: q.suggestedRewrite,
        // Update version tracking
        versionSource: "original",
        wasRewritten: false,
        lastEditedBy: null,
        lastEditedAt: new Date().toISOString(),
        // Reset review status since content changed
        humanVerified: false,
        status: "pending",
      };

      updateQuestionInState(q.id, () => updatedQ);
      showMessage("✓ Reverted to original version", TOAST_DURATION.SHORT);
    },
    [updateQuestionInState, showMessage]
  );

  /**
   * Applies the AI rewrite from a stored suggestedRewrite (for re-applying after revert).
   */
  const handleUseAIRewrite = useCallback(
    (q) => {
      if (!q.suggestedRewrite) {
        showMessage("No AI rewrite available", TOAST_DURATION.SHORT);
        return;
      }

      const updatedQ = {
        ...q,
        question: q.suggestedRewrite.question,
        options: q.suggestedRewrite.options,
        correct: q.suggestedRewrite.correct,
        tags: q.suggestedRewrite.tags || q.tags || [],
        versionSource: "ai_rewrite",
        wasRewritten: true,
        lastEditedBy: null,
        lastEditedAt: new Date().toISOString(),
        humanVerified: false,
        status: "pending",
      };

      updateQuestionInState(q.id, () => updatedQ);
      showMessage("✓ AI rewrite applied", TOAST_DURATION.SHORT);
    },
    [updateQuestionInState, showMessage]
  );

  return {
    handleCritique,
    handleApplyRewrite,
    handleRevertToOriginal,
    handleUseAIRewrite,
  };
};
