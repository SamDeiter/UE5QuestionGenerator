import { sanitizeText } from '../utils/sanitize';
import Icon from './Icon';
import { renderMarkdown, computeWordDiff } from '../utils/stringHelpers';

/**
 * Renders inline word-level diff with highlighting
 * @param {string} oldText - Original text
 * @param {string} newText - New text
 */
const _DiffText = ({ oldText, newText }) => {
    const diff = computeWordDiff(oldText || '', newText || '');

    if (diff.length === 0) return null;

    // Check if there are any actual changes
    const hasChanges = diff.some(seg => seg.type !== 'unchanged');

    if (!hasChanges) {
        return <span className="text-slate-300">{oldText}</span>;
    }

    return (
        <span className="leading-relaxed">
            {diff.map((segment, idx) => {
                if (segment.type === 'removed') {
                    return (
                        <span
                            key={idx}
                            className="text-slate-500 line-through"
                        >
                            {segment.text}
                        </span>
                    );
                }
                if (segment.type === 'added') {
                    return (
                        <span
                            key={idx}
                            className="bg-green-900/50 text-green-300 font-semibold px-0.5 rounded"
                        >
                            {segment.text}
                        </span>
                    );
                }
                return <span key={idx} className="text-slate-300">{segment.text}</span>;
            })}
        </span>
    );
};

