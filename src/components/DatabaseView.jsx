import { useState, useMemo, useRef, useEffect } from 'react';
import Icon from './Icon';
import MetricsDashboard from './MetricsDashboard';
import QuestionItem from './QuestionItem';
const DatabaseView = ({
    questions,
    _sheetUrl,
    _onLoad,
    _onLoadFirestore,
    _onClearView,
    _onHardReset,
    onUpdateQuestion,
    onKickBack,
    _isProcessing,
    showMessage,
    filterMode = 'all', // Default to 'all' if not provided
    sortBy = 'default', // Default to 'default' if not provided
    onStartTutorial // Callback to trigger database tutorial
}) => {
    const [_isSyncing, _setIsSyncing] = useState(false);
    const [_syncProgress, _setSyncProgress] = useState(0);
    // sortBy is now a prop
    const [_loadMenuOpen, setLoadMenuOpen] = useState(false);
    const loadMenuRef = useRef(null);

    // Auto-start tutorial if not completed
    useEffect(() => {
        const isCompleted = localStorage.getItem('ue5_tutorial_database_completed');
        if (!isCompleted && onStartTutorial) {
            // Small delay to ensure view is rendered
            setTimeout(() => onStartTutorial('database'), 500);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (loadMenuRef.current && !loadMenuRef.current.contains(event.target)) {
                setLoadMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const sortedQuestions = useMemo(() => {
        if (!questions) return [];

        // Database mode shows ALL questions - no status filtering
        // (status filtering is for Review mode only)
        const filtered = questions;

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
            case 'difficulty': {
                const diffOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
                return sorted.sort((a, b) => (diffOrder[a.difficulty] || 0) - (diffOrder[b.difficulty] || 0));
            }
            case 'default':
            default:
                return sorted; // Keep original sheet order
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-blue-900/20 p-4 rounded border border-blue-800/50">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2"><Icon name="database" /> Database View</h2>
                        <p className="text-xs text-blue-300/70">Viewing {sortedQuestions.length} of {questions.length} loaded records</p>
                    </div>
                </div>
            </div>

            <MetricsDashboard questions={questions} />

            <div data-tour="database-grid">
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
        </div>
    );
};

export default DatabaseView;
