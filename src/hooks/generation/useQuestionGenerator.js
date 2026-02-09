import { useState, useCallback } from "react";
import {
  generateContentSecure as generateContent,
  generateCritiqueSecure as generateCritique,
  generateTagsSecure,
} from "../../services/geminiSecure";
import { constructSystemPrompt } from "../../services/promptBuilder";
import { parseQuestions, convertMCtoTF } from "../../utils/parserUtils";
import { validateQuestion } from "../../utils/questionValidator";
import { analyzeRequest, estimateTokens } from "../../utils/tokenCounter";
import { logGeneration, logQuestion } from "../../utils/analyticsStore";
import { validateGeneration } from "../../utils/quotaEnforcement";
import {
  TOAST_DURATION,
  GENERATION_LIMITS,
  CONTEXT_LIMITS,
  QUALITY_THRESHOLDS,
} from "../../utils/constants";
import {
  calculateCoverageGaps,
  enrichGeneratedQuestions,
  filterForbiddenSources,
  verifyAndProcessQuestions,
} from "../../utils/generationUtils";
import { logger } from "../../utils/logger";
import { logError } from "../../utils/AppError";
import { TAGS_BY_DISCIPLINE } from "../../utils/tagTaxonomy";

/**
 * Hook to handle question generation, explanation, and variation.
 */
