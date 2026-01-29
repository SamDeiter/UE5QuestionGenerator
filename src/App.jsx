// ============================================================================
// IMPORTS
// ============================================================================

// React core hooks
import { useState, lazy, Suspense } from "react";

// Critical components - keep eager loading (needed immediately)
import Header from "./components/Header";
import AppBanners from "./components/AppBanners";
import ToastContainer from "./components/ToastContainer";
import Footer from "./components/Footer";
import SignIn from "./components/SignIn";
import InviteSignUp from "./components/InviteSignUp";
// ApiKeyModal moved to GlobalModals - lazy loaded when needed
import ConflictModal from "./components/ConflictModal";
import { getInviteFromUrl } from "./services/inviteService";

// Lazy load heavy components (loaded on-demand)
const LandingPage = lazy(() => import("./components/LandingPage"));
const MainLayout = lazy(() => import("./components/MainLayout"));
const GlobalModals = lazy(() => import("./components/GlobalModals"));
const CrashRecoveryPrompt = lazy(
  () => import("./components/CrashRecoveryPrompt")
);

// Custom Hooks
import { useAppConfig } from "./hooks/useAppConfig";
import { useQuestionManager } from "./hooks/useQuestionManager";
import { useFileHandler } from "./hooks/useFileHandler";
import { useGeneration } from "./hooks/useGeneration";
import { useExport } from "./hooks/useExport";
import { useCrashRecovery } from "./hooks/useCrashRecovery";
import { useTutorial } from "./hooks/useTutorial";
import { useReviewActions } from "./hooks/useReviewActions";
import { useDatabaseActions } from "./hooks/useDatabaseActions";
import { useNavigation } from "./hooks/useNavigation";
import { useFiltering } from "./hooks/useFiltering";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useToast } from "./hooks/useToast";
// useBulkSelection removed - bulk selection feature no longer used
import { useAuth } from "./hooks/useAuth";
import { useModalState } from "./hooks/useModalState";
import { useAppHandlers } from "./hooks/useAppHandlers";
import { useMigrations } from "./hooks/useMigrations";
import { usePendingCount } from "./hooks/usePendingCount";
import { useNavigationAfterLanguageSwitch } from "./hooks/useNavigationAfterLanguageSwitch";
import { useAgentLifecycle } from "./hooks/useAgentLifecycle";
import { useTokenUsage } from "./hooks/useTokenUsage";
import { useAutoLoad } from "./hooks/useAutoLoad";
import { useAuthRefresh } from "./hooks/useAuthRefresh";
import { useAuthHealthCheck } from "./hooks/useAuthHealthCheck";
import { useUrlModeSync } from "./hooks/useUrlModeSync";
import { useGlobalToastSubscription } from "./hooks/useGlobalToastSubscription";
import { useViewRouterHandlers } from "./hooks/useViewRouterHandlers";
import { useConflictResolution } from "./hooks/useConflictResolution";
import { useSidebarProps } from "./hooks/useSidebarProps";
import { useToolbarProps } from "./hooks/useToolbarProps";
import { useViewRouterState } from "./hooks/useViewRouterState";
import {
  useGlobalModalsVisibility,
  useGlobalModalsState,
  useGlobalModalsHandlers,
} from "./hooks/useGlobalModalsProps";

// Utilities
import { APP_MODES } from "./utils/constants";
import { FullPageSpinner as LoadingSpinner } from "./components/LoadingSpinner";
import { logger } from "./utils/logger";

