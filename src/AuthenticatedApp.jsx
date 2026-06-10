import { useState, Suspense } from "react";
import MainLayout from "./components/MainLayout";
import GlobalModals from "./components/GlobalModals";
import CrashRecoveryPrompt from "./components/CrashRecoveryPrompt";
import ConflictModal from "./components/ConflictModal";

// Hooks
import { useQuestionManager } from "./hooks/useQuestionManager";
import { useGeneration } from "./hooks/useGeneration";
import { useExport } from "./hooks/useExport";
import { useReviewActions } from "./hooks/useReviewActions";
import { useCategoryStats } from "./hooks/useCategoryStats";
import useGlobalStats from "./hooks/useGlobalStats";
import { useDatabaseActions } from "./hooks/useDatabaseActions";
import { useFiltering } from "./hooks/useFiltering";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useAppHandlers } from "./hooks/useAppHandlers";
import { useMigrations } from "./hooks/useMigrations";
import { usePendingCount } from "./hooks/usePendingCount";
import { useNavigationAfterLanguageSwitch } from "./hooks/useNavigationAfterLanguageSwitch";
import { useAgentLifecycle } from "./hooks/useAgentLifecycle";
import { useCrashRecovery } from "./hooks/useCrashRecovery";
import { useViewRouterHandlers } from "./hooks/useViewRouterHandlers";
import { useViewRouterState } from "./hooks/useViewRouterState";
import { useSidebarProps } from "./hooks/useSidebarProps";
import { useToolbarProps } from "./hooks/useToolbarProps";
import {
  useGlobalModalsVisibility,
  useGlobalModalsState,
  useGlobalModalsHandlers,
} from "./hooks/useGlobalModalsProps";
import { useNavigation } from "./hooks/useNavigation";
import { useAutoLoad } from "./hooks/useAutoLoad";
import { useFileHandler } from "./hooks/useFileHandler";
import { useConflictResolutionModal } from "./hooks/useConflictResolutionModal";
import { useUrlModeSync } from "./hooks/useUrlModeSync";
import { useMessage } from "./contexts/MessageContext";
import { useModals } from "./contexts/ModalContext";
import { APP_MODES } from "./utils/constants";
// import { FullPageSpinner as LoadingSpinner } from "./components/LoadingSpinner";
import LandingPage from "./components/LandingPage";

