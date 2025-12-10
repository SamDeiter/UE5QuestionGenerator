// ============================================================================
// IMPORTS
// ============================================================================

// React core hooks
import { useState, useEffect, Suspense, useRef } from 'react';
// UI Components
import Icon from './components/Icon';
import LandingPage from './components/LandingPage';
import Header from './components/Header';
import Toast from './components/Toast';
import Sidebar from './components/Sidebar';
import GlobalModals from './components/GlobalModals';
import ViewRouter from './components/ViewRouter';
import AppNavigation from './components/AppNavigation';
import ContextToolbar from './components/ContextToolbar';
import CrashRecoveryPrompt from './components/CrashRecoveryPrompt';
import SignIn from './components/SignIn';
import ApiKeyModal from './components/ApiKeyModal';

// Loading Fallback
const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-10 text-slate-500">
        <Icon name="loader" className="animate-spin mr-2" /> Loading...
    </div>
);

// Lazy Loaded Components

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
// Utilities
import { TARGET_TOTAL, TARGET_PER_CATEGORY } from './utils/constants';
import { getTokenUsage } from './utils/analyticsStore';
import { auth, getCustomTags, saveCustomTags } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const App = () => {
    // ========================================================================
    // HOOKS - Toast Notifications
    // ========================================================================
    const { toasts, addToast: _addToast, removeToast, showMessage } = useToast();
    
    // ========================================================================
    // STATE - Token Usage and Auth
    // ========================================================================
    const [tokenUsage, setTokenUsage] = useState(() => getTokenUsage());
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [customTags, setCustomTags] = useState({});

    // Compliance modals
    const [showTerms, setShowTerms] = useState(false);
    const [showAgeGate, setShowAgeGate] = useState(false);
    const [_termsAccepted, setTermsAccepted] = useState(false);

    // Listen for auth state changes and load custom tags
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Load custom tags from Firestore
                try {
                    const tags = await getCustomTags();
                    setCustomTags(tags);
                } catch (error) {
                    console.error("Failed to load custom tags:", error);
                }
            }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Refresh token usage periodically and after generations
    useEffect(() => {
        const interval = setInterval(() => setTokenUsage(getTokenUsage()), 5000);
        return () => clearInterval(interval);
    }, []);

    // Check compliance status on app load
    useEffect(() => {
        const ageVerified = localStorage.getItem('ue5_age_verified');
        const termsAcceptedStorage = localStorage.getItem('ue5_terms_accepted');

        if (!ageVerified) {
            setShowAgeGate(true);
        } else if (!termsAcceptedStorage) {
            setShowTerms(true);
        } else {
            setTermsAccepted(true);
        }
    }, []);

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

    // API Key Modal State (simpler than full settings)
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);

    const handleSaveApiKey = (newApiKey) => {
        handleChange({ target: { name: 'apiKey', value: newApiKey } });
        setShowApiKeyModal(false);
    };

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

    // 7. Export Logic
    const [_showExportMenu, setShowExportMenu] = useState(false);
    const [showBulkExportModal, setShowBulkExportModal] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [_dataMenuOpen, setDataMenuOpen] = useState(false);
    const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
    const [showDangerZone, setShowDangerZone] = useState(false);
    const dataMenuRef = useRef(null);

    // Set up global function for Settings modal to open DangerZone
    useEffect(() => {
        window.openDangerZone = () => setShowDangerZone(true);
        return () => { delete window.openDangerZone; };
    }, []);

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

    // Click-outside handler for Data dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dataMenuRef.current && !dataMenuRef.current.contains(event.target)) {
                setDataMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Wrapper to adapt (id, update) from QuestionItem to (id, fn) for useQuestionManager
    const handleManualUpdate = (id, update) => {
        updateQuestionInState(id, (prevQ) => {
            const newData = typeof update === 'function' ? update(prevQ) : update;
            return { ...prevQ, ...newData };
        });
    };

    const handleSelectCategory = (key) => setConfig(prev => ({ ...prev, difficulty: key }));

    const [_showProgressMenu, _setShowProgressMenu] = useState(false);

    const _handleSaveCustomTags = async (newCustomTags) => {
        try {
            await saveCustomTags(newCustomTags);
            setCustomTags(newCustomTags);
            showMessage("Custom tags saved successfully!", 2000);
        } catch (error) {
            console.error("Failed to save custom tags:", error);
            showMessage("Failed to save custom tags. Please try again.", 3000);
        }
    };

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
                    onSaveCustomTags: async (newTags) => {
                        try {
                            await saveCustomTags(newTags);
                            setCustomTags(newTags);
                            showMessage("Custom tags saved!", 2000);
                        } catch {
                            showMessage("Failed to save tags", 3000);
                        }
                    },
                    window: window
                }}
            />
            <Header apiKeyStatus={apiKeyStatus} isCloudReady={isAuthReady} onHome={handleGoHome} creatorName={config.creatorName} appMode={appMode} tokenUsage={tokenUsage} onRestartTutorial={handleRestartTutorial} />

            <div className="flex flex-1 overflow-hidden">
                {appMode === 'create' && (
                    <Sidebar
                        showGenSettings={showGenSettings}
                        setShowGenSettings={setShowGenSettings}
                        config={config}
                        handleChange={handleChange}
                        allQuestionsMap={allQuestionsMap}
                        approvedCounts={approvedCounts}
                        overallPercentage={overallPercentage}
                        totalApproved={totalApproved}
                        TARGET_TOTAL={TARGET_TOTAL}
                        TARGET_PER_CATEGORY={TARGET_PER_CATEGORY}
                        isTargetMet={isTargetMet}
                        maxBatchSize={maxBatchSize}
                        batchSizeWarning={batchSizeWarning}
                        handleGenerate={handleGenerate}
                        isGenerating={isGenerating}
                        isApiReady={isApiReady}
                        handleBulkTranslateMissing={handleBulkTranslateMissing}
                        isProcessing={isProcessing}
                        setShowSettings={setShowSettings}
                        handleSelectCategory={handleSelectCategory}
                        customTags={customTags}
                        status={status}
                    />
                )}
                <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
                    <div className="flex flex-col border-b border-slate-800 bg-slate-900 z-10">
                        <AppNavigation
                            activeMode={appMode}
                            onNavigate={(mode) => {
                                if (mode === 'analytics') setAppMode('analytics');
                                else if (mode === 'database') handleViewDatabase();
                                else handleModeSelect(mode);
                            }}
                            counts={{ pending: pendingCount }}
                        />
                        <ContextToolbar
                            mode={appMode}
                            counts={contextCounts}
                            filterMode={filterMode}
                            setFilterMode={setFilterMode}
                            filterByCreator={filterByCreator}
                            setFilterByCreator={setFilterByCreator}
                            filterTags={filterTags}
                            setFilterTags={setFilterTags}
                            customTags={customTags} // Pass customTags for the selector
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            sortBy={sortBy}
                            setSortBy={setSortBy}
                            isProcessing={isProcessing}
                            status={status}
                            isAuthReady={isAuthReady}
                            config={config}
                            onLoadSheets={handleLoadFromSheets}
                            onLoadFirestore={handleLoadFromFirestore}
                            onBulkExport={() => setShowBulkExportModal(true)}
                            onClearPending={handleClearPending}
                            onBulkAcceptHighScores={appMode === 'review' ? handleBulkAcceptHighScores : undefined}
                            onBulkCritiqueAll={appMode === 'review' ? handleBulkCritiqueAll : undefined}
                        />
                    </div>

                    <div className="flex-1 overflow-auto p-6 bg-black/20 space-y-4" data-tour="review-area">
                        {!showHistory && uniqueFilteredQuestions.length === 0 && questions.length === 0 && !status && appMode === 'create' && (<div className="flex flex-col items-center justify-center h-full text-slate-600"><Icon name="terminal" size={48} className="mb-4 text-slate-800" /><p className="font-medium text-slate-500">Ready. Click 'GENERATE QUESTIONS' to begin or upload a source file.</p></div>)}

                        {/* CREATE MODE: Call-to-Action Banner */}
                        {appMode === 'create' && questions.length > 0 && (
                            <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-700/50 rounded-lg p-4 mb-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Icon name="info" size={20} className="text-indigo-400" />
                                        <div>
                                            <h3 className="text-sm font-bold text-indigo-300">Questions Generated!</h3>
                                            <p className="text-xs text-slate-400">Switch to Review Mode to accept or reject questions.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleModeSelect('review')}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/50"
                                    >
                                        Go to Review <Icon name="arrow-right" size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <Suspense fallback={<LoadingSpinner />}>
                            <ViewRouter
                                appMode={appMode}
                                uniqueFilteredQuestions={uniqueFilteredQuestions}
                                databaseQuestions={databaseQuestions}
                                config={config}
                                isProcessing={isProcessing}
                                handlers={{
                                    handleLoadFromSheets, handleLoadFromFirestore, handleUpdateDatabaseQuestion, handleKickBackToReview,
                                    handleUpdateStatus, handleExplain, handleVariate, handleCritique, handleApplyRewrite, handleTranslateSingle, handleLanguageSwitch, handleDelete, handleManualUpdate,
                                    selectAll, clearSelection, bulkUpdateStatus, toggleSelection
                                }}
                                state={{
                                    currentReviewIndex, selectedIds, translationMap, filterByCreator, filteredQuestions, questions, status, filterMode, sortBy, showHistory
                                }}
                                setters={{
                                    setDatabaseQuestions, setCurrentReviewIndex, setFilterByCreator, showMessage
                                }}
                                onNavigateToCreate={() => handleModeSelect('create')}
                                onNavigateHome={handleGoHome}
                            />
                        </Suspense>
                    </div>
                </main>
            </div>

            {/* API Key Modal - Simple popup for Configure Now button */}

            {/* TOAST NOTIFICATIONS */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast {...toast} onClose={() => removeToast(toast.id)} />
                    </div>
                ))}
            </div>

            {/* TUTORIAL OVERLAY */}

            {/* COMPLIANCE MODALS */}

        </div>
    );
};

export default App;
