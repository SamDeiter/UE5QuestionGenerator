// ============================================================================
// IMPORTS
// ============================================================================

// React core hooks
import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';

// UI Components
import LandingPage from './components/LandingPage';
import Header from './components/Header';
import QuestionItem from './components/QuestionItem';
import NameEntryModal from './components/NameEntryModal';
import ClearConfirmationModal from './components/ClearConfirmationModal';
import BlockingProcessModal from './components/BlockingProcessModal';
import FilterButton from './components/FilterButton';
import GranularProgress from './components/GranularProgress';
import Icon from './components/Icon';
import Toast from './components/Toast';
import Sidebar from './components/Sidebar';

// Lazy Loaded Components
const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
const ReviewMode = React.lazy(() => import('./components/ReviewMode'));
const DatabaseView = React.lazy(() => import('./components/DatabaseView'));
const BulkExportModal = React.lazy(() => import('./components/BulkExportModal'));
const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard'));

// Loading Fallback
const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-10 text-slate-500">
        <Icon name="loader" className="animate-spin mr-2" /> Loading...
    </div>
);

// Custom Hooks
import { useAppConfig } from './hooks/useAppConfig';
import { useQuestionManager } from './hooks/useQuestionManager';
import { useFileHandler } from './hooks/useFileHandler';
import { useGeneration } from './hooks/useGeneration';
import { useExport } from './hooks/useExport';

// Utilities
import { CATEGORY_KEYS, TARGET_TOTAL, TARGET_PER_CATEGORY } from './utils/constants';
import { createFilteredQuestions, createUniqueFilteredQuestions } from './utils/questionFilters';
import { getTokenUsage } from './utils/analyticsStore';