const AuthenticatedApp = ({
  user,
  authLoading,
  isAdmin,
  userRole,
  // isRegistered,
  // markAsRegistered,
  customTags,
  handleSaveCustomTags,
  setStatus,
  status,
  appMode,
  setAppMode,
  config,
  setConfig,
  isAuthReady,
  isApiReady,
  effectiveApiKey,
  apiKeyStatus,
  setShowApiError,
  handleChange,
  handleNameSave,
  handleLanguageSwitch,
  pendingNavigationUniqueId,
  setPendingNavigationUniqueId,
  handleGoHome,
  onStartTutorial,
  tutorialActive,
  currentStep,
  tutorialSteps,
  activeScenario,
  handleTutorialNext,
  handleTutorialPrev,
  handleTutorialSkip,
  handleTutorialComplete,
  // handleRestartTutorial,
}) => {
  const { showMessage } = useMessage();
  const {
    setShowNameModal,
    showGenSettings,
    setShowGenSettings,
    setShowSettings,
    setShowApiKey,
    setShowExportMenu,
    setShowBulkExportModal,
    setShowAnalytics,
    setShowAdvancedConfig,
    setShowDangerZone,
    setShowApiKeyModal,
  } = useModals();

  // 3. Core Domain Hooks
  // Owned here (not in useAutoLoad) so useQuestionManager — which runs before
  // useAutoLoad in this render — can gate its realtime listener on it.
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { globalStats } = useGlobalStats();
  const { categoryStats } = useCategoryStats(config.discipline);
  const {
    questions,
    historicalQuestions,
    databaseQuestions,
    allQuestionsMap,
    translationMap,
    unifiedQuestions,
    allLanguageQuestions,
    approvedCount,
    isTargetMet,
    maxBatchSize,
    deleteConfirmId,
    setDeleteConfirmId,
    showClearModal,
    setShowClearModal,
    handleDelete,
    confirmDelete,
    handleDeleteAllQuestions,
    addQuestionsToState,
    updateQuestionInState,
    updateAllVariantsInState,
    handleUpdateStatus,
    checkAndStoreQuestions,
    handleUpdateQuestion,
    conflictData,
    showConflictModal,
    setShowConflictModal,
    replaceQuestions,
    bulkDeleteQuestions,
    moveQuestion,
  } = useQuestionManager(
    config,
    showMessage,
    categoryStats,
    globalStats,
    isInitialLoading
  );

  // 2. Lifecycle & Data Loading
  useAgentLifecycle({ user, authLoading });

  useMigrations({
    user,
    authLoading,
    isAdmin,
    showMessage,
    handleLoadFromFirestore: () => {},
    setConfig,
  });

  const [isProcessing] = useState(false);

  // 3. File Handling
  const { fileInputRef, handleFileChange, getFileContext, handleDetectTopics } =
    useFileHandler(
      config,
      setConfig,
      addQuestionsToState,
      showMessage,
      setStatus,
      isApiReady,
      effectiveApiKey
    );

  // 4. Filtering & Logic Hooks
  // Filter state the toolbar owns (search/tags/score/reviewer/sort) is now
  // read directly from the store by ContextToolbar, so it's no longer
  // destructured here — only the values still consumed by AuthenticatedApp
  // (routing, navigation, url sync) remain.
  const {
    setFilterMode,
    showHistory,
    setShowHistory,
    setCurrentReviewIndex,
    contextCounts,
    filteredQuestions,
    uniqueFilteredQuestions,
    uniqueReviewers,
  } = useFiltering({
    questions: unifiedQuestions,
    historicalQuestions: [],
    config,
    appMode,
    allQuestionsMap,
  });

  const {
    handleExportToSheets,
    handleLoadFromSheets,
    handleLoadFromFirestore,
    handleBulkExport,
  } = useExport(
    config,
    questions,
    historicalQuestions,
    uniqueFilteredQuestions,
    allQuestionsMap,
    showHistory,
    showMessage,
    setStatus,
    () => {},
    setAppMode,
    setShowExportMenu,
    setShowBulkExportModal,
    replaceQuestions,
    isAdmin
  );

  const {
    isGenerating,
    translationProgress,
    handleGenerate,
    handleTranslateSingle,
    handleExplain,
    handleVariate,
    handleCritique,
    handleApplyRewrite,
    handleBulkTranslateMissing,
  } = useGeneration(
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
    handleLoadFromFirestore
  );

  useAutoLoad({
    user,
    authLoading,
    handleLoadFromFirestore,
    setIsInitialLoading,
  });

  const {
    handleClearPending,
    handleBulkAcceptHighScores,
    handleBulkCritiqueAll,
    handleTrimExcess,
    handleAutoTagAll,
  } = useReviewActions({
    uniqueFilteredQuestions,
    allQuestions: unifiedQuestions,
    handleUpdateStatus,
    handleUpdateQuestion,
    handleCritique,
    showMessage,
    bulkDeleteQuestions,
  });

  const { handleUpdateDatabaseQuestion, handleKickBackToReview } =
    useDatabaseActions({
      showMessage,
      handleLoadFromFirestore,
      moveQuestion,
      updateQuestionInState,
    });

  const { handleModeSelect, handleViewDatabase } = useNavigation({
    setAppMode,
    setShowExportMenu,
    setShowHistory,
    setFilterMode,
    setCurrentReviewIndex,
    handleLoadFromFirestore,
  });

  useNavigationAfterLanguageSwitch({
    pendingNavigationUniqueId,
    uniqueFilteredQuestions,
    setCurrentReviewIndex,
    setPendingNavigationUniqueId,
  });

  const handleResolveConflict = useConflictResolutionModal({
    conflictData,
    handleUpdateQuestion,
    showMessage,
    setShowConflictModal,
    user,
  });

  useUrlModeSync({
    appMode,
    showHistory,
    setShowHistory,
    setFilterMode,
    setCurrentReviewIndex,
  });

  const totalPendingQuestions = usePendingCount(
    allQuestionsMap,
    config.discipline
  );

  const {
    showRecoveryPrompt,
    recoveryData,
    isRecovering,
    handleRecover,
    dismissRecovery,
  } = useCrashRecovery(questions, addQuestionsToState, showMessage);

  useKeyboardShortcuts({
    appMode,
    isGenerating,
    isTargetMet,
    isApiReady,
    maxBatchSize,
    handleGenerate,
    config,
    handleExportToSheets,
    handleBulkExport,
    setShowBulkExportModal,
    uniqueFilteredQuestionsLength: uniqueFilteredQuestions.length,
    setCurrentReviewIndex,
    isAdmin,
  });

  const { handleManualUpdate, handleSaveApiKey } = useAppHandlers({
    updateQuestionInState,
    setConfig,
    handleChange,
    setShowApiKeyModal,
  });

  const viewRouterHandlers = useViewRouterHandlers({
    handleLoadFromSheets,
    handleLoadFromFirestore,
    handleUpdateDatabaseQuestion,
    handleKickBackToReview,
    handleUpdateStatus,
    handleExplain,
    handleVariate,
    handleCritique,
    handleApplyRewrite,
    handleTranslateSingle,
    handleLanguageSwitch,
    handleDelete,
    handleManualUpdate,
    handleTrimExcess,
    handleUpdateQuestion,
    userRole,
  });

  const sidebarProps = useSidebarProps({
    showGenSettings,
    setShowGenSettings,
    handleChange,
    isTargetMet,
    maxBatchSize,
    handleGenerate,
    isGenerating,
    isApiReady,
    handleBulkTranslateMissing,
    isProcessing,
    customTags,
    status,
    isAdmin,
  });

  const toolbarProps = useToolbarProps({
    appMode,
    contextCounts,
    uniqueReviewers,
    customTags,
    isProcessing,
    status,
    isAuthReady,
    handleLoadFromSheets,
    handleLoadFromFirestore,
    setShowBulkExportModal,
    handleClearPending,
    handleBulkAcceptHighScores,
    handleBulkCritiqueAll,
    handleTrimExcess,
    handleAutoTagAll,
    effectiveApiKey,
    handleChange,
  });

  const viewRouterState = useViewRouterState({
    filteredQuestions,
    status,
    user,
    userRole,
    isInitialLoading,
  });

  const globalModalsVisibility = useGlobalModalsVisibility({
    showClearModal,
    tutorialActive,
    deleteConfirmId,
  });

  const globalModalsState = useGlobalModalsState({
    isProcessing,
    status,
    translationProgress,
    appMode,
    currentStep,
    tutorialSteps,
    activeScenario,
    approvedCount,
    questionsLength: questions.length,
    isApiReady,
    customTags,
    isAdmin,
  });

  const globalModalsHandlers = useGlobalModalsHandlers({
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
  });

  return (
    <>
      <Suspense fallback={null}>
        <CrashRecoveryPrompt
          isOpen={showRecoveryPrompt}
          recoveryData={recoveryData}
          isRecovering={isRecovering}
          onRecover={handleRecover}
          onDismiss={dismissRecovery}
        />
        <GlobalModals
          visibility={globalModalsVisibility}
          state={globalModalsState}
          handlers={globalModalsHandlers}
        />
      </Suspense>

      {appMode === APP_MODES.LANDING ? (
        <LandingPage
          onSelectMode={handleModeSelect}
          apiKeyStatus={apiKeyStatus}
          isCloudReady={isAuthReady}
          onOpenSettings={() => setShowApiKeyModal(true)}
          isAdmin={isAdmin}
          onStartTutorial={() => onStartTutorial("welcome")}
        />
      ) : (
        <MainLayout
          appMode={appMode}
          setAppMode={setAppMode}
          effectiveApiKey={effectiveApiKey}
          isAdmin={isAdmin}
          userRole={userRole}
          sidebarProps={sidebarProps}
          handleModeSelect={handleModeSelect}
          handleViewDatabase={handleViewDatabase}
          pendingCount={totalPendingQuestions}
          isInitialLoading={isInitialLoading}
          toolbarProps={toolbarProps}
          showHistory={showHistory}
          uniqueFilteredQuestions={uniqueFilteredQuestions}
          questions={questions}
          status={status}
          databaseQuestions={databaseQuestions}
          isProcessing={isProcessing}
          allQuestionsMap={allQuestionsMap}
          allLanguageQuestions={allLanguageQuestions}
          viewRouterHandlers={viewRouterHandlers}
          viewRouterState={viewRouterState}
          handleGoHome={handleGoHome}
          onStartTutorial={onStartTutorial}
          activeScenario={activeScenario}
        />
      )}

      {showConflictModal && conflictData && (
        <ConflictModal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
          conflictData={conflictData}
          onResolve={handleResolveConflict}
        />
      )}
    </>
  );
};

export default AuthenticatedApp;
