// ============================================================================
// IMPORTS
// ============================================================================

// React core hooks
import { useState } from 'react';
// UI Components

import LandingPage from './components/LandingPage';
import Header from './components/Header';
import ToastContainer from './components/ToastContainer';
import GlobalModals from './components/GlobalModals';
import MainLayout from './components/MainLayout';
import CrashRecoveryPrompt from './components/CrashRecoveryPrompt';
import SignIn from './components/SignIn';
import ApiKeyModal from './components/ApiKeyModal';

// Custom Hooks
import { useAppConfig } from './hooks/useAppConfig';
import { useQuestionManager } from './hooks/useQuestionManager';
import { useFileHandler } from './hooks/useFileHandler';
import { useGeneration } from './hooks/useGeneration';
import { useExport } from './hooks/useExport';
import { useCrashRecovery } from './hooks/useCrashRecovery';
import { useTutorial } from './hooks/useTutorial';
import { useReviewActions } from './hooks/useReviewActions';
import { useDatabaseActions } from './hooks/useDatabaseActions';
import { useNavigation } from './hooks/useNavigation';
import { useFiltering } from './hooks/useFiltering';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useToast } from './hooks/useToast';
import { useBulkSelection } from './hooks/useBulkSelection';
import { useAuth } from './hooks/useAuth';
import { useModalState } from './hooks/useModalState';
import { useAppHandlers } from './hooks/useAppHandlers';
// Utilities

// Simple loading spinner component for auth loading state
const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
);