const App = () => {
  // ========================================================================
  // HOOKS - Toast Notifications
  // ========================================================================
  const { toasts, removeToast, showMessage } = useToast();

  // ========================================================================
  // HOOKS - Auth, Custom Tags, and Compliance (extracted to useAuth)
  // ========================================================================
  const {
    user,
    authLoading,
    isAdmin,
    userRole,
    isRegistered: _isRegistered,
    registrationLoading,
    markAsRegistered,
    customTags,
    handleSaveCustomTags,
    // tokenUsage available from useAuth but not currently needed
    showTerms,
    setShowTerms,
    showAgeGate,
    setShowAgeGate,
    setTermsAccepted,
    permissionError,
    blockedByExtension,
  } = useAuth(showMessage);

  // Global toast subscription (extracted to hook)
  useGlobalToastSubscription(showMessage);

  // ... (rest of the file)

  // 0. Tutorial System
  const {
    tutorialActive,
    currentStep,
    tutorialSteps,
    activeScenario,
    handleTutorialNext,
    handleTutorialPrev,
    handleTutorialSkip,
    handleTutorialComplete,
    handleRestartTutorial,
    handleStartTutorial,
  } = useTutorial(showMessage, undefined, {
    // FUTURE: Wire up actual panel/modal setters when implementing tutorial actions
    // setShowAdvancedConfig: (open) => { /* implement */ },
    // setShowCritiqueModal: (open) => { /* implement */ },
    // setActiveAnalyticsTab: (tab) => { /* implement */ },
  });

  // ========================================================================
  // CONCURRENT EDITING AGENTS - Initialize once when user is authenticated
  // ========================================================================
  useAgentLifecycle({ user, authLoading });

  // ========================================================================
  // AUTH HEALTH CHECK - Run once on authenticated user mount (extracted to hook)
  // ========================================================================
  const authHealthStatus = useAuthHealthCheck({ user, authLoading });

  // ========================================================================
  // AUTOMATIC TOKEN REFRESH - Refresh auth token every 30 minutes
  // ========================================================================
  useAuthRefresh({ user, authLoading, showMessage });

  // ========================================================================
  // HOOKS - State Management
  // ========================================================================

  // 1. App Configuration & UI State
  const {
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
  } = useAppConfig({ user });

  // Run all migrations (extracted to useMigrations hook)
  useMigrations({
    user,
    authLoading,
    isAdmin,
    showMessage,
    handleLoadFromFirestore: () => {}, // Will be set after useExport is called
    setConfig,
  });

  // 2. Question Data Management
  const {
    questions,
    historicalQuestions,
    databaseQuestions,
    allQuestionsMap,
    translationMap,
    addQuestionsToState,
    updateQuestionInState,
    updateAllVariantsInState,
    handleUpdateStatus,
    approvedCounts,
    approvedCount,

    pendingCount: totalApproved,
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
    checkAndStoreQuestions,
    unifiedQuestions,
    handleUpdateQuestion, // Persistent update handler
    // Concurrent editing conflict resolution
    conflictData,
    showConflictModal,
    setShowConflictModal,
    replaceQuestions,
    bulkDeleteQuestions,
    moveQuestion,
  } = useQuestionManager(config, showMessage);

  // Conflict resolution handler (extracted to hook)
  const handleResolveConflict = useConflictResolution({
    conflictData,
    handleUpdateQuestion,
    showMessage,
    setShowConflictModal,
    user,
  });

  // Calculate token usage from Firestore using server-side aggregation (PHASE 2.1)
  // Uses Firestore getAggregateFromServer for 99.98% read reduction (1 read vs 5000+)
  const firestoreTokenUsage = useTokenUsage(user?.uid, databaseQuestions);

  // 2.5. Crash Recovery - detect and restore from cloud backup
  const {
    showRecoveryPrompt,
    recoveryData,
    isRecovering,
    handleRecover,
    dismissRecovery,
  } = useCrashRecovery(questions, addQuestionsToState, showMessage);

  // 3. Status State (Shared)
  const [status, setStatus] = useState("");

  // 4. File Handling
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

  // 5. Filtering & Search (extracted to useFiltering hook)
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
    historicalQuestions: [], // We are using the unified list as source of truth
    config,
    appMode,
    allQuestionsMap,
  });

  // Language switch navigation (extracted to hook)
  useNavigationAfterLanguageSwitch({
    pendingNavigationUniqueId,
    uniqueFilteredQuestions,
    setCurrentReviewIndex,
    setPendingNavigationUniqueId,
  });

  // Calculate total PENDING questions for the Review badge (extracted to hook)
  const totalPendingQuestions = usePendingCount(allQuestionsMap);

  // 6. Generation & Translation Logic
  const {
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

  // 7. Modal State (extracted to useModalState hook)
  const {
    // showExportMenu - intentionally unused, state managed via setShowExportMenu
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

  // 8. Export Logic (must come before Navigation since Navigation depends on handleLoadFromFirestore)
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
  // Auto-load database questions on startup for difficulty distribution chart
  const { isInitialLoading } = useAutoLoad({
    user,
    authLoading,
    handleLoadFromFirestore,
  });

  // Migrations handled by useMigrations hook (called earlier in component)

  // 9. Review Actions (bulk operations)
  const {
    handleClearPending,
    handleBulkAcceptHighScores,
    handleBulkCritiqueAll,
    handleTrimExcess,
    handleAutoTagAll,
  } = useReviewActions({
    uniqueFilteredQuestions,
    allQuestions: unifiedQuestions, // Pass complete dataset for Trim accuracy
    handleUpdateStatus,
    handleUpdateQuestion, // Pass persistent handler
    handleCritique,
    showMessage,
    bulkDeleteQuestions,
  });

  // 10. Database Actions
  const { handleUpdateDatabaseQuestion, handleKickBackToReview } =
    useDatabaseActions({
      showMessage,
      handleLoadFromFirestore,
      moveQuestion,
      updateQuestionInState,
    });

  // 11. Navigation (depends on handleLoadFromFirestore from useExport)
  const { handleModeSelect, handleViewDatabase, handleGoHome } = useNavigation({
    setAppMode,
    setShowExportMenu,
    setShowHistory,
    setFilterMode,
    setCurrentReviewIndex,
    handleLoadFromFirestore,
  });

  // ========================================================================
  // INITIAL MODE SETUP - Handle URL parameters (extracted to hook)
  // ========================================================================
  useUrlModeSync({
    appMode,
    showHistory,
    setShowHistory,
    setFilterMode,
    setCurrentReviewIndex,
  });

  // Bulk selection feature removed

  // Keyboard Shortcuts (extracted to useKeyboardShortcuts hook)
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
    isAdmin, // Only admins can use export shortcuts (Ctrl+S, Ctrl+E)
  });

  // App Handlers (extracted to useAppHandlers hook)
  const { handleManualUpdate, handleSelectCategory, handleSaveApiKey } =
    useAppHandlers({
      updateQuestionInState,
      setConfig,
      handleChange,
      setShowApiKeyModal,
    });

  // Memoize viewRouterHandlers to prevent unnecessary re-renders (extracted to hook)
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

  // Memoize sidebarProps for MainLayout (extracted to hook)
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

  // Memoize toolbarProps for MainLayout (extracted to hook)
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

  // Memoize viewRouterState for MainLayout (extracted to hook)
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

  // Memoize GlobalModals visibility (extracted to hook)
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

  // Memoize GlobalModals state (extracted to hook)
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

  // Memoize GlobalModals handlers (extracted to hook)
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

  // Render - Loading state
  if (authLoading || registrationLoading) {
    return <LoadingSpinner />;
  }

  // Render - Not authenticated
  if (!user) {
    // Check if there's an invite code in URL - show invite signup
    const inviteCode = getInviteFromUrl();
    if (inviteCode) {
      return (
        <InviteSignUp
          onSuccess={(role) => {
            markAsRegistered(role);
          }}
        />
      );
    }
    return <SignIn />;
  }

  // User is authenticated - enforce registration check
  if (!_isRegistered) {
    // If not registered and not on an invite URL, show invite-only message or redirect to sign in
    return (
      <InviteSignUp
        onSuccess={(role) => {
          markAsRegistered(role);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 font-sans text-slate-200">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>
      <main id="main-content" className="flex flex-col flex-1 overflow-hidden">
        <Suspense fallback={null}>
          {/* Crash Recovery Prompt - highest priority */}
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

        <Header
          apiKeyStatus={apiKeyStatus}
          isCloudReady={isAuthReady}
          onHome={handleGoHome}
          creatorName={config.creatorName}
          appMode={appMode}
          tokenUsage={firestoreTokenUsage}
          onRestartTutorial={handleRestartTutorial}
          onStartTutorial={handleStartTutorial}
          isAdmin={isAdmin}
          user={user}
        />

        {/* Warning Banners - Registration & Permission Errors */}
        <AppBanners
          user={user}
          isRegistered={_isRegistered}
          registrationLoading={registrationLoading}
          permissionError={permissionError}
          blockedByExtension={blockedByExtension}
          authHealthStatus={authHealthStatus}
        />

        <Suspense fallback={<LoadingSpinner />}>
          {appMode === APP_MODES.LANDING ? (
            <LandingPage
              onSelectMode={handleModeSelect}
              apiKeyStatus={apiKeyStatus}
              isCloudReady={isAuthReady}
              onOpenSettings={() => {
                logger.log("🚀 Configure Now clicked!");
                setShowApiKeyModal(true);
              }}
              isAdmin={isAdmin}
              onStartTutorial={() => handleStartTutorial("welcome")}
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
              onStartTutorial={handleStartTutorial}
              activeScenario={activeScenario}
            />
          )}
        </Suspense>

        {/* API Key Modal - Simple popup for Configure Now button */}

        {/* Footer */}
        <Footer />

        {/* TOAST NOTIFICATIONS */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        {/* CONCURRENT EDITING CONFLICT MODAL */}
        {showConflictModal && conflictData && (
          <ConflictModal
            isOpen={showConflictModal}
            onClose={() => setShowConflictModal(false)}
            conflictData={conflictData}
            onResolve={handleResolveConflict}
          />
        )}

        {/* TUTORIAL OVERLAY */}

        {/* COMPLIANCE MODALS */}
      </main>
    </div>
  );
};

export default App;
// Force rebuild
