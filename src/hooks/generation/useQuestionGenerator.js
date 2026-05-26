import { useState, useCallback } from "react";
import { generateContentSecure as generateContent } from "../../services/geminiSecure";
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
  AI_CONFIG,
} from "../../utils/constants";
import {
  calculateCoverageGaps,
  enrichGeneratedQuestions,
  filterForbiddenSources,
  verifyAndProcessQuestions,
} from "../../utils/generationUtils";
import { TAGS_BY_DISCIPLINE } from "../../utils/tagTaxonomy";

/**
 * Hook that owns the question-generation engine. Critique / explain /
 * variate live in useQuestionCritique; useGeneration plumbs
 * handleAutoCritique back in here so handleGenerate can chain it.
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
  handleAutoCritique,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

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
        model: config.model || AI_CONFIG.DEFAULT_MODEL,
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
      config.model || AI_CONFIG.DEFAULT_MODEL
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
        model: config.model || AI_CONFIG.DEFAULT_MODEL,
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

  return {
    isGenerating,
    handleGenerate,
    handlePerformGeneration,
  };
};