const CritiqueModal = ({ isOpen, onClose, q, text, score, loading, onFix, isFixing, onAccept, rewrite, changes, onApplySuggestions }) => {
    if (!isOpen || !q) return null;

    const getSeverityStyles = (score) => {
        if (score === null || score === undefined) return { bg: 'bg-slate-800', border: 'border-slate-700', text: 'text-slate-400', icon: 'text-slate-500' };

        // STRICTER COLOR THRESHOLDS
        // 90-100: Green (Excellent/Perfect)
        if (score >= 90) return { bg: 'bg-emerald-950/40', border: 'border-emerald-500/50', text: 'text-emerald-200', icon: 'text-emerald-400', label: 'Excellent' };

        // 70-89: Yellow (Good but flawed)
        if (score >= 70) return { bg: 'bg-yellow-950/40', border: 'border-yellow-500/50', text: 'text-yellow-200', icon: 'text-yellow-400', label: 'Good' };

        // 50-69: Orange (Mediocre)
        if (score >= 50) return { bg: 'bg-orange-950/40', border: 'border-orange-500/50', text: 'text-orange-200', icon: 'text-orange-400', label: 'Mediocre' };

        // 0-49: Red (Critical)
        return { bg: 'bg-red-950/40', border: 'border-red-500/50', text: 'text-red-200', icon: 'text-red-400', label: 'Critical' };
    };

    const styles = getSeverityStyles(score);
    const isFailing = score !== null && score <= 50;

    // Check if question was changed
    const questionChanged = rewrite?.question && rewrite.question !== q.question;

    // Check which options changed
    const optionChanges = ['A', 'B', 'C', 'D'].filter(letter => {
        const oldVal = q.options?.[letter];
        const newVal = rewrite?.options?.[letter];
        return newVal && oldVal !== newVal;
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh]">
                <div className={`p-4 border-b ${styles.border} flex justify-between items-center bg-slate-950/50 rounded-t-xl`}>
                    <div className={`flex items-center gap-2 ${styles.icon} font-bold uppercase tracking-wider text-sm`}>
                        <Icon name="zap" size={18} />
                        <span>AI Critique {score !== null && `• Score: ${score}/100`}</span>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><Icon name="x" size={20} /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Original Question */}
                    <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase text-slate-500">Original Question</div>
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded text-sm text-slate-300" dangerouslySetInnerHTML={{ __html: sanitizeText(q.question) }} />
                    </div>

                    {/* Feedback */}
                    <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase text-slate-500">Feedback</div>
                        {loading ? (
                            <div className="flex items-center gap-2 text-sm text-slate-400 animate-pulse p-4">
                                <Icon name="loader" className="animate-spin" /> Analyzing Logic & Syntax...
                            </div>
                        ) : (
                            <div className={`p-4 ${styles.bg} border ${styles.border} rounded text-sm ${styles.text} leading-relaxed`} dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
                        )}
                    </div>

                    {/* Suggested Changes with Word-Level Diff */}
                    {rewrite && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="text-[10px] font-bold uppercase text-slate-500">AI Improvements</div>
                                <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/50">
                                    <Icon name="git-compare" size={10} />
                                    <span>Word-Level Diff</span>
                                </div>
                            </div>

                            {/* Change Summary */}
                            {changes && (
                                <div className="p-3 bg-indigo-950/30 border border-indigo-700/50 rounded text-xs text-indigo-200 italic flex items-start gap-2">
                                    <Icon name="info" size={14} className="flex-shrink-0 mt-0.5" />
                                    <span>{changes}</span>
                                </div>
                            )}

                            <div className="p-4 bg-slate-950/50 border border-slate-700 rounded space-y-4">
                                {/* Question Diff */}
                                {questionChanged && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                                            <Icon name="message-square" size={12} />
                                            Question Text
                                        </div>
                                        <div className="p-3 bg-slate-900 border border-slate-800 rounded text-sm">
                                            <DiffText oldText={q.question} newText={rewrite.question} />
                                        </div>
                                    </div>
                                )}

                                {/* Options Diff */}
                                {optionChanges.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                                            <Icon name="list" size={12} />
                                            Answer Options
                                        </div>
                                        <div className="space-y-2">
                                            {optionChanges.map(letter => (
                                                <div key={letter} className="flex items-start gap-3 p-3 bg-slate-900 border border-slate-800 rounded">
                                                    <div className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">{letter}</div>
                                                    <div className="flex-1 text-sm">
                                                        <DiffText oldText={q.options?.[letter]} newText={rewrite.options?.[letter]} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Correct Answer Change */}
                                {rewrite.correct && rewrite.correct !== q.correct && (
                                    <div className="flex items-center gap-2 text-xs text-yellow-200 bg-yellow-950/30 border border-yellow-700/50 rounded p-3">
                                        <Icon name="alert-triangle" size={14} />
                                        <span>
                                            Correct answer changed:
                                            <span className="ml-1 bg-red-900/50 text-red-300 line-through px-1.5 py-0.5 rounded">{q.correct}</span>
                                            <span className="mx-1">→</span>
                                            <span className="bg-green-900/50 text-green-300 font-bold px-1.5 py-0.5 rounded">{rewrite.correct}</span>
                                        </span>
                                    </div>
                                )}

                                {/* No Changes Detected */}
                                {!questionChanged && optionChanges.length === 0 && rewrite.correct === q.correct && (
                                    <div className="text-xs text-slate-400 text-center py-2">
                                        <Icon name="check-circle" size={14} className="inline mr-1" />
                                        No structural changes suggested - question is already well-formed
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-950/50 rounded-b-xl flex justify-center gap-3 flex-wrap">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded flex items-center gap-2 text-xs uppercase transition-all shadow-lg hover:shadow-slate-900/20"
                    >
                        Dismiss
                    </button>

                    {rewrite && onApplySuggestions && (
                        <button
                            onClick={() => onApplySuggestions(rewrite)}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded flex items-center gap-2 text-xs uppercase transition-all shadow-lg hover:shadow-blue-900/20"
                        >
                            <Icon name="check-circle" size={14} />
                            Apply All Suggestions
                        </button>
                    )}

                    <button
                        onClick={onFix}
                        disabled={loading || isFixing}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded flex items-center gap-2 text-xs uppercase transition-all shadow-lg hover:shadow-indigo-900/20"
                    >
                        {isFixing ? <Icon name="loader" className="animate-spin" size={14} /> : <Icon name="sparkles" size={14} />}
                        Regenerate
                    </button>

                    <button
                        onClick={onAccept}
                        disabled={isFailing || loading}
                        title={isFailing ? "Score too low to accept" : "Accept Question"}
                        className={`px-4 py-2 font-bold rounded flex items-center gap-2 text-xs uppercase transition-all shadow-lg ${isFailing || loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50' : 'bg-green-600 hover:bg-green-500 text-white hover:shadow-green-900/20'}`}
                    >
                        <Icon name="check" size={14} /> Accept
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CritiqueModal;