export const useQuestionGenerator = ({
  config,
  effectiveApiKey,
  isApiReady,
  isTargetMet,
  allQuestionsMap,
  showMessage,
  setStatus,
  setShowNameModal,
  setShowApiError,
  setShowHistory,
  getFileContext,
  checkAndStoreQuestions,
  addQuestionsToState,
  updateQuestionInState,
  setIsProcessing,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handlePerformGeneration = useCallback(
    async ({
      effectiveApiKey,
      systemPrompt,
      userPrompt,
      effectiveType,
      startTime,
      tokenAnalysis,
    }) => {
      const text = await generateContent(
        effectiveApiKey,
        systemPrompt,
        userPrompt,
        setStatus,
        config.temperature,
        config.model
      );
      const duration = Date.now() - startTime;

      const groundingSources = window.__lastGroundingSources || [];
      const groundedUrls = new Set(
        groundingSources.map((s) => s.url.toLowerCase())
      );

      let genQuestions = parseQuestions(text);
      if (genQuestions.length === 0) {
        throw new Error("Failed to parse questions.");
      }

      genQuestions = filterForbiddenSources(genQuestions);

      const expectedType =
        effectiveType === "T/F" || effectiveType === "True/False"
          ? "True/False"
          : "Multiple Choice";

      genQuestions = verifyAndProcessQuestions(
        genQuestions,
        { groundedUrls, expectedType, config },
        convertMCtoTF
      );

      window.__lastGroundingSources = [];

      const valQuestions = [];
      let rejCount = 0;

      genQuestions.forEach((q) => {
        const validation = validateQuestion(q);
        if (validation.isCriticalFailure) {
          rejCount++;
        } else {
          valQuestions.push({ ...q, _validation: validation });
        }
      });

      if (rejCount > 0) {
        showMessage(
          `Auto-rejected ${rejCount} questions with invalid metadata.`,
          TOAST_DURATION.EXTENDED
        );
      }

      const enriched = enrichGeneratedQuestions(valQuestions, {
        config,
        duration,
        costPerQuestion:
          valQuestions.length > 0
            ? tokenAnalysis.cost.estimated / valQuestions.length
            : 0,
        groundingSources,
        expectedType,
        requestedDifficulty: config.difficulty,
      });

      const uniqueQs = await checkAndStoreQuestions(enriched);

      const avgQual =
        uniqueQs.reduce((sum, q) => sum + (q.qualityScore || 0), 0) /
        (uniqueQs.length || 1);

      const genId = logGeneration({
        discipline: config.discipline,
        difficulty: config.difficulty,
        batchSize: config.batchSize,
        tokensUsed: {
          input: tokenAnalysis.input.total,
          output: estimateTokens(text),
        },
        duration,
        questionsGenerated: uniqueQs.length,
        averageQuality: Math.round(avgQual),
        success: true,
        model: config.model || "gemini-2.0-flash",
        estimatedCost: tokenAnalysis.cost.estimated,
      });

      uniqueQs.forEach((q) => {
        logQuestion({
          id: q.id,
          generationId: genId,
          created: q.dateAdded,
          status: "pending",
          qualityScore: q.qualityScore,
          discipline: q.discipline,
          difficulty: q.difficulty,
          type: q.type,
          questionText: q.question,
        });
      });

      addQuestionsToState(uniqueQs, false);
      return uniqueQs;
    },
    [
      config,
      setStatus,
      checkAndStoreQuestions,
      addQuestionsToState,
      showMessage,
    ]
  );

  const prepareGenerationContext = useCallback(async () => {
    // QUOTA ENFORCEMENT
    const allQuestions = Array.from(allQuestionsMap.values()).flat();
    const quotaCheck = validateGeneration(
      config.discipline,
      config.difficulty,
      config.batchSize,
      allQuestions,
      config.type || "Multiple Choice"
    );

    if (!quotaCheck.allowed) {
      showMessage(quotaCheck.reason, TOAST_DURATION.EXTENDED);
      return null;
    }

    let effectiveBatchSize = config.batchSize;
    if (quotaCheck.warning && quotaCheck.maxAllowed < config.batchSize) {
      effectiveBatchSize = quotaCheck.maxAllowed;
      showMessage(
        `Batch size reduced to ${quotaCheck.maxAllowed} (quota limit). ${quotaCheck.reason}`,
        TOAST_DURATION.EXTENDED
      );
    }

    const effectiveType =
      quotaCheck.forceType || config.type || "Multiple Choice";

    setIsGenerating(true);
    setShowHistory(false);
    setStatus("Drafting Scenarios...");
    const startTime = Date.now();

    // Collect rejected examples
    const rejectedExamples = Array.from(allQuestionsMap.values())
      .flat()
      .filter(
        (q) =>
          q.status === "rejected" &&
          q.rejectionReason &&
          q.discipline === config.discipline
      )
      .slice(-GENERATION_LIMITS.REJECTED_EXAMPLES_COUNT);

    // AUTO-DETECT COVERAGE GAPS
    const availableTags = TAGS_BY_DISCIPLINE[config.discipline] || [];
    const coverageGaps = calculateCoverageGaps(
      config.discipline,
      availableTags,
      allQuestions
    );

    const adjustedConfig = {
      ...config,
      type: effectiveType,
      batchSize: effectiveBatchSize,
    };
    const systemPrompt = constructSystemPrompt(
      adjustedConfig,
      getFileContext(),
      rejectedExamples,
      coverageGaps
    );

    let typeInstruction = "";
    if (effectiveType === "True/False" || effectiveType === "T/F") {
      typeInstruction =
        " Generate ONLY True/False questions (no Multiple Choice).";
    } else if (effectiveType === "Multiple Choice" || effectiveType === "MC") {
      typeInstruction =
        " Generate ONLY Multiple Choice questions (no True/False).";
    }
    const userPrompt = `Generate ${effectiveBatchSize} scenario-based questions for ${config.discipline} in ${config.language}. Focus: ${config.difficulty}.${typeInstruction} Ensure links work for UE 5.7 or latest available.`;

    const tokenAnalysis = analyzeRequest(
      systemPrompt,
      userPrompt,
      CONTEXT_LIMITS.MAX_TOKENS,
      config.model || "gemini-2.0-flash"
    );

    return {
      systemPrompt,
      userPrompt,
      effectiveType,
      startTime,
      tokenAnalysis,
    };
  }, [
    config,
    allQuestionsMap,
    getFileContext,
    showMessage,
    setStatus,
    setIsGenerating,
    setShowHistory,
  ]);

  const handleGenerate = useCallback(async () => {
    if (!config.creatorName) {
      showMessage(
        "Please enter your Creator Name to start generating.",
        TOAST_DURATION.LONG
      );
      setShowNameModal(true);
      return;
    }
    if (!isApiReady) {
      setShowApiError(true);
      showMessage(
        "API key is required. Please enter it in Settings.",
        TOAST_DURATION.LONG
      );
      return;
    }

    if (isTargetMet) {
      showMessage(
        `Quota met for ${config.difficulty}! Change difficulty/type or discipline to continue.`,
        TOAST_DURATION.LONG
      );
      return;
    }

    const context = await prepareGenerationContext();
    if (!context) return;

    const {
      systemPrompt,
      userPrompt,
      effectiveType,
      startTime,
      tokenAnalysis,
    } = context;

    try {
      const uniqueNewQuestions = await handlePerformGeneration({
        effectiveApiKey,
        systemPrompt,
        userPrompt,
        effectiveType,
        startTime,
        tokenAnalysis,
      });

      // AUTO-CRITIQUE
      const autoCritiqueEnabled =
        localStorage.getItem("ue5_auto_critique") === "true";

      if (autoCritiqueEnabled && uniqueNewQuestions.length > 0) {
        handleAutoCritique(uniqueNewQuestions);
      }

      setStatus("");
    } catch (err) {
      const duration = Date.now() - startTime;
      logGeneration({
        discipline: config.discipline,
        difficulty: config.difficulty,
        batchSize: config.batchSize,
        tokensUsed: { input: tokenAnalysis?.input?.total || 0, output: 0 },
        duration,
        questionsGenerated: 0,
        averageQuality: 0,
        success: false,
        errorMessage: err.message,
        model: config.model || "gemini-2.0-flash",
        estimatedCost: tokenAnalysis?.cost?.estimated || 0,
      });
      setStatus("Error");
      showMessage(`Error: ${err.message}`, TOAST_DURATION.EXTENDED);
    } finally {
      setIsGenerating(false);
    }
  }, [
    config,
    effectiveApiKey,
    isApiReady,
    isTargetMet,
    showMessage,
    setStatus,
    setShowNameModal,
    setShowApiError,
    setIsGenerating,
    handleAutoCritique,
    handlePerformGeneration,
    prepareGenerationContext,
  ]);

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

  const handleVariate = useCallback(
    async (q) => {
      if (!isApiReady) {
        showMessage("API key required.", TOAST_DURATION.LONG);
        return;
      }

      setIsProcessing(true);
      setStatus("Creating improved variations...");

      // Build context-aware prompt that leverages critique feedback
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

  return {
    isGenerating,
    handleGenerate,
    handleExplain,
    handleVariate,
    handlePerformGeneration,
    handleAutoCritique,
  };
};
