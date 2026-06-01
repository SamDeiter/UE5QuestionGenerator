import { useMemo, useCallback } from "react";
import { useAppConfig } from "./useAppConfig";

/**
 * useGlobalModalsVisibility — visibility flags NOT yet in ModalContext.
 *
 * After the ModalContext migration, most modal booleans live in context
 * and are read directly by GlobalModals via useModals(). The ones that
 * remain here are owned by other hooks (useQuestionManager owns
 * showClearModal + deleteConfirmId; useTutorial owns tutorialActive)
 * and still need to be plumbed through.
 */
export function useGlobalModalsVisibility({
  showClearModal,
  tutorialActive,
  deleteConfirmId,
}) {
  return useMemo(
    () => ({
      showClearModal,
      tutorialActive,
      deleteConfirmId,
    }),
    [showClearModal, tutorialActive, deleteConfirmId]
  );
}

/**
 * Hook to memoize GlobalModals state props
 *
 * Centralizes all state needed by global modals to improve
 * code organization and prevent unnecessary re-renders.
 *
 * @param {Object} params - Modal state values
 * @returns {Object} - Memoized state props object
 */
export function useGlobalModalsState({
  isProcessing,
  status,
  translationProgress,
  appMode,
  currentStep,
  tutorialSteps,
  activeScenario,
  approvedCount,
  questionsLength,
  isApiReady,
  customTags,
  isAdmin,
}) {
  return useMemo(
    () => ({
      isProcessing,
      status,
      translationProgress,
      appMode,
      currentStep,
      tutorialSteps,
      activeScenario,
      metrics: {
        totalApproved: approvedCount,
        totalQuestions: questionsLength,
      },
      isApiReady,
      customTags,
      isAdmin,
    }),
    [
      isProcessing,
      status,
      translationProgress,
      appMode,
      currentStep,
      tutorialSteps,
      activeScenario,
      approvedCount,
      questionsLength,
      isApiReady,
      customTags,
      isAdmin,
    ]
  );
}

/**
 * Hook to memoize GlobalModals handlers props
 *
 * Centralizes all handlers for global modals to improve
 * code organization and prevent unnecessary re-renders.
 *
 * @param {Object} params - Modal handler functions and setters
 * @returns {Object} - Memoized handlers props object
 */
export function useGlobalModalsHandlers({
  handleNameSave,
  handleDeleteAllQuestions,
  handleBulkExport,
  confirmDelete,
  setDeleteConfirmId,
  setShowBulkExportModal,
  setShowSettings,
  setShowAnalytics,
  setShowDangerZone,
  setShowApiKeyModal,
  handleChange,
  handleSaveApiKey,
  setShowClearModal,
  handleTutorialNext,
  handleTutorialPrev,
  handleTutorialSkip,
  handleTutorialComplete,
  setConfig,
  config,
  fileInputRef,
  handleFileChange,
  setShowAdvancedConfig,
  setShowApiKey,
  handleDetectTopics,
  handleSaveCustomTags,
}) {
  // Memoize close handlers
  const onCloseBulkExport = useCallback(
    () => setShowBulkExportModal(false),
    [setShowBulkExportModal]
  );
  const onCloseSettings = useCallback(
    () => setShowSettings(false),
    [setShowSettings]
  );
  const onCloseAnalytics = useCallback(
    () => setShowAnalytics(false),
    [setShowAnalytics]
  );
  const onCloseDangerZone = useCallback(
    () => setShowDangerZone(false),
    [setShowDangerZone]
  );
  const onCloseApiKey = useCallback(
    () => setShowApiKeyModal(false),
    [setShowApiKeyModal]
  );
  const onResetSettings = useCallback(
    () => setConfig({ ...config, ...useAppConfig.defaultConfig }),
    [setConfig, config]
  );
  const onHardReset = useCallback(() => {
    localStorage.clear();
    window.location.reload();
  }, []);

  return useMemo(
    () => ({
      handleNameSave,
      handleDeleteAllQuestions,
      handleBulkExport,
      confirmDelete,
      setDeleteConfirmId,
      onCloseBulkExport,
      onCloseSettings,
      onCloseAnalytics,
      onCloseDangerZone,
      onCloseApiKey,
      handleChange,
      handleSaveApiKey,
      setShowClearModal,
      handleTutorialNext,
      handleTutorialPrev,
      handleTutorialSkip,
      handleTutorialComplete,
      onResetSettings,
      onHardReset,
      fileInputRef,
      handleFileChange,
      setShowAdvancedConfig,
      setShowApiKey,
      handleDetectTopics,
      onSaveCustomTags: handleSaveCustomTags,
      window: window,
    }),
    [
      handleNameSave,
      handleDeleteAllQuestions,
      handleBulkExport,
      confirmDelete,
      setDeleteConfirmId,
      onCloseBulkExport,
      onCloseSettings,
      onCloseAnalytics,
      onCloseDangerZone,
      onCloseApiKey,
      handleChange,
      handleSaveApiKey,
      setShowClearModal,
      handleTutorialNext,
      handleTutorialPrev,
      handleTutorialSkip,
      handleTutorialComplete,
      onResetSettings,
      onHardReset,
      fileInputRef,
      handleFileChange,
      setShowAdvancedConfig,
      setShowApiKey,
      handleDetectTopics,
      handleSaveCustomTags,
    ]
  );
}
