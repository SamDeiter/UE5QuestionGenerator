import React from 'react';
import Icon from './Icon';
import { renderMarkdown, sanitizeText } from '../utils/helpers';

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
                    <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase text-slate-500">Original Question</div>
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded text-sm text-slate-300" dangerouslySetInnerHTML={{ __html: sanitizeText(q.question) }} />
                    </div>

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

                    {rewrite && (
                        <div className="space-y-2">
                            <div className="text-[10px] font-bold uppercase text-slate-500">Suggested Changes</div>
                            <div className="p-4 bg-blue-950/20 border border-blue-700/50 rounded space-y-3">
                                {changes && (
                                    <div className="text-xs text-blue-200 mb-2 italic">"{changes}"</div>
                                )}

                                {/* Question Diff */}
                                {rewrite.question !== q.question && (
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-bold text-slate-400">QUESTION:</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2 bg-red-950/30 border border-red-700/30 rounded text-xs text-red-200 line-through opacity-60">
                                                {q.question}
                                            </div>
                                            <div className="p-2 bg-green-950/30 border border-green-700/50 rounded text-xs text-green-200 font-semibold">
                                                {rewrite.question}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Options Diff */}
                                {Object.keys(rewrite.options || {}).some(key => rewrite.options[key] !== q.options?.[key]) && (
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-bold text-slate-400">OPTIONS:</div>
                                        {['A', 'B', 'C', 'D'].map(letter => {
                                            const oldValue = q.options?.[letter];
                                            const newValue = rewrite.options?.[letter];
                                            if (!newValue || oldValue === newValue) return null;
                                            return (
                                                <div key={letter} className="grid grid-cols-[auto,1fr,1fr] gap-2 items-start">
                                                    <div className="text-[10px] text-slate-500 font-bold pt-2">{letter}:</div>
                                                    <div className="p-2 bg-red-950/30 border border-red-700/30 rounded text-xs text-red-200 line-through opacity-60">
                                                        {oldValue}
                                                    </div>
                                                    <div className="p-2 bg-green-950/30 border border-green-700/50 rounded text-xs text-green-200 font-semibold">
                                                        {newValue}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Correct Answer Change */}
                                {rewrite.correct && rewrite.correct !== q.correct && (
                                    <div className="text-xs text-yellow-200 bg-yellow-950/30 border border-yellow-700/50 rounded p-2">
                                        <Icon name="alert-triangle" size={12} className="inline mr-1" />
                                        Correct answer changed: <span className="line-through">{q.correct}</span> → <span className="font-bold">{rewrite.correct}</span>
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
