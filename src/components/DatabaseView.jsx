import React, { useState, useMemo, useRef, useEffect } from 'react';
import Icon from './Icon';
import QuestionItem from './QuestionItem';
import MetricsDashboard from './MetricsDashboard';
import { clearQuestionsFromSheets } from '../services/googleSheets';
import { saveQuestionToFirestore } from '../services/firebase';

const DatabaseView = ({
    questions,
    sheetUrl,
    onLoad,
    onLoadFirestore,
    onClearView,
    onHardReset,
    onUpdateQuestion,
    onKickBack,
    isProcessing,
    showMessage,
    filterMode = 'all' // Default to 'all' if not provided
}) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [sortBy, setSortBy] = useState('default'); // default, language, discipline, difficulty
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [loadMenuOpen, setLoadMenuOpen] = useState(false);
    const optionsRef = useRef(null);
    const loadMenuRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (optionsRef.current && !optionsRef.current.contains(event.target)) {
                setOptionsOpen(false);
            }
            if (loadMenuRef.current && !loadMenuRef.current.contains(event.target)) {
                setLoadMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const sortedQuestions = useMemo(() => {
        if (!questions) return [];

        // 1. Filter first
        let filtered = questions;
        if (filterMode === 'accepted') {
            filtered = filtered.filter(q => q.status === 'accepted');
        } else if (filterMode === 'rejected') {
            filtered = filtered.filter(q => q.status === 'rejected');
        } else if (filterMode === 'pending') {
            filtered = filtered.filter(q => !q.status || q.status === 'pending');
        }

        // 2. Then Sort
        const sorted = [...filtered];
        switch (sortBy) {
            case 'newest':
                return sorted.sort((a, b) => {
                    const dateA = a.createdAt || a.id || 0;
                    const dateB = b.createdAt || b.id || 0;
                    return dateB - dateA; // Descending (newest first)
                });
            case 'oldest':
                return sorted.sort((a, b) => {
                    const dateA = a.createdAt || a.id || 0;
                    const dateB = b.createdAt || b.id || 0;
                    return dateA - dateB; // Ascending (oldest first)
                });
            case 'language':
                return sorted.sort((a, b) => (a.language || 'English').localeCompare(b.language || 'English'));
            case 'discipline':
                return sorted.sort((a, b) => (a.discipline || '').localeCompare(b.discipline || ''));
            case 'difficulty':
                const diffOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
                return sorted.sort((a, b) => (diffOrder[a.difficulty] || 0) - (diffOrder[b.difficulty] || 0));
            case 'default':
            default:
                return sorted; // Keep original sheet order
        }
    }, [questions, sortBy, filterMode]);

    // Calculate available languages for each uniqueId
    const translationMap = useMemo(() => {
        if (!questions) return new Map();
        const map = new Map();
        questions.forEach(q => {
            if (!q.uniqueId) return;
            if (!map.has(q.uniqueId)) {
                map.set(q.uniqueId, new Set());
            }
            map.get(q.uniqueId).add(q.language || 'English');
        });
        return map;
    }, [questions]);

    // Map uniqueId+language -> question for quick lookup
    const questionsByIdAndLang = useMemo(() => {
        if (!questions) return new Map();
        const map = new Map();
        questions.forEach(q => {
            if (!q.uniqueId) return;
            const key = `${q.uniqueId}::${q.language || 'English'}`;
            map.set(key, q);
        });
        return map;
    }, [questions]);

    // Handle language switch - find and scroll to the matching translation
    const handleSwitchLanguage = (currentQuestion, targetLang) => {
        if (!currentQuestion.uniqueId) {
            showMessage(`Cannot switch: Question has no unique ID for linking translations.`);
            return;
        }

        const key = `${currentQuestion.uniqueId}::${targetLang}`;
        const targetQuestion = questionsByIdAndLang.get(key);

        if (targetQuestion) {
            // Find the question in the DOM and scroll to it
            const index = sortedQuestions.findIndex(q => q.id === targetQuestion.id);
            if (index !== -1) {
                // Scroll to the question
                const element = document.querySelector(`[data-question-index="${index}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-green-500');
                    setTimeout(() => element.classList.remove('ring-2', 'ring-green-500'), 2000);
                }
                showMessage(`Scrolled to ${targetLang} version.`);
            }
        } else {
            // Translation exists in theory but not in current dataset
            showMessage(`${targetLang} version not found in current view. Try using "Sort by Language" to find it.`);
        }
    };

    const handleHardReset = () => {
        const firstConfirm = window.confirm(
            "⚠️ WARNING: HARD RESET ⚠️\n\n" +
            "This will PERMANENTLY DELETE ALL questions from:\n" +
            "• Your Google Spreadsheet (Master_DB)\n" +
            "• Firestore Database (Cloud)\n" +
            "• Your local view\n\n" +
            "PRESERVED: API Key, Sheet URL, Analytics (usage/cost)\n\n" +
            "This action CANNOT be undone. Continue?"
        );

        if (firstConfirm) {
            const secondConfirm = window.confirm(
                "🔴 FINAL CONFIRMATION 🔴\n\n" +
                "Type 'DELETE' in the next prompt to confirm.\n\n" +
                "Click OK to proceed to final confirmation."
            );

            if (secondConfirm) {
                const typed = window.prompt("Type DELETE to confirm permanent deletion:");
                if (typed === "DELETE") {
                    clearQuestionsFromSheets(sheetUrl);
                    onHardReset();
                } else {
                    alert("Hard reset cancelled. You did not type 'DELETE'.");
                }
            }
        }
    };

    const handleSyncToFirestore = async () => {
        console.log("Sync button clicked. Questions:", questions?.length);
        if (!questions || questions.length === 0) {
            console.warn("No questions to sync.");
            alert("No questions loaded to sync.");
            return;
        }

        if (!window.confirm(`Sync ${questions.length} questions to Firestore? This will overwrite existing documents with the same ID.`)) {
            console.log("Sync cancelled by user.");
            return;
        }

        console.log("Starting sync...");
        setIsSyncing(true);
        setSyncProgress(0);
        let count = 0;

        try {
            // Process in chunks to avoid overwhelming the browser/network
            const chunkSize = 10;
            for (let i = 0; i < questions.length; i += chunkSize) {
                const chunk = questions.slice(i, i + chunkSize);
                console.log(`Syncing chunk ${i / chunkSize + 1}, size: ${chunk.length}`);
                await Promise.all(chunk.map(q => saveQuestionToFirestore(q)));
                count += chunk.length;
                setSyncProgress(Math.round((count / questions.length) * 100));
            }
            console.log("Sync complete.");
            alert(`Successfully synced ${count} questions to Firestore!`);
        } catch (error) {
            console.error("Sync failed:", error);
            alert(`Sync failed: ${error.message}`);
        } finally {
            setIsSyncing(false);
            setSyncProgress(0);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-blue-900/20 p-4 rounded border border-blue-800/50">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2"><Icon name="database" /> Database View</h2>
                        <p className="text-xs text-blue-300/70">Viewing {sortedQuestions.length} of {questions.length} questions from Google Sheets (Read Only)</p>
                    </div>

                    {/* Sort Control */}
                    <div className="flex items-center gap-2 ml-4 bg-slate-900/50 p-1.5 rounded border border-slate-700">
                        <span className="text-xs font-bold text-slate-400 uppercase">Sort By:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-slate-800 text-slate-200 text-xs border border-slate-600 rounded px-2 py-1 outline-none focus:border-blue-500"
                        >
                            <option value="default">Default (Sheet Order)</option>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="language">Language (A-Z)</option>
                            <option value="discipline">Discipline (A-Z)</option>
                            <option value="difficulty">Difficulty (Easy-Hard)</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* Load Data Dropdown */}
                    <div className="relative" ref={loadMenuRef}>
                        <button
                            onClick={() => setLoadMenuOpen(!loadMenuOpen)}
                            disabled={isProcessing}
                            className="px-3 py-1 bg-blue-800 hover:bg-blue-700 text-blue-200 text-xs rounded border border-blue-600 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Icon name="download" size={12} className={isProcessing ? "animate-pulse" : ""} />
                            Load Data
                            <Icon name="chevron-down" size={10} className={`transition-transform ${loadMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {loadMenuOpen && (
                            <div className="absolute left-0 top-full mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="py-1">
                                    <button
                                        onClick={() => { onLoadFirestore(); setLoadMenuOpen(false); }}
                                        disabled={isProcessing}
                                        className="w-full text-left px-4 py-2 text-xs text-indigo-300 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Icon name="cloud-lightning" size={14} />
                                        From Firestore
                                    </button>
                                    <button
                                        onClick={() => { onLoad(); setLoadMenuOpen(false); }}
                                        disabled={isProcessing}
                                        className="w-full text-left px-4 py-2 text-xs text-blue-300 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Icon name="refresh-cw" size={14} />
                                        From Google Sheets
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Options Dropdown - Contains dangerous actions (placed last) */}
                    <div className="relative" ref={optionsRef}>
                        <button
                            onClick={() => setOptionsOpen(!optionsOpen)}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded border border-slate-600 flex items-center gap-2"
                        >
                            <Icon name="settings" size={12} />
                            Options
                            <Icon name="chevron-down" size={10} className={`transition-transform ${optionsOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {optionsOpen && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="py-1">
                                    {/* Sync to Firestore */}
                                    <button
                                        onClick={() => { handleSyncToFirestore(); setOptionsOpen(false); }}
                                        disabled={isSyncing || questions.length === 0}
                                        className="w-full text-left px-4 py-2 text-xs text-orange-300 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isSyncing ? (
                                            <>
                                                <Icon name="loader" size={14} className="animate-spin" /> Syncing {syncProgress}%
                                            </>
                                        ) : (
                                            <>
                                                <Icon name="upload-cloud" size={14} /> Sync to Firestore
                                            </>
                                        )}
                                    </button>

                                    <div className="border-t border-slate-700 my-1"></div>

                                    {/* Clear View */}
                                    <button
                                        onClick={() => { onClearView(); setOptionsOpen(false); }}
                                        className="w-full text-left px-4 py-2 text-xs text-red-300 hover:bg-slate-700 flex items-center gap-2"
                                    >
                                        <Icon name="trash-2" size={14} /> Clear View
                                    </button>

                                    {/* HARD RESET - Extra warning styling */}
                                    <button
                                        onClick={() => { handleHardReset(); setOptionsOpen(false); }}
                                        className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-900/30 flex items-center gap-2 font-bold"
                                    >
                                        <Icon name="alert-triangle" size={14} /> HARD RESET (Danger!)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <MetricsDashboard questions={questions} />

            {sortedQuestions.length === 0 ? (
                <div className="text-center py-10 text-slate-500">No questions loaded from database. Click Refresh.</div>
            ) : (
                sortedQuestions.map((q, i) => (
                    <div key={i} data-question-index={i} className="opacity-75 hover:opacity-100 transition-all">
                        <QuestionItem
                            q={q}
                            // Pass dummy handlers or read-only mode if supported
                            onUpdateStatus={() => { }}
                            onExplain={() => { }}
                            onVariate={() => { }}
                            onCritique={() => { }}
                            onTranslateSingle={() => { }}
                            onSwitchLanguage={(targetLang) => handleSwitchLanguage(q, targetLang)}
                            onDelete={() => { }}
                            onUpdateQuestion={onUpdateQuestion}
                            onKickBack={onKickBack}
                            availableLanguages={translationMap.get(q.uniqueId)}
                            isProcessing={false}
                            appMode="database"
                            showMessage={showMessage}
                        />
                    </div>
                ))
            )}
        </div>
    );
};

export default DatabaseView;
