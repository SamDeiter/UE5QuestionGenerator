import { useState } from 'react';
import { sanitizeText } from '../../utils/stringHelpers';
import Icon from '../Icon';

const QuestionContent = ({
    q,
    isEditing,
    editedText,
    setEditedText,
    setIsEditing,
    onUpdateQuestion,
    showMessage,
    appMode,
    isAdmin = false
}) => {
    // Track which version to display (0 = original, 1+ = alternatives)
    const [alternativeIndex, setAlternativeIndex] = useState(0);
    
    // Get all versions (original + alternatives)
    const allVersions = [q, ...(q.alternatives || [])];
    const totalVersions = allVersions.length;
    const hasAlternatives = q.hasAlternatives && q.alternatives && q.alternatives.length > 0;
    
    // Current displayed question (original or alternative)
    const displayedQ = allVersions[alternativeIndex] || q;

    const canGoPrev = alternativeIndex > 0;
    const canGoNext = alternativeIndex < totalVersions - 1;

    const handlePrev = () => {
        if (canGoPrev) setAlternativeIndex(prev => prev - 1);
    };

    const handleNext = () => {
        if (canGoNext) setAlternativeIndex(prev => prev + 1);
    };

    const handleSelectVersion = () => {
        if (alternativeIndex > 0 && onUpdateQuestion) {
            // User selected an alternative - replace original with this version
            const selectedAlt = displayedQ;
            onUpdateQuestion(q.id, {
                ...q,
                question: selectedAlt.question,
                options: selectedAlt.options,
                correct: selectedAlt.correct,
                alternatives: null,
                hasAlternatives: false,
                critique: null,
                critiqueScore: null
            });
            setAlternativeIndex(0);
            if (showMessage) showMessage('✓ Applied alternative version!', 3000);
        }
    };

    return (
        <>
            {/* Alternative Navigation Bar */}
            {hasAlternatives && (
                <div className="flex items-center justify-center gap-4 mb-4 p-2 bg-purple-950/30 border border-purple-500/30 rounded-lg">
                    <button
                        onClick={handlePrev}
                        disabled={!canGoPrev}
                        className="p-2 rounded hover:bg-purple-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Previous version"
                    >
                        <Icon name="arrow-left" size={18} className="text-purple-400" />
                    </button>

                    <div className="flex flex-col items-center">
                        <span className="text-xs uppercase tracking-widest text-purple-400 font-bold">
                            {alternativeIndex === 0 ? '📝 Original' : `🔄 Alternative ${alternativeIndex}`}
                        </span>
                        <span className="text-sm font-bold">
                            <span className="text-white">{alternativeIndex + 1}</span>
                            <span className="text-slate-600 mx-1">/</span>
                            <span className="text-slate-400">{totalVersions}</span>
                        </span>
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={!canGoNext}
                        className="p-2 rounded hover:bg-purple-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Next version"
                    >
                        <Icon name="arrow-right" size={18} className="text-purple-400" />
                    </button>

                    {/* Use This Version button */}
                    {alternativeIndex > 0 && (
                        <button
                            onClick={handleSelectVersion}
                            className="ml-4 px-4 py-1.5 rounded bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg"
                        >
                            <Icon name="check" size={14} className="inline mr-1" />
                            Use This Version
                        </button>
                    )}
                </div>
            )}

            <div className="mb-4">
                {isEditing ? (
                    <div className="flex flex-col gap-2">
                        <textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="w-full bg-slate-800 border border-indigo-500 rounded-lg p-3 text-slate-200 text-base resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            rows={3}
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => { setIsEditing(false); setEditedText(q.question); }} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg">Cancel</button>
                            <button onClick={() => { if (onUpdateQuestion) { onUpdateQuestion(q.id, { question: editedText }); } setIsEditing(false); if (showMessage) showMessage('Question updated'); }} className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold">Save</button>
                        </div>
                    </div>
                ) : (
                    <h3
                        className={`text-base font-medium leading-relaxed ${isAdmin && appMode !== 'database' ? 'cursor-pointer hover:bg-slate-800/50' : 'cursor-default'} rounded px-1 -mx-1 transition-colors ${q.status === 'rejected' ? 'text-slate-600 line-through decoration-slate-700' : 'text-slate-200'}`}
                        dangerouslySetInnerHTML={{ __html: sanitizeText(displayedQ.question) }}
                        onClick={() => isAdmin && appMode !== 'database' && setIsEditing(true)}
                        title={isAdmin && appMode !== 'database' ? 'Click to edit (Admin only)' : ''}
                    />
                )}
                <div className="flex items-center gap-3 mt-2">
                    {/* DEBUG ID: Helps verify linking */}
                    {q.uniqueId && (
                        <div className="text-[9px] text-slate-700 font-mono cursor-help" title={`Unique ID: ${q.uniqueId} (Use this to link translations)`}>
                            #{q.uniqueId.substring(0, 8)} | {q.language || 'English'}
                        </div>
                    )}
                </div>
            </div>

            {displayedQ.type === 'Multiple Choice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    {Object.entries(displayedQ.options || {}).map(([key, val]) => {
                        const isCorrect = displayedQ.correct === key;
                        // SAFEGUARD: If option text is missing/empty, show placeholder to maintain layout
                        const optionText = val && val.trim() ? val : "(Empty)";
                        return (
                            <div key={key} className={`text-sm p-2 rounded border transition-all ${isCorrect ? 'bg-green-700/50 border-green-400 text-white shadow-[0_0_10px_-3px_rgba(34,197,94,0.5)]' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                                <span className={`font-bold mr-2 ${isCorrect ? 'text-white' : 'text-slate-600'}`}>{key})</span>
                                <span dangerouslySetInnerHTML={{ __html: sanitizeText(optionText) }} />
                            </div>
                        );
                    })}
                </div>
            )}

            {displayedQ.type === 'True/False' && (
                <div className="flex gap-4 mb-4">
                    <div className={`px-3 py-1 rounded text-xs border transition-all ${displayedQ.correct === 'A' ? 'bg-green-700/50 border-green-400 text-white shadow-[0_0_10px_-3px_rgba(34,197,94,0.5)]' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>TRUE</div>
                    <div className={`px-3 py-1 rounded text-xs border transition-all ${displayedQ.correct === 'B' ? 'bg-red-700/50 border-red-400 text-white shadow-[0_0_10px_-3px_rgba(239,68,68,0.5)]' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>FALSE</div>
                </div>
            )}
        </>
    );
};

export default QuestionContent;
