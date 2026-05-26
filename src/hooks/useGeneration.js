import { useState } from "react";
import { useQuestionTranslation } from "./generation/useQuestionTranslation";
import { useQuestionCritique } from "./generation/useQuestionCritique";
import { useQuestionGenerator } from "./generation/useQuestionGenerator";

/**
 * Main hook for handling all AI-related generation logic.
 * Orchestrates specialized sub-hooks for translation, critique, and generation.
 *
 * Note on ordering: useQuestionCritique is constructed first so its
 * handleAutoCritique can be passed into useQuestionGenerator, which lets
 * the post-generation auto-critique chain stay intact without
 * useQuestionGenerator needing to know about critique internals.
 */
export const useGeneration = (
  config,
  setConfig,
  effectiveApiKey,
  isApiReady,
  isTargetMet,
  maxBatchSize,
  getFileContext,
  checkAndStoreQuestions,
  addQuestionsToState,
  updateQuestionInState,
  updateAllVariantsInState,
  handleLanguageSwitch,
  showMessage,
  setStatus,
  setShowNameModal,
  setShowApiError,
  setShowHistory,
  translationMap,
  allQuestionsMap,
  onRefresh
) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Critique sub-hook (constructed first so handleAutoCritique can be
  // wired into the generator)
  const {
    handleCritique,
    handleApplyRewrite,
    handleAutoCritique,
    handleExplain,
    handleVariate,
  } = useQuestionCritique({
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
  });

  // 2. Generation sub-hook
  const { isGenerating, handleGenerate } = useQuestionGenerator({
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
  });

  // 3. Translation sub-hook
  const {
    handleTranslateSingle,
    handleBulkTranslateMissing,
    translationProgress,
  } = useQuestionTranslation({
    effectiveApiKey,
    isApiReady,
    showMessage,
    setStatus,
    setIsProcessing,
    checkAndStoreQuestions,
    addQuestionsToState,
    updateQuestionInState,
    handleLanguageSwitch,
    translationMap,
    allQuestionsMap,
    setShowHistory,
    onRefresh,
  });

  return {
    isGenerating,
    isProcessing,
    translationProgress,
    handleGenerate,
    handleTranslateSingle,
    handleExplain,
    handleVariate,
    handleCritique,
    handleApplyRewrite,
    handleBulkTranslateMissing,
  };
};
