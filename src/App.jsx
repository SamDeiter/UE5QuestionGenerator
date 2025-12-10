// ============================================================================
// IMPORTS
// ============================================================================

// React core hooks
import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
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
// Utilities
import { TARGET_TOTAL, TARGET_PER_CATEGORY } from './utils/constants';
import { createFilteredQuestions, createUniqueFilteredQuestions } from './utils/questionFilters';
import { getTokenUsage } from './utils/analyticsStore';
import { auth, getCustomTags, saveCustomTags, deleteQuestionFromFirestore } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const App = () => {
    // ========================================================================
    // STATE - Toast Notifications (Local to App for now)
    // ========================================================================
    const [toasts, setToasts] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
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

    const toggleSelection = useCallback((id) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => {
            // Prevent duplicate messages
            if (prev.some(t => t.message === message)) {
                return prev;
            }
            const newToasts = [...prev, { id, message, type, duration }];
            // Keep only the 3 most recent toasts
            return newToasts.slice(-3);
        });
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showMessage = useCallback((msg, duration = 3000) => {
        addToast(msg, 'info', duration);
    }, [addToast]);

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

    // 5. Filtering & Search
    // 5. Filtering & Search
    const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('ue5_pref_search') || '');
    // debouncedSearchTerm removed as it was unused
    const [filterMode, setFilterMode] = useState(() => localStorage.getItem('ue5_pref_filter') || 'pending');
    const [showHistory, setShowHistory] = useState(() => localStorage.getItem('ue5_pref_history') === 'true');
    const [filterByCreator, setFilterByCreator] = useState(false);
    const [filterTags, setFilterTags] = useState([]); // NEW: Filter by tags
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
    const [sortBy, setSortBy] = useState('default');

    // useEffect(() => {
    //     const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 3000);
    //     return () => clearTimeout(timer);
    // }, [searchTerm]);
    // Removed unused SEARCH DEBOUNCE EFFECT as it resulted in unused state

    useEffect(() => {
        localStorage.setItem('ue5_pref_search', searchTerm);
        localStorage.setItem('ue5_pref_filter', filterMode);
        localStorage.setItem('ue5_pref_history', showHistory);
    }, [searchTerm, filterMode, showHistory]);

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

    // Computed Filtered Questions
    // Computed Filtered Questions
    // 1. First, get questions that match all filters EXCEPT status (for counts)
    const contextFilteredQuestions = useMemo(() => createFilteredQuestions(
        questions,
        historicalQuestions,
        showHistory || appMode === 'review', // Force history on in review mode
        'all', // Ignore status for this intermediate list
        filterByCreator,
        searchTerm,
        config.creatorName,
        config.discipline,
        config.difficulty,
        config.language,
        filterTags // Pass filterTags to filtering logic
    ), [questions, historicalQuestions, showHistory, appMode, filterByCreator, searchTerm, config, filterTags]);

    // 2. Calculate counts based on the context
    const contextCounts = useMemo(() => {
        const pending = contextFilteredQuestions.filter(q => !q.status || q.status === 'pending').length;
        const accepted = contextFilteredQuestions.filter(q => q.status === 'accepted').length;
        const rejected = contextFilteredQuestions.filter(q => q.status === 'rejected').length;
        const all = contextFilteredQuestions.length;
        return { pending, accepted, rejected, all };
    }, [contextFilteredQuestions]);

    // 3. Now apply the status filter for the actual view
    const filteredQuestions = useMemo(() => {
        if (filterMode === 'all') return contextFilteredQuestions;
        return contextFilteredQuestions.filter(q => {
            if (filterMode === 'pending') return !q.status || q.status === 'pending';
            return q.status === filterMode;
        });
    }, [contextFilteredQuestions, filterMode]);

    const uniqueFilteredQuestions = useMemo(() => createUniqueFilteredQuestions(
        filteredQuestions,
        config.language
    ), [filteredQuestions, config.language]);

    // Bulk selection callbacks (must be after uniqueFilteredQuestions is defined)
    const selectAll = useCallback(() => {
        setSelectedIds(new Set(uniqueFilteredQuestions.map(q => q.id)));
    }, [uniqueFilteredQuestions]);

    const bulkUpdateStatus = useCallback((status, rejectionReason = null) => {
        selectedIds.forEach(id => handleUpdateStatus(id, status, rejectionReason));
        clearSelection();
        showMessage(`${status === 'accepted' ? 'Accepted' : 'Rejected'} ${selectedIds.size} questions`);
    }, [selectedIds, handleUpdateStatus, clearSelection, showMessage]);

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

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (appMode === 'create' && !isGenerating && !isTargetMet && isApiReady && maxBatchSize > 0) {
                    e.preventDefault();
                    handleGenerate();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [appMode, isGenerating, isTargetMet, isApiReady, maxBatchSize, handleGenerate]);

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (config.sheetUrl) handleExportToSheets();
                else handleBulkExport({ format: 'csv', includeRejected: false, languages: [config.language], scope: 'all' });
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                setShowBulkExportModal(true);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [config.sheetUrl, config.language, handleExportToSheets, handleBulkExport]);

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

    // Review Mode Navigation
    useEffect(() => {
        setCurrentReviewIndex(0);
    }, [appMode, config.discipline, config.difficulty, config.language, filterMode, searchTerm]);

    useEffect(() => {
        if (appMode !== 'review') return;
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') setCurrentReviewIndex(prev => Math.min(prev + 1, uniqueFilteredQuestions.length - 1));
            else if (e.key === 'ArrowLeft') setCurrentReviewIndex(prev => Math.max(prev - 1, 0));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [appMode, uniqueFilteredQuestions.length]);

    const handleModeSelect = (mode) => {
        setAppMode(mode);
        setShowExportMenu(false);
        if (mode === 'review') {
            setShowHistory(true);
            setFilterMode('pending'); // Changed from 'all' to 'pending' to hide accepted items
        } else {
            setShowHistory(false);
            setFilterMode('pending');
        }
    };

    const handleViewDatabase = async () => {
        setAppMode('database');
        // Load from Firestore (primary database)
        await handleLoadFromFirestore();
    };

    const handleUpdateDatabaseQuestion = (id, update) => {
        setDatabaseQuestions(prev => prev.map(q => {
            if (q.id !== id) return q;
            const newData = typeof update === 'function' ? update(q) : update;
            return { ...q, ...newData };
        }));
        showMessage("Question updated locally. Click 'Sync to Firestore' to save changes.", 3000);
    };

    // Wrapper to adapt (id, update) from QuestionItem to (id, fn) for useQuestionManager
    const handleManualUpdate = (id, update) => {
        updateQuestionInState(id, (prevQ) => {
            const newData = typeof update === 'function' ? update(prevQ) : update;
            return { ...prevQ, ...newData };
        });
    };

    const handleKickBackToReview = async (question) => {
        try {
            // Delete from Firestore
            await deleteQuestionFromFirestore(question.uniqueId);

            // Remove from database view
            setDatabaseQuestions(prev => prev.filter(q => q.uniqueId !== question.uniqueId));

            // Add to historical questions with 'pending' status so it appears in Review Mode
            setHistoricalQuestions(prev => {
                // Check if already exists to prevent duplicates
                if (prev.some(q => q.uniqueId === question.uniqueId)) {
                    return prev.map(q => q.uniqueId === question.uniqueId ? { ...question, status: 'pending' } : q);
                }
                return [...prev, { ...question, status: 'pending' }];
            });

            showMessage("Question removed from database and sent to Review Mode.", 3000);
        } catch (error) {
            console.error("Error kicking back question:", error);
            showMessage("Failed to kick back question. Please try again.", 3000);
        }
    };

    const handleGoHome = () => setAppMode('landing');
    const handleSelectCategory = (key) => setConfig(prev => ({ ...prev, difficulty: key }));

    const [_showProgressMenu, _setShowProgressMenu] = useState(false);

    const handleClearPending = () => {
        if (window.confirm("Are you sure you want to delete ALL pending questions? This cannot be undone.")) {
            // Filter out pending questions from the main state
            setQuestions(prev => prev.filter(q => q.status === 'accepted' || q.status === 'rejected'));
            showMessage("All pending questions cleared.", 3000);
        }
    };

    // Bulk accept all questions with critique score >= 70
    const handleBulkAcceptHighScores = () => {
        const highScoreQuestions = uniqueFilteredQuestions.filter(
            q => q.critiqueScore >= 70 && q.status !== 'accepted' && q.humanVerified
        );

        if (highScoreQuestions.length === 0) {
            showMessage("No verified questions with score ≥ 70 to accept.", 3000);
            return;
        }

        highScoreQuestions.forEach(q => handleUpdateStatus(q.id, 'accepted'));
        showMessage(`✓ Accepted ${highScoreQuestions.length} high-scoring questions!`, 4000);
    };

    // Bulk critique all questions without scores
    const handleBulkCritiqueAll = async () => {
        const uncritiquedQuestions = uniqueFilteredQuestions.filter(
            q => q.critiqueScore === undefined || q.critiqueScore === null
        );

        if (uncritiquedQuestions.length === 0) {
            showMessage("All questions already have critique scores.", 3000);
            return;
        }

        showMessage(`Running critique on ${uncritiquedQuestions.length} questions...`, 3000);

        // Process sequentially to avoid rate limits
        for (const q of uncritiquedQuestions) {
            await handleCritique(q);
        }

        showMessage(`✓ Critique complete for ${uncritiquedQuestions.length} questions!`, 4000);
    };

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
