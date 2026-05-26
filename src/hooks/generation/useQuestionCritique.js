import { useCallback } from "react";
import { Timestamp } from "firebase/firestore";
import {
  generateContentSecure as generateContent,
  generateCritiqueSecure as generateCritique,
  generateTagsSecure,
} from "../../services/geminiSecure";
import { constructSystemPrompt } from "../../services/promptBuilder";
import { parseQuestions } from "../../utils/parserUtils";
import {
  TOAST_DURATION,
  AI_CONFIG,
  GENERATION_LIMITS,
  QUALITY_THRESHOLDS,
} from "../../utils/constants";
import { logger } from "../../utils/logger";
import { logError } from "../../utils/AppError";
import { inferCorrectAnswer } from "../../utils/answerHelpers";

/**
 * Hook for handling question critique and feedback loop logic.
 * Extracted from useGeneration to reduce complexity.
 */
export const useQuestionCritique = ({
  config,
  effectiveApiKey,
  isApiReady,
  showMessage,
  setStatus,
  setIsProcessing,
  updateQuestionInState,
  updateAllVariantsInState,
  addQuestionsToState,
  checkAndStoreQuestions,
  getFileContext,
}) => {
  /**
   * Batched auto-critique used after generation. Scores each question in
   * parallel batches and surfaces a summary message. Also auto-generates
   * tags for questions that came back tag-thin.
   */
  const handleAutoCritique = useCallback(
    async (questions) => {
      setStatus("Auto-critiquing...");
      showMessage(
        `Running AI critique on ${questions.length} questions...`,
        TOAST_DURATION.MEDIUM
      );

      const critiqueQuestion = async (question) => {
        try {
          const { score, text, rewrite, changes } = await generateCritique(
            effectiveApiKey,
            question
          );

          let suggestedTags = question.tags || [];
          if (
            suggestedTags.length < GENERATION_LIMITS.MIN_TAGS_PER_QUESTION &&
            rewrite
          ) {
            const improvedQuestion = {
              question: rewrite.question || question.question,
              optionA: rewrite.optionA || question.options?.A,
              optionB: rewrite.optionB || question.options?.B,
              optionC: rewrite.optionC || question.options?.C,
              optionD: rewrite.optionD || question.options?.D,
            };
            const newTags = await generateTagsSecure(
              effectiveApiKey,
              improvedQuestion
            );
            if (newTags) {
              suggestedTags = [
                ...new Set([
                  ...suggestedTags,
                  ...newTags.map((t) => t.replace(/^#/, "")),
                ]),
              ];
            }
          }

          updateQuestionInState(question.id, (item) => ({
            ...item,
            critique: text,
            critiqueScore: score,
            suggestedRewrite: rewrite
              ? { ...rewrite, tags: suggestedTags }
              : null,
            rewriteChanges: changes,
          }));
          return score;
        } catch {
          return null;
        }
      };

      const batchSize = GENERATION_LIMITS.BATCH_SIZE_PARALLEL_CRITIQUE;
      const scores = [];
      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);
        const batchScores = await Promise.all(batch.map(critiqueQuestion));
        scores.push(...batchScores.filter((s) => s !== null));
      }

      const avgScore =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;

      const highScoreCount = scores.filter(
        (s) => s >= QUALITY_THRESHOLDS.PASS
      ).length;
      const lowScoreCount = scores.filter(
        (s) => s < QUALITY_THRESHOLDS.MEDIOCRE
      ).length;

      if (lowScoreCount > 0) {
        showMessage(
          `Critique complete! Avg: ${avgScore}/100. ⚠️ ${lowScoreCount} need improvement.`,
          TOAST_DURATION.EXTENDED
        );
      } else {
        showMessage(
          `Critique complete! Avg: ${avgScore}/100. ${highScoreCount} ready to accept!`,
          TOAST_DURATION.LONG
        );
      }
      setStatus("");
    },
    [effectiveApiKey, setStatus, showMessage, updateQuestionInState]
  );

  /**
   * Single-question explanation — generates a "why is this correct" blurb
   * and stores it on the question.
   */
  const handleExplain = useCallback(
    async (q) => {
      if (!isApiReady) {
        showMessage("API key required.", TOAST_DURATION.LONG);
        return;
      }

      setIsProcessing(true);
      setStatus("Explaining...");
      const prompt = `Explain WHY the answer is correct in simple terms: "${
        q.question
      }" Answer: "${q.correct === "A" ? q.options.A : q.options.B}"`;

      try {
        const exp = await generateContent(
          effectiveApiKey,
          "Technical Assistant",
          prompt,
          setStatus
        );
        updateQuestionInState(q.id, (item) => ({ ...item, explanation: exp }));
        setStatus("");
      } catch (error) {
        logger.error("Explanation failed:", error);
        setStatus("Fail");
      } finally {
        setIsProcessing(false);
      }
    },
    [
      effectiveApiKey,
      isApiReady,
      setStatus,
      showMessage,
      updateQuestionInState,
      setIsProcessing,
    ]
  );

  /**
   * Generate two improved variations of a question. Uses the critique
   * feedback as the variation prompt when available, otherwise asks for
   * "more challenging and professional" variants.
   */
  const handleVariate = useCallback(
    async (q) => {
      if (!isApiReady) {
        showMessage("API key required.", TOAST_DURATION.LONG);
        return;
      }

      setIsProcessing(true);
      setStatus("Creating improved variations...");

      const hasCritique = q.critique && q.critiqueScore !== undefined;
      const critiqueContext = hasCritique
        ? `\n\nCRITIQUE FEEDBACK (Score: ${q.critiqueScore}/100):\n${q.critique}\n\nYour task: Generate 2 IMPROVED variations that ADDRESS the critique feedback above.`
        : `\n\nYour task: Generate 2 IMPROVED variations that are MORE CHALLENGING and PROFESSIONAL than the original.`;

      const sys = constructSystemPrompt(config, getFileContext());
      const prompt = `ORIGINAL QUESTION TO IMPROVE:
Discipline: ${q.discipline}
Difficulty: ${q.difficulty}
Type: ${q.type}
Question: "${q.question}"
Options:
A) ${q.options.A}
B) ${q.options.B}
${q.options.C ? `C) ${q.options.C}` : ""}
${q.options.D ? `D) ${q.options.D}` : ""}
Correct Answer: ${q.correct}
${critiqueContext}

REQUIREMENTS FOR VARIATIONS:
1. Address any weaknesses mentioned in the critique (if provided)
2. Increase depth and professional relevance
3. Use scenario-based or application-focused phrasing
4. Avoid trivial or overly simple questions
5. Maintain the same difficulty level: ${q.difficulty}
6. Keep the same type: ${q.type}

Output in Markdown Table format.`;

      try {
        const text = await generateContent(
          effectiveApiKey,
          sys,
          prompt,
          setStatus
        );
        const newQs = parseQuestions(text);
        if (newQs.length > 0) {
          const uniqueNewQuestions = await checkAndStoreQuestions(newQs);
          addQuestionsToState(uniqueNewQuestions, false);
          showMessage(
            `Added ${uniqueNewQuestions.length} improved variations.`,
            TOAST_DURATION.SHORT
          );
        }
      } catch (e) {
        logError(e, { operation: "generateVariations", questionId: q?.id });
        setStatus("Fail");
        showMessage(
          `Failed to generate variations: ${e.message}`,
          TOAST_DURATION.EXTENDED
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [
      config,
      effectiveApiKey,
      isApiReady,
      setStatus,
      showMessage,
      addQuestionsToState,
      checkAndStoreQuestions,
      setIsProcessing,
      getFileContext,
    ]
  );

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

        // Generate tags if question has fewer than MAX_CRITIQUE_RETRIES
        let suggestedTags = Array.isArray(q.tags) ? q.tags : [];
        if (suggestedTags.length < AI_CONFIG.MAX_CRITIQUE_RETRIES) {
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
              ].slice(0, AI_CONFIG.MAX_FEEDBACK_SCORE);
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
            firestoreUpdatedAt: Timestamp.now(),
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
    handleAutoCritique,
    handleExplain,
    handleVariate,
  };
};