const App = () => {
    // ========================================================================
    // HOOKS - Toast Notifications
    // ========================================================================
    const { toasts, addToast: _addToast, removeToast, showMessage } = useToast();
    
    // ========================================================================
    // HOOKS - Auth, Custom Tags, and Compliance (extracted to useAuth)
    // ========================================================================
    const {
        user,
        authLoading,
        customTags,
        setCustomTags: _setCustomTags,
        handleSaveCustomTags,
        tokenUsage,
        showTerms,
        setShowTerms,
        showAgeGate,
        setShowAgeGate,
        termsAccepted: _termsAccepted,
        setTermsAccepted
    } = useAuth(showMessage);

    // 0. Tutorial System
    const {
        tutorialActive,
        currentStep,
        tutorialSteps,
        handleTutorialNext,
        handleTutorialPrev,
        handleTutorialSkip,
        handleTutorialComplete,
        handleRestartTutorial
    } = useTutorial(showMessage);

    // ========================================================================
    // HOOKS - State Management
    // ========================================================================

    // 1. App Configuration & UI State
    const {
        appMode, setAppMode,
        config, setConfig,
        isAuthReady,
        isApiReady,
        effectiveApiKey,
        apiKeyStatus,
        showNameModal, setShowNameModal,
        showGenSettings, setShowGenSettings,
        setShowApiError,
        batchSizeWarning,
        showSettings, setShowSettings,
        showApiKey, setShowApiKey,
        handleChange,
        handleNameSave,
        handleLanguageSwitch
    } = useAppConfig();

    // 2. Question Data Management
    const {
        questions, setQuestions,
        historicalQuestions, setHistoricalQuestions,
        databaseQuestions, setDatabaseQuestions,
        allQuestionsMap,
        translationMap,
        addQuestionsToState,
        updateQuestionInState,
        handleUpdateStatus,
        approvedCounts,
        approvedCount,

        pendingCount,
        totalApproved,
        overallPercentage,
        isTargetMet,
        maxBatchSize,
        deleteConfirmId, setDeleteConfirmId,
        showClearModal, setShowClearModal,
        handleDelete,
        confirmDelete,
        handleDeleteAllQuestions,
        checkAndStoreQuestions
    } = useQuestionManager(config, showMessage);

    // 2.5. Crash Recovery - detect and restore from cloud backup
    const {
        showRecoveryPrompt,
        recoveryData,
        isRecovering,
        handleRecover,
        dismissRecovery
    } = useCrashRecovery(questions, addQuestionsToState, showMessage);

    // 3. Status State (Shared)
    const [status, setStatus] = useState('');

    // 4. File Handling
    const {
        _files, _setFiles,
        fileInputRef,
        _isDetecting,
        handleFileChange,
        _removeFile,
        getFileContext,
        handleDetectTopics
    } = useFileHandler(config, setConfig, addQuestionsToState, showMessage, setStatus, isApiReady, effectiveApiKey);

    // 5. Filtering & Search (extracted to useFiltering hook)
    const {
        searchTerm, setSearchTerm,
        filterMode, setFilterMode,
        showHistory, setShowHistory,
        filterByCreator, setFilterByCreator,
        filterTags, setFilterTags,
        currentReviewIndex, setCurrentReviewIndex,
        sortBy, setSortBy,
        contextFilteredQuestions: _contextFilteredQuestions,
        contextCounts,
        filteredQuestions,
        uniqueFilteredQuestions
    } = useFiltering({
        questions,
        historicalQuestions,
        config,
        appMode
    });

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
        handleBulkTranslateMissing
    } = useGeneration(
        config, setConfig, effectiveApiKey, isApiReady, isTargetMet, maxBatchSize,
        getFileContext, checkAndStoreQuestions, addQuestionsToState, updateQuestionInState,
        handleLanguageSwitch, showMessage, setStatus, setShowNameModal,
        setShowApiError, setShowHistory, translationMap, allQuestionsMap
    );

    // 7. Modal State (extracted to useModalState hook)
    const {
        showExportMenu: _showExportMenu,
        setShowExportMenu,
        showBulkExportModal,
        setShowBulkExportModal,
        showAnalytics,
        setShowAnalytics,
        dataMenuOpen: _dataMenuOpen,
        setDataMenuOpen: _setDataMenuOpen,
        dataMenuRef: _dataMenuRef,
        showAdvancedConfig,
        setShowAdvancedConfig,
        showDangerZone,
        setShowDangerZone,
        showApiKeyModal,
        setShowApiKeyModal
    } = useModalState();

    // 8. Export Logic (must come before Navigation since Navigation depends on handleLoadFromFirestore)
    const {
        handleExportToSheets,
        handleLoadFromSheets,
        handleLoadFromFirestore,
        handleBulkExport
    } = useExport(
        config, questions, historicalQuestions, uniqueFilteredQuestions, allQuestionsMap,
        showHistory, showMessage, setStatus, () => { },
        setDatabaseQuestions, setAppMode, setShowExportMenu, setShowBulkExportModal,
        setHistoricalQuestions
    );

    // 9. Review Actions (bulk operations)
    const {
        handleClearPending,
        handleBulkAcceptHighScores,
        handleBulkCritiqueAll
    } = useReviewActions({
        uniqueFilteredQuestions,
        setQuestions,
        handleUpdateStatus,
        handleCritique,
        showMessage
    });

    // 10. Database Actions
    const {
        handleUpdateDatabaseQuestion,
        handleKickBackToReview
    } = useDatabaseActions({
        setDatabaseQuestions,
        setHistoricalQuestions,
        showMessage
    });

    // 11. Navigation (depends on handleLoadFromFirestore from useExport)
    const {
        handleModeSelect,
        handleViewDatabase,
        handleGoHome
    } = useNavigation({
        setAppMode,
        setShowExportMenu,
        setShowHistory,
        setFilterMode,
        handleLoadFromFirestore
    });

    // Bulk selection (extracted to useBulkSelection hook)
    const {
        selectedIds,
        toggleSelection,
        clearSelection,
        selectAll,
        bulkUpdateStatus
    } = useBulkSelection({
        items: uniqueFilteredQuestions,
        handleUpdateStatus,
        showMessage
    });

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
        setCurrentReviewIndex
    });

    // App Handlers (extracted to useAppHandlers hook)
    const {
        handleManualUpdate,
        handleSelectCategory,
        handleSaveApiKey
    } = useAppHandlers({
        updateQuestionInState,
        setConfig,
        handleChange,
        setShowApiKeyModal
    });

    // Render
    if (authLoading) {
        return <LoadingSpinner />;
    }

    if (!user) {
        return <SignIn />;
    }

    if (appMode === 'landing') {
        return (
            <>
                <LandingPage
                    onSelectMode={handleModeSelect}
                    apiKeyStatus={apiKeyStatus}
                    isCloudReady={isAuthReady}
                    onOpenSettings={() => { console.log('🚀 Configure Now clicked!'); setShowApiKeyModal(true); }}
                />
                {/* API Key Modal for Configure Now button */}
                <ApiKeyModal
                    isOpen={showApiKeyModal}
                    onClose={() => setShowApiKeyModal(false)}
                    onSave={handleSaveApiKey}
                    currentKey={config.apiKey}
                />
            </>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-950 font-sans text-slate-200">
            {/* Crash Recovery Prompt - highest priority */}
            <CrashRecoveryPrompt
                isOpen={showRecoveryPrompt}
                recoveryData={recoveryData}
                isRecovering={isRecovering}
                onRecover={handleRecover}
                onDismiss={dismissRecovery}
            />
            <GlobalModals
                visibility={{
                    showNameModal, showClearModal, showBulkExportModal,
                    showSettings, showAnalytics, showDangerZone,
                    showApiKeyModal, showTerms, showAgeGate,
                    tutorialActive, deleteConfirmId, showAdvancedConfig,
                    showApiKey
                }}
                state={{
                    config, isProcessing, status, translationProgress,
                    allQuestionsMap, appMode, currentStep, tutorialSteps,
                    metrics: { totalApproved: approvedCount, totalQuestions: questions.length },
                    isApiReady, customTags
                }}
                handlers={{
                    handleNameSave, handleDeleteAllQuestions, handleBulkExport,
                    confirmDelete, setDeleteConfirmId,
                    onCloseBulkExport: () => setShowBulkExportModal(false),
                    onCloseSettings: () => setShowSettings(false),
                    onCloseAnalytics: () => setShowAnalytics(false),
                    onCloseDangerZone: () => setShowDangerZone(false),
                    onCloseApiKey: () => setShowApiKeyModal(false),
                    handleChange, handleSaveApiKey, setShowTerms, setTermsAccepted, setShowAgeGate, setShowClearModal,
                    handleTutorialNext, handleTutorialPrev, handleTutorialSkip, handleTutorialComplete,
                    onResetSettings: () => setConfig({ ...config, ...useAppConfig.defaultConfig }),
                    onHardReset: () => { localStorage.clear(); window.location.reload(); },
                    fileInputRef, handleFileChange, setShowAdvancedConfig,
                    setShowApiKey, handleDetectTopics,
                    onSaveCustomTags: handleSaveCustomTags,
                    window: window
                }}
            />
            <Header apiKeyStatus={apiKeyStatus} isCloudReady={isAuthReady} onHome={handleGoHome} creatorName={config.creatorName} appMode={appMode} tokenUsage={tokenUsage} onRestartTutorial={handleRestartTutorial} />

            <MainLayout
                appMode={appMode}
                setAppMode={setAppMode}
                sidebarProps={{
                    showGenSettings, setShowGenSettings, config, handleChange,
                    allQuestionsMap, approvedCounts, overallPercentage, totalApproved,
                    isTargetMet, maxBatchSize, batchSizeWarning, handleGenerate,
                    isGenerating, isApiReady, handleBulkTranslateMissing, isProcessing,
                    setShowSettings, handleSelectCategory, customTags, status
                }}
                handleModeSelect={handleModeSelect}
                handleViewDatabase={handleViewDatabase}
                pendingCount={pendingCount}
                toolbarProps={{
                    mode: appMode, counts: contextCounts, filterMode, setFilterMode,
                    filterByCreator, setFilterByCreator, filterTags, setFilterTags,
                    customTags, searchTerm, setSearchTerm, sortBy, setSortBy,
                    isProcessing, status, isAuthReady, config,
                    onLoadSheets: handleLoadFromSheets, onLoadFirestore: handleLoadFromFirestore,
                    onBulkExport: () => setShowBulkExportModal(true), onClearPending: handleClearPending,
                    onBulkAcceptHighScores: appMode === 'review' ? handleBulkAcceptHighScores : undefined,
                    onBulkCritiqueAll: appMode === 'review' ? handleBulkCritiqueAll : undefined
                }}
                showHistory={showHistory}
                uniqueFilteredQuestions={uniqueFilteredQuestions}
                questions={questions}
                status={status}
                databaseQuestions={databaseQuestions}
                config={config}
                isProcessing={isProcessing}
                viewRouterHandlers={{
                    handleLoadFromSheets, handleLoadFromFirestore, handleUpdateDatabaseQuestion, handleKickBackToReview,
                    handleUpdateStatus, handleExplain, handleVariate, handleCritique, handleApplyRewrite, handleTranslateSingle, handleLanguageSwitch, handleDelete, handleManualUpdate,
                    selectAll, clearSelection, bulkUpdateStatus, toggleSelection
                }}
                viewRouterState={{
                    currentReviewIndex, selectedIds, translationMap, filterByCreator, filteredQuestions, questions, status, filterMode, sortBy, showHistory
                }}
                viewRouterSetters={{
                    setDatabaseQuestions, setCurrentReviewIndex, setFilterByCreator, showMessage
                }}
                handleGoHome={handleGoHome}
            />

            {/* API Key Modal - Simple popup for Configure Now button */}

            {/* TOAST NOTIFICATIONS */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* TUTORIAL OVERLAY */}

            {/* COMPLIANCE MODALS */}

        </div>
    );
};

export default App;
