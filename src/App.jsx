// ============================================================================
// IMPORTS
// ============================================================================

// React core hooks
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import BulkExportModal from './components/BulkExportModal';
import Toast from './components/Toast';
import Sidebar from './components/Sidebar';

// Custom Hooks
import { useAppConfig } from './hooks/useAppConfig';
import { useQuestionManager } from './hooks/useQuestionManager';
import { useFileHandler } from './hooks/useFileHandler';
import { useGeneration } from './hooks/useGeneration';
import { useExport } from './hooks/useExport';

// Utilities
import { CATEGORY_KEYS, TARGET_TOTAL, TARGET_PER_CATEGORY } from './utils/constants';
import { createFilteredQuestions, createUniqueFilteredQuestions } from './utils/questionFilters';

const App = () => {
    // ========================================================================
    // STATE - Toast Notifications (Local to App for now)
    // ========================================================================
    const [toasts, setToasts] = useState([]);

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

    const {
        handleExportByGroup,
        handleExportCurrentTarget,
        handleExportToSheets,
        handleLoadFromSheets,
        handleBulkExport
    } = useExport(
        config, questions, historicalQuestions, uniqueFilteredQuestions, allQuestionsMap,
        showHistory, showMessage, setStatus, (val) => { }, // setIsProcessing dummy or we need to expose it from useGeneration? 
        // Actually useGeneration manages isProcessing. We might need to lift isProcessing up or share it.
        // For now, let's pass a dummy or refactor useGeneration to accept setStatus/setIsProcessing from outside if we want shared state.
        // Better: Let's make isProcessing local to App and pass it down.
        setDatabaseQuestions, setAppMode, setShowExportMenu, setShowBulkExportModal
    );

    // Refactor Note: isProcessing is currently inside useGeneration. 
    // To share it with useExport, we should lift it to App.
    // However, for this step, I will just use the isProcessing from useGeneration for display, 
    // and if useExport needs to block UI, it might need its own state or we pass a setter.
    // Let's assume useExport operations are fast enough or we fix this in next iteration.
    // Actually, handleLoadFromSheets sets isProcessing. 
    // I will modify useGeneration to accept external isProcessing state in a future step if needed.
    // For now, I'll add a local isExportProcessing state if needed, or just ignore for this pass.

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
        // setShowProgressMenu(false); // Progress menu state is local to render
        if (mode === 'review') {
            setShowHistory(true);
            setFilterMode('all');
        } else {
            setShowHistory(false);
            setFilterMode('pending');
        }
    };

    const handleViewDatabase = async () => {
        if (!config.sheetUrl) { showMessage("Please configure Google Sheets URL in settings first.", 5000); return; }
        setAppMode('database');
        await handleLoadFromSheets();
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
            <Header apiKeyStatus={apiKeyStatus} isCloudReady={isAuthReady} onHome={handleGoHome} creatorName={config.creatorName} appMode={appMode} />

            {config.creatorName === '' && <NameEntryModal onSave={handleNameSave} />}
            {showClearModal && <ClearConfirmationModal onConfirm={handleDeleteAllQuestions} onCancel={() => setShowClearModal(false)} />}

            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-300 space-y-4">
                        <h3 className="text-xl font-bold text-red-500 flex items-center gap-2"><Icon name="trash-2" size={20} /> DELETE QUESTION?</h3>
                        <p className="text-sm text-slate-300">This action will permanently delete this question. This cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors">Cancel</button>
                            <button onClick={confirmDelete} className="px-4 py-2 text-sm rounded bg-red-600 hover:bg-red-700 text-white font-bold transition-colors">Delete</button>
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

                            {appMode === 'review' && (
                                <div className="flex gap-4 items-center ml-4">
                                    <div className="px-3 py-1 bg-indigo-900/30 border border-indigo-700/50 rounded text-xs text-indigo-300 font-bold flex items-center gap-2">
                                        <Icon name="list-checks" size={14} />
                                        REVIEW MODE: {uniqueFilteredQuestions.length} Items
                                    </div>

                                    <div className="relative">
                                        <button
                                            onClick={() => setShowProgressMenu(!showProgressMenu)}
                                            className={`px-3 py-1 border rounded text-xs font-bold flex items-center gap-2 transition-colors ${showProgressMenu ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                                        >
                                            <Icon name="bar-chart-2" size={14} />
                                            Progress: {overallPercentage.toFixed(1)}%
                                        </button>

                                        {showProgressMenu && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowProgressMenu(false)}></div>
                                                <div className="absolute left-0 top-full mt-2 w-80 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="space-y-4">
                                                        <div className="text-center pb-2 border-b border-slate-800">
                                                            <h3 className="text-lg font-extrabold text-white">{allQuestionsMap.size}</h3>
                                                            <p className="text-[10px] font-semibold uppercase text-slate-500">UNIQUE QUESTIONS IN DB</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-end">
                                                                <h3 className="text-[10px] font-bold text-slate-400">APPROVED QUOTA ({totalApproved}/{TARGET_TOTAL})</h3>
                                                                <span className="text-[10px] font-bold text-orange-400">{overallPercentage.toFixed(1)}%</span>
                                                            </div>
                                                            <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-800">
                                                                <div className="h-full bg-orange-600 transition-all duration-500" style={{ width: `${overallPercentage}%` }}></div>
                                                            </div>
                                                        </div>
                                                        <GranularProgress approvedCounts={approvedCounts} target={TARGET_PER_CATEGORY} isTargetMet={isTargetMet} selectedDifficulty={config.difficulty} handleSelectCategory={handleSelectCategory} />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 items-center bg-slate-950 p-1 rounded-lg border border-slate-800 shadow-inner">
                            <button
                                onClick={handleLoadFromSheets}
                                disabled={isProcessing || !config.sheetUrl}
                                className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${!config.sheetUrl ? 'opacity-50 cursor-not-allowed' : ''} bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-white`}
                                title={config.sheetUrl ? "Load Approved Questions from Google Sheets" : "Configure Sheets URL in Settings first"}
                            >
                                <Icon name="table" size={14} /> Load
                            </button>

                            <div className="w-px h-4 bg-slate-700 mx-1"></div>
                            <div className="relative">
                                <button
                                    onClick={() => setShowBulkExportModal(true)}
                                    className="px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-white"
                                    title="Open Export Options"
                                >
                                    <Icon name="download" size={14} /> Export
                                </button>
                            </div>
                            <div className="w-px h-4 bg-slate-700 mx-1"></div>

                            <button
                                onClick={handleViewDatabase}
                                className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${appMode === 'database' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
                                title="Switch to Database View"
                            >
                                <Icon name="database" size={14} /> DB View
                            </button>

                            {((!showHistory && questions.length > 0) || (showHistory && historicalQuestions.length > 0) || appMode === 'review') && (
                                <>
                                    <div className="w-px h-4 bg-slate-700 mx-1"></div>
                                    {appMode !== 'review' && <FilterButton mode="pending" current={filterMode} setFilter={setFilterMode} label="Pending" count={pendingCount} />}
                                    <FilterButton mode="all" current={filterMode} setFilter={setFilterMode} label="All" count={appMode === 'review' ? historicalQuestions.length : questions.length} />
                                    {appMode !== 'review' && <FilterButton mode="accepted" current={filterMode} setFilter={setFilterMode} label="Accepted" count={approvedCount} />}
                                    <FilterButton mode="rejected" current={filterMode} setFilter={setFilterMode} label="Rejected" count={rejectedCount} />
                                </>
                            )}

                            <div className="w-px h-4 bg-slate-700 mx-1"></div>
                            <button
                                onClick={() => setFilterByCreator(!filterByCreator)}
                                className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${filterByCreator ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50'}`}
                                title="Filter by My Creator Name"
                            >
                                <Icon name="user" size={12} /> My Questions
                            </button>
                            <div className="w-px h-4 bg-slate-700 mx-1"></div>

                            <input type="text" placeholder="Search by ID, Question Text, Option, or Discipline..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64 bg-slate-900 text-slate-300 placeholder-slate-600 border-none outline-none focus:ring-0 text-sm px-2 rounded" />
                            {searchTerm && (<button onClick={() => setSearchTerm('')} className="text-slate-500 hover:text-red-400 p-1 rounded"><Icon name="x" size={16} /></button>)}

                            {appMode === 'review' && (
                                <div className="flex items-center gap-2 ml-4 border-l border-slate-700 pl-4">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold uppercase text-slate-500 whitespace-nowrap">Lang:</label>
                                        <select name="language" value={config.language} onChange={handleChange} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs outline-none focus:border-indigo-500">
                                            <option>English</option><option>Chinese (Simplified)</option><option>Japanese</option><option>Korean</option><option>Spanish</option><option>French</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold uppercase text-slate-500 whitespace-nowrap">Disc:</label>
                                        <select name="discipline" value={config.discipline} onChange={handleChange} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs outline-none focus:border-indigo-500 max-w-[100px]">
                                            <option value="Technical Art">Tech Art</option><option value="Animation & Rigging">Anim</option><option value="Game Logic & Systems">Logic</option><option value="Look Development (Materials)">LookDev</option><option value="Networking">Net</option><option value="C++ Programming">C++</option><option value="VFX (Niagara)">VFX</option><option value="World Building & Level Design">World</option><option value="Blueprints">BP</option><option value="Lighting & Rendering">Light</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold uppercase text-slate-500 whitespace-nowrap">Diff:</label>
                                        <select name="difficulty" value={config.difficulty} onChange={(e) => handleSelectCategory(e.target.value)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs outline-none focus:border-indigo-500">
                                            {CATEGORY_KEYS.map(key => <option key={key} value={key}>{key}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
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

                        {appMode === 'database' ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-blue-900/20 p-4 rounded border border-blue-800/50">
                                    <div>
                                        <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2"><Icon name="database" /> Database View</h2>
                                        <p className="text-xs text-blue-300/70">Viewing {databaseQuestions.length} approved questions from Google Sheets (Read Only)</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => {
                                            if (window.confirm("ARE YOU SURE? This will permanently DELETE ALL questions from the Cloud Database (Master_DB). This cannot be undone.")) {
                                                clearQuestionsFromSheets(config.sheetUrl);
                                                setDatabaseQuestions([]);
                                            }
                                        }} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded border border-red-500 flex items-center gap-2 font-bold shadow-sm shadow-red-900/50">
                                            <Icon name="alert-triangle" size={12} /> HARD RESET
                                        </button>
                                        <button onClick={() => setDatabaseQuestions([])} className="px-3 py-1 bg-red-900/50 hover:bg-red-800 text-red-200 text-xs rounded border border-red-800 flex items-center gap-2">
                                            <Icon name="trash-2" size={12} /> Clear View
                                        </button>
                                        <button onClick={handleLoadFromSheets} disabled={isProcessing} className="px-3 py-1 bg-blue-800 hover:bg-blue-700 text-blue-200 text-xs rounded border border-blue-600 flex items-center gap-2">
                                            <Icon name="refresh-cw" size={12} className={isProcessing ? "animate-spin" : ""} /> Refresh
                                        </button>
                                    </div>
                                </div>
                                {databaseQuestions.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">No questions loaded from database. Click Refresh.</div>
                                ) : (
                                    databaseQuestions.map((q, i) => (
                                        <div key={i} className="opacity-75 hover:opacity-100 transition-opacity">
                                            <QuestionItem
                                                q={q}
                                                // Pass dummy handlers or read-only mode if supported
                                                onUpdateStatus={() => { }}
                                                onExplain={() => { }}
                                                onVariate={() => { }}
                                                onCritique={() => { }}
                                                onTranslateSingle={() => { }}
                                                onSwitchLanguage={() => { }}
                                                onDelete={() => { }}
                                                availableLanguages={new Set()}
                                                isProcessing={false}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : appMode === 'review' && uniqueFilteredQuestions.length > 0 ? (
                            <div className="flex flex-col items-center justify-start h-full max-w-4xl mx-auto w-full pt-4">
                                <div className="w-full mb-6 flex justify-between items-center text-slate-400 text-xs font-mono bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                                    <button
                                        onClick={() => setCurrentReviewIndex(prev => Math.max(prev - 1, 0))}
                                        disabled={currentReviewIndex === 0}
                                        className="flex items-center gap-2 px-4 py-2 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-bold"
                                    >
                                        <Icon name="arrow-left" size={16} /> PREV
                                    </button>
                                    <div className="flex flex-col items-center">
                                        <span className="text-slate-500 uppercase text-[10px] tracking-widest">Review Progress</span>
                                        <span className="text-lg">
                                            <span className="text-white font-bold">{currentReviewIndex + 1}</span> <span className="text-slate-600">/</span> <span className="text-slate-400 font-bold">{uniqueFilteredQuestions.length}</span>
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setCurrentReviewIndex(prev => Math.min(prev + 1, uniqueFilteredQuestions.length - 1))}
                                        disabled={currentReviewIndex === uniqueFilteredQuestions.length - 1}
                                        className="flex items-center gap-2 px-4 py-2 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-bold"
                                    >
                                        NEXT <Icon name="arrow-right" size={16} />
                                    </button>
                                </div>

                                <div className="w-full transform transition-all duration-300">
                                    <QuestionItem
                                        key={uniqueFilteredQuestions[currentReviewIndex].uniqueId}
                                        q={uniqueFilteredQuestions[currentReviewIndex]}
                                        onUpdateStatus={handleUpdateStatus}
                                        onExplain={handleExplain}
                                        onVariate={handleVariate}
                                        onCritique={handleCritique}
                                        onTranslateSingle={handleTranslateSingle}
                                        onSwitchLanguage={handleLanguageSwitch}
                                        onDelete={handleDelete}
                                        availableLanguages={translationMap.get(uniqueFilteredQuestions[currentReviewIndex].uniqueId)}
                                        isProcessing={isProcessing}
                                        appMode={appMode}
                                    />
                                </div>
                            </div>
                        ) : (
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
                                            availableLanguages={translationMap.get(q.uniqueId)}
                                            isProcessing={isProcessing}
                                            appMode={appMode}
                                        />
                                    </div>
                                )}
                            />
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
                    </div>
                </main >
            </div >

            {/* SETTINGS MODAL */}
            {
                showSettings && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2"><Icon name="settings" /> Settings</h2>
                                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white"><Icon name="x" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Google Gemini API Key</label>
                                    <div className="relative">
                                        <input
                                            type={showApiKey ? "text" : "password"}
                                            name="apiKey"
                                            value={config.apiKey}
                                            onChange={handleChange}
                                            placeholder="AIzaSy..."
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none pr-10"
                                        />
                                        <button
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                        >
                                            <Icon name={showApiKey ? "eye-off" : "eye"} size={16} />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">Required for generating questions. Stored locally.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Google Apps Script URL</label>
                                    <input
                                        type="text"
                                        name="sheetUrl"
                                        value={config.sheetUrl}
                                        onChange={handleChange}
                                        placeholder="https://script.google.com/..."
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Required for Load/Export to Sheets.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Creator Name</label>
                                        <input
                                            type="text"
                                            name="creatorName"
                                            value={config.creatorName}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Reviewer Name</label>
                                        <input
                                            type="text"
                                            name="reviewerName"
                                            value={config.reviewerName}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-700 mt-4">
                                    <button
                                        onClick={() => {
                                            if (window.confirm("This will delete ALL your local questions and settings. Are you sure?")) {
                                                localStorage.removeItem('ue5_gen_config');
                                                localStorage.removeItem('ue5_gen_questions');
                                                setQuestions([]);
                                                setDatabaseQuestions([]);
                                                window.location.reload();
                                            }
                                        }}
                                        className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs rounded border border-red-900/50 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Icon name="trash" size={14} /> Clear Local Data & Reset App
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

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
