import React from 'react';
import Icon from '../Icon';

const QuestionHeader = ({ q, getDiffBadgeColor, onKickBack, appMode }) => {
    return (
        <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
                <div className="flex gap-2 items-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${getDiffBadgeColor(q.difficulty)} flex items-center gap-1`}>
                        <Icon name="zap" size={12} />
                        {q.difficulty}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border bg-blue-950 text-blue-400 border-blue-900">{q.type === 'True/False' ? 'T/F' : 'MC'}</span>

                    {/* Creator / Reviewer Info */}
                    <div className="flex items-center gap-2 ml-1 border-l border-slate-700/50 pl-2">
                        <div className="flex items-center gap-1 text-xs text-slate-500" title="Creator">
                            <Icon name="user" size={12} />
                            <span className="font-bold text-slate-400">{q.creatorName || 'N/A'}</span>
                        </div>
                        {q.reviewerName && q.reviewerName !== q.creatorName && (
                            <div className="flex items-center gap-1 text-xs text-slate-500" title="Reviewer">
                                <Icon name="check" size={12} />
                                <span className="font-bold text-indigo-400">{q.reviewerName}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* DATABASE MODE: Only show Kick Back to Review button */}
                {appMode === 'database' && (
                    <button
                        onClick={() => onKickBack(q)}
                        className="px-3 py-1.5 rounded-lg transition-all bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/50 hover:text-indigo-200 border border-indigo-700/50 flex items-center gap-2 text-xs font-medium"
                        title="Send back to Review Console"
                        aria-label="Kick back to review"
                    >
                        <Icon name="corner-up-left" size={14} />
                        Kick Back to Review
                    </button>
                )}
            </div>
        </div>
    );
};

export default QuestionHeader;
