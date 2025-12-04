import React, { useState, useMemo } from 'react';
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
    showMessage
}) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [sortBy, setSortBy] = useState('default'); // default, language, discipline, difficulty

    const sortedQuestions = useMemo(() => {
        if (!questions) return [];
        const sorted = [...questions];
        switch (sortBy) {
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
    }, [questions, sortBy]);

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

    const handleHardReset = () => {
        if (window.confirm("ARE YOU SURE? This will permanently DELETE ALL questions from the Cloud Database (Master_DB). This cannot be undone.")) {
            clearQuestionsFromSheets(sheetUrl);
            onHardReset();
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
                        <p className="text-xs text-blue-300/70">Viewing {questions.length} approved questions from Google Sheets (Read Only)</p>
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
                            <option value="language">Language (A-Z)</option>
                            <option value="discipline">Discipline (A-Z)</option>
                            <option value="difficulty">Difficulty (Easy-Hard)</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleSyncToFirestore}
                        disabled={isSyncing || questions.length === 0}
                        className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded border border-orange-500 flex items-center gap-2 font-bold shadow-sm"
                    >
                        {isSyncing ? (
                            <>
                                <Icon name="loader" size={12} className="animate-spin" /> {syncProgress}%
                            </>
                        ) : (
                            <>
                                <Icon name="upload-cloud" size={12} /> Sync to Firestore
                            </>
                        )}
                    </button>
                    <button onClick={handleHardReset} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded border border-red-500 flex items-center gap-2 font-bold shadow-sm shadow-red-900/50">
                        <Icon name="alert-triangle" size={12} /> HARD RESET
                    </button>
                    <button onClick={onClearView} className="px-3 py-1 bg-red-900/50 hover:bg-red-800 text-red-200 text-xs rounded border border-red-800 flex items-center gap-2">
                        <Icon name="trash-2" size={12} /> Clear View
                    </button>
                    <button onClick={onLoadFirestore} disabled={isProcessing} className="px-3 py-1 bg-indigo-800 hover:bg-indigo-700 text-indigo-200 text-xs rounded border border-indigo-600 flex items-center gap-2">
                        <Icon name="cloud-lightning" size={12} className={isProcessing ? "animate-pulse" : ""} /> Load Firestore
                    </button>
                    <button onClick={onLoad} disabled={isProcessing} className="px-3 py-1 bg-blue-800 hover:bg-blue-700 text-blue-200 text-xs rounded border border-blue-600 flex items-center gap-2">
                        <Icon name="refresh-cw" size={12} className={isProcessing ? "animate-spin" : ""} /> Load Sheets
                    </button>
                </div>
            </div>

            <MetricsDashboard questions={questions} />

            {sortedQuestions.length === 0 ? (
                <div className="text-center py-10 text-slate-500">No questions loaded from database. Click Refresh.</div>
            ) : (
                sortedQuestions.map((q, i) => (
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
