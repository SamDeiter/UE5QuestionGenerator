import { useState } from "react";
import { useQuestionTranslation } from "./generation/useQuestionTranslation";
import { useQuestionCritique } from "./generation/useQuestionCritique";
import { useQuestionGenerator } from "./generation/useQuestionGenerator";

/**
 * Main hook for handling all AI-related generation logic.
 * Orchestrates specialized sub-hooks for translation, critique, and generation.
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
  allQuestionsMap
) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Generation sub-hook
  const { isGenerating, handleGenerate, handleExplain, handleVariate } =
    useQuestionGenerator({
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
    });

  // 2. Translation sub-hook
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
  });

  // 3. Critique sub-hook
  const { handleCritique, handleApplyRewrite } = useQuestionCritique({
    effectiveApiKey,
    isApiReady,
    showMessage,
    setStatus,
    setIsProcessing,
    updateQuestionInState,
    updateAllVariantsInState,
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
