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
import { useModalState } from "./hooks/useModalState";
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
import { useConflictResolution } from "./hooks/useConflictResolution";
import { useUrlModeSync } from "./hooks/useUrlModeSync";
import { APP_MODES } from "./utils/constants";
// import { FullPageSpinner as LoadingSpinner } from "./components/LoadingSpinner";
import LandingPage from "./components/LandingPage";
import MetricsDashboard from "./components/MetricsDashboard";

const AuthenticatedApp = ({
  user,
  authLoading,
  isAdmin,
  userRole,
  // isRegistered,
  // markAsRegistered,
  customTags,
  handleSaveCustomTags,
  showMessage,
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
  showNameModal,
  setShowNameModal,
  showGenSettings,
  setShowGenSettings,
  setShowApiError,
  batchSizeWarning,
  showSettings,
  setShowSettings,
  showApiKey,
  setShowApiKey,
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
  showTerms,
  setShowTerms,
  showAgeGate,
  setShowAgeGate,
  setTermsAccepted,
}) => {
  // 3. Core Domain Hooks
  const { globalStats } = useGlobalStats();
  const { categoryStats } = useCategoryStats(config.discipline);
  const {
    questions,
    historicalQuestions,
    databaseQuestions,
    allQuestionsMap,
    translationMap,
    unifiedQuestions,
    approvedCounts,
    approvedCount,
    totalApproved,
    overallPercentage,
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
  } = useQuestionManager(config, showMessage, categoryStats, globalStats);

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
  const {
    searchTerm,
    setSearchTerm,
    filterMode,
    setFilterMode,
    showHistory,
    setShowHistory,
    filterByCreator,
    setFilterByCreator,
    filterTags,
    setFilterTags,
    filterScoreTier,
    setFilterScoreTier,
    filterByReviewer,
    setFilterByReviewer,
    currentReviewIndex,
    setCurrentReviewIndex,
    sortBy,
    setSortBy,
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
    allQuestionsMap
  );

  const {
    setShowExportMenu,
    showBulkExportModal,
    setShowBulkExportModal,
    showAnalytics,
    setShowAnalytics,
    showAdvancedConfig,
    setShowAdvancedConfig,
    showDangerZone,
    setShowDangerZone,
    showApiKeyModal,
    setShowApiKeyModal,
  } = useModalState();

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
    replaceQuestions
  );

  const { isInitialLoading } = useAutoLoad({
    user,
    authLoading,
    handleLoadFromFirestore,
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

  const handleResolveConflict = useConflictResolution({
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

  const totalPendingQuestions = usePendingCount(allQuestionsMap);

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

  const { handleManualUpdate, handleSelectCategory, handleSaveApiKey } =
    useAppHandlers({
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
    config,
    handleChange,
    allQuestionsMap,
    approvedCounts,
    overallPercentage,
    totalApproved,
    isTargetMet,
    maxBatchSize,
    batchSizeWarning,
    handleGenerate,
    isGenerating,
    isApiReady,
    handleBulkTranslateMissing,
    isProcessing,
    setShowSettings,
    handleSelectCategory,
    customTags,
    status,
    showMessage,
    isAdmin,
  });

  const toolbarProps = useToolbarProps({
    appMode,
    contextCounts,
    filterMode,
    setFilterMode,
    filterByCreator,
    setFilterByCreator,
    filterTags,
    setFilterTags,
    filterScoreTier,
    setFilterScoreTier,
    filterByReviewer,
    setFilterByReviewer,
    uniqueReviewers,
    customTags,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    isProcessing,
    status,
    isAuthReady,
    config,
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
    currentReviewIndex,
    translationMap,
    filterByCreator,
    filteredQuestions,
    questions,
    status,
    filterMode,
    sortBy,
    searchTerm,
    showHistory,
    user,
    userRole,
    isInitialLoading,
  });

  const globalModalsVisibility = useGlobalModalsVisibility({
    showNameModal,
    showClearModal,
    showBulkExportModal,
    showSettings,
    showAnalytics,
    showDangerZone,
    showApiKeyModal,
    showTerms,
    showAgeGate,
    tutorialActive,
    deleteConfirmId,
    showAdvancedConfig,
    showApiKey,
  });

  const globalModalsState = useGlobalModalsState({
    config,
    isProcessing,
    status,
    translationProgress,
    allQuestionsMap,
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
    setShowTerms,
    setTermsAccepted,
    setShowAgeGate,
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

      {/* Dashboard Metrics (only shown in database mode) */}
      {appMode === APP_MODES.DATABASE && !showAnalytics && !showDangerZone && (
        <MetricsDashboard
          questions={unifiedQuestions}
          globalStats={globalStats}
        />
      )}

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
          sidebarProps={sidebarProps}
          handleModeSelect={handleModeSelect}
          handleViewDatabase={handleViewDatabase}
          pendingCount={totalPendingQuestions}
          toolbarProps={toolbarProps}
          showHistory={showHistory}
          uniqueFilteredQuestions={uniqueFilteredQuestions}
          questions={questions}
          status={status}
          databaseQuestions={databaseQuestions}
          config={config}
          isProcessing={isProcessing}
          allQuestionsMap={allQuestionsMap}
          viewRouterHandlers={viewRouterHandlers}
          viewRouterState={viewRouterState}
          viewRouterSetters={{
            setCurrentReviewIndex,
            setFilterByCreator,
            showMessage,
          }}
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