const App = () => {
    // ========================================================================
    // STATE - Toast Notifications (Local to App for now)
    // ========================================================================
    const [toasts, setToasts] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [tokenUsage, setTokenUsage] = useState(() => getTokenUsage());

    // Refresh token usage periodically and after generations
    useEffect(() => {
        const interval = setInterval(() => setTokenUsage(getTokenUsage()), 5000);
        return () => clearInterval(interval);
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
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showMessage = useCallback((msg, duration = 3000) => {
        addToast(msg, 'info', duration);
    }, [addToast]);

    // ========================================================================
    // HOOKS - State Management
    // ========================================================================

    // 1. App Configuration & UI State
    const {
        appMode, setAppMode,
        config, setConfig,
        isInternalEnvironment,
        isAuthReady,
        isApiReady,
        effectiveApiKey,
        apiKeyStatus,
        showNameModal, setShowNameModal,
        showAdvancedConfig, setShowAdvancedConfig,
        showGenSettings, setShowGenSettings,
        showApiError, setShowApiError,
        batchSizeWarning, setBatchSizeWarning,
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
        rejectedCount,
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

    // 3. Status State (Shared)
    const [status, setStatus] = useState('');

    // 4. File Handling
    const {
        files, setFiles,
        fileInputRef,
        isDetecting,
        handleFileChange,
        removeFile,
        getFileContext,
        handleDetectTopics
    } = useFileHandler(config, setConfig, addQuestionsToState, showMessage, setStatus, isApiReady, effectiveApiKey);

    // 5. Filtering & Search
    const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('ue5_pref_search') || '');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    const [filterMode, setFilterMode] = useState(() => localStorage.getItem('ue5_pref_filter') || 'pending');
    const [showHistory, setShowHistory] = useState(() => localStorage.getItem('ue5_pref_history') === 'true');
    const [filterByCreator, setFilterByCreator] = useState(false);
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 3000);
        return () => clearTimeout(timer);
    }, [searchTerm]);

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
        handleBulkTranslateMissing
    } = useGeneration(
        config, setConfig, effectiveApiKey, isApiReady, isTargetMet, maxBatchSize,
        getFileContext, checkAndStoreQuestions, addQuestionsToState, updateQuestionInState,
        handleLanguageSwitch, showMessage, setStatus, setShowNameModal, setShowAdvancedConfig,
        setShowApiError, setShowHistory, translationMap, allQuestionsMap
    );

    // 7. Export Logic
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showBulkExportModal, setShowBulkExportModal] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [dataMenuOpen, setDataMenuOpen] = useState(false);
    const dataMenuRef = useRef(null);

    // Computed Filtered Questions
    const filteredQuestions = useMemo(() => createFilteredQuestions(
        questions,
        historicalQuestions,
        showHistory,
        filterMode,
        filterByCreator,
        searchTerm,
        config.creatorName,
        config.discipline,
        config.difficulty,
        config.language
    ), [questions, historicalQuestions, showHistory, filterMode, filterByCreator, searchTerm, config.creatorName, config.discipline, config.difficulty, config.language]);

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
        handleExportByGroup,
        handleExportCurrentTarget,
        handleExportToSheets,
        handleLoadFromSheets,
        handleLoadFromFirestore,
        handleBulkExport
    } = useExport(
        config, questions, historicalQuestions, uniqueFilteredQuestions, allQuestionsMap,
        showHistory, showMessage, setStatus, (val) => { },
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

    const handleKickBackToReview = (question) => {
        // Add to historical questions with 'pending' status so it appears in Review Mode
        setHistoricalQuestions(prev => {
            // Check if already exists to prevent duplicates
            if (prev.some(q => q.uniqueId === question.uniqueId)) {
                return prev.map(q => q.uniqueId === question.uniqueId ? { ...question, status: 'pending' } : q);
            }
            return [...prev, { ...question, status: 'pending' }];
        });
        showMessage("Question sent to Review Console (Pending).", 3000);
    };

    const handleGoHome = () => setAppMode('landing');
    const handleSelectCategory = (key) => setConfig(prev => ({ ...prev, difficulty: key }));

    const [showProgressMenu, setShowProgressMenu] = useState(false);

    // Render
    if (appMode === 'landing') {
        return <LandingPage onSelectMode={handleModeSelect} apiKeyStatus={apiKeyStatus} isCloudReady={isAuthReady} />;
    }

    return (
        <div className="flex flex-col h-screen bg-slate-950 font-sans text-slate-200">
            <Header apiKeyStatus={apiKeyStatus} isCloudReady={isAuthReady} onHome={handleGoHome} creatorName={config.creatorName} appMode={appMode} tokenUsage={tokenUsage} />

            {config.creatorName === '' && <NameEntryModal onSave={handleNameSave} />}
            {showClearModal && <ClearConfirmationModal onConfirm={handleDeleteAllQuestions} onCancel={() => setShowClearModal(false)} />}

            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300 space-y-4">
                        <h3 className="text-xl font-bold text-red-500 flex items-center gap-2"><Icon name="trash-2" size={20} /> DELETE QUESTION?</h3>
                        <p className="text-sm text-slate-300">Why are you deleting this question? This helps improve future generation.</p>

                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { id: 'Duplicate', label: 'Duplicate Question' },
                                { id: 'Poor Quality', label: 'Poor Quality / Hallucination' },
                                { id: 'Incorrect', label: 'Incorrect Information' },
                                { id: 'Bad Source', label: 'Bad Source / YouTube' },
                                { id: 'Test', label: 'Just Testing / Cleanup' }
                            ].map(reason => (
                                <button
                                    key={reason.id}
                                    onClick={() => confirmDelete(reason.id)}
                                    className="w-full text-left px-4 py-3 rounded bg-slate-800 hover:bg-red-900/20 border border-slate-700 hover:border-red-500/50 transition-all flex items-center justify-between group"
                                >
                                    <span className="text-sm font-medium text-slate-300 group-hover:text-red-200">{reason.label}</span>
                                    <Icon name="chevron-right" size={14} className="text-slate-600 group-hover:text-red-400" />
                                </button>
                            ))}
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex justify-end">
                            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm rounded bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {isProcessing && <BlockingProcessModal isProcessing={isProcessing} status={status} translationProgress={translationProgress} />}
            {showBulkExportModal && <BulkExportModal onClose={() => setShowBulkExportModal(false)} onExport={handleBulkExport} questionCount={allQuestionsMap.size} />}

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
                        showAdvancedConfig={showAdvancedConfig}
                        setShowAdvancedConfig={setShowAdvancedConfig}
                        files={files}
                        handleDetectTopics={handleDetectTopics}
                        isDetecting={isDetecting}
                        fileInputRef={fileInputRef}
                        handleFileChange={handleFileChange}
                        removeFile={removeFile}
                        apiKeyStatus={apiKeyStatus}
                        showApiError={showApiError}
                        handleLoadFromSheets={handleLoadFromSheets}
                        handleExportToSheets={handleExportToSheets}
                        setShowSettings={setShowSettings}
                        handleSelectCategory={handleSelectCategory}
                    />
                )}
                <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
                    <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900 shadow-md z-10">
                        <div className="flex gap-4 items-center">
                            {isAuthReady ? (<>{status && <span className="text-xs text-orange-500 font-medium flex items-center gap-1 animate-pulse"><Icon name="loader" size={12} className="animate-spin" /> {status}</span>}{!status && <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Icon name="database" size={14} /> DB Ready</span>}</>) : (<span className="text-xs text-yellow-500 font-medium flex items-center gap-1 animate-pulse"><Icon name="plug" size={12} className="animate-pulse" /> Connecting to DB...</span>)}
                        </div>
                        <div className="flex gap-2 items-center bg-slate-950 p-1 rounded-lg border border-slate-800 shadow-inner">
                            {/* Data Dropdown - Contains Load and Export */}
                            <div className="relative" ref={dataMenuRef}>
                                <button
                                    onClick={() => setDataMenuOpen(!dataMenuOpen)}
                                    disabled={isProcessing}
                                    className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${dataMenuOpen ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-white'} disabled:opacity-50`}
                                    title="Data Operations"
                                >
                                    <Icon name="folder" size={14} />
                                    Data
                                    <Icon name="chevron-down" size={10} className={`transition-transform ${dataMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {dataMenuOpen && (
                                    <div className="absolute left-0 top-full mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        <div className="py-1">
                                            <button
                                                onClick={() => { handleLoadFromSheets(); setDataMenuOpen(false); }}
                                                disabled={isProcessing || !config.sheetUrl}
                                                className="w-full text-left px-4 py-2 text-xs text-blue-300 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                title={config.sheetUrl ? "Load Approved Questions from Google Sheets" : "Configure Sheets URL in Settings first"}
                                            >
                                                <Icon name="table" size={14} />
                                                Load from Sheets
                                            </button>
                                            <button
                                                onClick={() => { setShowBulkExportModal(true); setDataMenuOpen(false); }}
                                                className="w-full text-left px-4 py-2 text-xs text-green-300 hover:bg-slate-700 flex items-center gap-2"
                                                title="Open Export Options"
                                            >
                                                <Icon name="download" size={14} />
                                                Export Questions
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="w-px h-4 bg-slate-700 mx-1"></div>

                            {/* Mode Navigation - Unified across all panels */}
                            <button
                                onClick={() => handleModeSelect('create')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${appMode === 'create' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
                                title="Switch to Creation Mode"
                            >
                                <Icon name="plus-circle" size={14} /> Create
                            </button>

                            <button
                                onClick={() => handleModeSelect('review')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${appMode === 'review' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
                                title="Switch to Review & Audit Console"
                            >
                                <Icon name="list-checks" size={14} /> Review
                                {appMode !== 'review' && pendingCount > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full">{pendingCount}</span>
                                )}
                            </button>

                            <button
                                onClick={handleViewDatabase}
                                className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${appMode === 'database' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
                                title="Switch to Database View"
                            >
                                <Icon name="database" size={14} /> DB View
                            </button>

                            <button
                                onClick={() => setShowAnalytics(true)}
                                className="px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-white"
                                title="Open Analytics Dashboard"
                            >
                                <Icon name="bar-chart-2" size={14} /> Analytics
                            </button>

                            <div className="w-px h-4 bg-slate-700 mx-1"></div>

                            {/* Filter Buttons - Shown when there are questions */}
                            <FilterButton mode="pending" current={filterMode} setFilter={setFilterMode} label="Pending" count={pendingCount} />
                            <FilterButton mode="all" current={filterMode} setFilter={setFilterMode} label="All" count={appMode === 'review' ? historicalQuestions.length : questions.length} />
                            <FilterButton mode="accepted" current={filterMode} setFilter={setFilterMode} label="Accepted" count={approvedCount} />
                            <FilterButton mode="rejected" current={filterMode} setFilter={setFilterMode} label="Rejected" count={rejectedCount} />

                            <div className="w-px h-4 bg-slate-700 mx-1"></div>
                            <button
                                onClick={() => setFilterByCreator(!filterByCreator)}
                                className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${filterByCreator ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50'}`}
                                title="Filter by My Creator Name"
                            >
                                <Icon name="user" size={12} /> My Questions
                            </button>
                            <div className="w-px h-4 bg-slate-700 mx-1"></div>

                            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-40 bg-slate-900 text-slate-300 placeholder-slate-600 border-none outline-none focus:ring-0 text-sm px-2 rounded" />
                            {searchTerm && (<button onClick={() => setSearchTerm('')} className="text-slate-500 hover:text-red-400 p-1 rounded"><Icon name="x" size={16} /></button>)}
                        </div>
                    </div >

                    <div className="flex-1 overflow-auto p-6 bg-black/20 space-y-4">
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
                            {appMode === 'database' ? (
                                <DatabaseView
                                    questions={databaseQuestions}
                                    sheetUrl={config.sheetUrl}
                                    onLoad={handleLoadFromSheets}
                                    onLoadFirestore={handleLoadFromFirestore}
                                    onClearView={() => setDatabaseQuestions([])}
                                    onHardReset={() => setDatabaseQuestions([])}
                                    onUpdateQuestion={handleUpdateDatabaseQuestion}
                                    onKickBack={handleKickBackToReview}
                                    isProcessing={isProcessing}
                                    showMessage={showMessage}
                                    filterMode={filterMode}
                                />
                            ) : appMode === 'review' && uniqueFilteredQuestions.length > 0 ? (
                                <ReviewMode
                                    questions={uniqueFilteredQuestions}
                                    currentIndex={currentReviewIndex}
                                    setCurrentIndex={setCurrentReviewIndex}
                                    onUpdateStatus={handleUpdateStatus}
                                    onExplain={handleExplain}
                                    onVariate={handleVariate}
                                    onCritique={handleCritique}
                                    onTranslateSingle={handleTranslateSingle}
                                    onSwitchLanguage={handleLanguageSwitch}
                                    onDelete={handleDelete}
                                    onUpdateQuestion={handleManualUpdate}
                                    translationMap={translationMap}
                                    isProcessing={isProcessing}
                                    showMessage={showMessage}
                                />
                            ) : (
                                <>
                                    {selectedIds.size > 0 && (
                                        <div className="mb-3 p-3 bg-indigo-900/30 border border-indigo-700/50 rounded-lg flex items-center justify-between animate-in slide-in-from-top duration-200">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-indigo-300">{selectedIds.size} selected</span>
                                                <button onClick={selectAll} className="text-xs text-indigo-400 hover:text-indigo-300 underline">Select All</button>
                                                <button onClick={clearSelection} className="text-xs text-slate-400 hover:text-slate-300 underline">Clear</button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => bulkUpdateStatus('accepted')} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg flex items-center gap-1"><Icon name="check" size={14} /> Accept All</button>
                                                <button onClick={() => bulkUpdateStatus('rejected', 'other')} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center gap-1"><Icon name="x" size={14} /> Reject All</button>
                                            </div>
                                        </div>
                                    )}
                                    <Virtuoso
                                        style={{ height: '100%' }}
                                        data={uniqueFilteredQuestions}
                                        itemContent={(index, q) => (
                                            <div className="mb-4">
                                                <QuestionItem
                                                    key={q.uniqueId}
                                                    q={q}
                                                    onUpdateStatus={handleUpdateStatus}
                                                    onExplain={handleExplain}
                                                    onVariate={handleVariate}
                                                    onCritique={handleCritique}
                                                    onTranslateSingle={handleTranslateSingle}
                                                    onSwitchLanguage={handleLanguageSwitch}
                                                    onDelete={handleDelete}
                                                    onUpdateQuestion={handleManualUpdate}
                                                    availableLanguages={translationMap.get(q.uniqueId)}
                                                    isProcessing={isProcessing}
                                                    appMode={appMode}
                                                    showMessage={showMessage}
                                                    isSelected={selectedIds.has(q.id)}
                                                    onToggleSelect={() => toggleSelection(q.id)}
                                                    showCheckbox={selectedIds.size > 0 || appMode === 'create'}
                                                />
                                            </div>
                                        )}
                                    />
                                </>
                            )}

                            {uniqueFilteredQuestions.length === 0 && filteredQuestions.length > 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-600 pt-10">
                                    <Icon name="filter" size={32} className="mb-3 text-slate-800" />
                                    <p className="font-medium text-slate-500">No questions match current filters.</p>
                                    {filterByCreator && (
                                        <p className="text-xs text-slate-600 mt-2">
                                            Filtering by Creator: <span className="text-blue-500 font-bold">{config.creatorName}</span>.
                                            <button onClick={() => setFilterByCreator(false)} className="ml-2 underline hover:text-blue-400">Show All Creators?</button>
                                        </p>
                                    )}
                                </div>
                            )}
                        </Suspense>
                    </div>
                </main >
            </div >

            <Suspense fallback={null}>
                <SettingsModal
                    showSettings={showSettings}
                    setShowSettings={setShowSettings}
                    config={config}
                    handleChange={handleChange}
                    showApiKey={showApiKey}
                    setShowApiKey={setShowApiKey}
                    onClearData={() => {
                        if (window.confirm("This will delete ALL your local questions and settings (except API Key and Sheet URL). Are you sure?")) {
                            // Preserve API key and sheet URL
                            const savedApiKey = config.apiKey;
                            const savedSheetUrl = config.sheetUrl;

                            localStorage.removeItem('ue5_gen_config');
                            localStorage.removeItem('ue5_gen_questions');
                            setQuestions([]);
                            setDatabaseQuestions([]);

                            // Restore preserved values
                            const preservedConfig = { apiKey: savedApiKey, sheetUrl: savedSheetUrl };
                            localStorage.setItem('ue5_gen_config', JSON.stringify(preservedConfig));

                            window.location.reload();
                        }
                    }}
                />
            </Suspense>

            <Suspense fallback={null}>
                <AnalyticsDashboard isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} />
            </Suspense>

            {/* TOAST NOTIFICATIONS */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast {...toast} onClose={removeToast} />
                    </div>
                ))}
            </div>
        </div >
    );
};

export default App;
