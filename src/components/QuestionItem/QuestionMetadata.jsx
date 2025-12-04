import React from 'react';
import Icon from '../Icon';
import { getDisplayUrl, stripHtmlTags } from '../../utils/helpers';

const QuestionMetadata = ({ q, showMessage }) => {
    return (
        <>
            {q.sourceExcerpt && (
                <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                    {/* Source URL - Prominent Display */}
                    {q.sourceUrl && (
                        <div className={`flex items-center gap-2 border rounded px-3 py-1.5 ${q.invalidUrl ? 'bg-red-950/30 border-red-800/50' : 'bg-blue-950/30 border-blue-800/50'}`}>
                            <Icon name={q.invalidUrl ? "alert-triangle" : "link"} size={14} className={q.invalidUrl ? "text-red-400 flex-shrink-0" : "text-blue-400 flex-shrink-0"} />
                            <span className={`text-[10px] font-bold uppercase ${q.invalidUrl ? 'text-red-400' : 'text-blue-400'}`}>Source:</span>
                            <a
                                href={q.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-xs hover:underline truncate flex-1 ${q.invalidUrl ? 'text-red-300 hover:text-red-200' : 'text-blue-300 hover:text-blue-200'}`}
                                title={q.invalidUrl ? "Warning: Link may be broken or truncated" : q.sourceUrl}
                            >
                                {getDisplayUrl(q.sourceUrl)}
                            </a>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(q.sourceUrl).then(() => {
                                        if (showMessage) showMessage("Link copied to clipboard", 2000);
                                    }).catch(err => {
                                        console.error('Failed to copy: ', err);
                                    });
                                }}
                                className="p-1.5 hover:bg-blue-900/50 rounded text-blue-400 hover:text-blue-200 transition-colors cursor-pointer z-10"
                                title="Copy Link"
                                type="button"
                            >
                                <Icon name="copy" size={14} />
                            </button>
                        </div>
                    )}
                    {/* Source Excerpt - Cleaned */}
                    <div className="flex items-start gap-1.5 text-sm text-slate-400 italic bg-slate-950 p-2 rounded border border-slate-800">
                        <Icon name="message-square" size={14} className="mt-0.5 flex-shrink-0" />
                        <span>{stripHtmlTags(q.sourceExcerpt)}</span>
                    </div>
                </div>
            )}

            {/* Generation Metrics Footer */}
            <div className="mt-3 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] text-slate-600 font-mono">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1" title="Estimated Cost">
                        <Icon name="dollar-sign" size={10} />
                        <span>${(q.estimatedCost || 0).toFixed(5)}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Generation Time">
                        <Icon name="clock" size={10} />
                        <span>{q.generationTime ? (q.generationTime / 1000).toFixed(2) : '0.00'}s</span>
                    </div>
                </div>
                <div className="flex items-center gap-1" title="AI Model">
                    <Icon name="cpu" size={10} />
                    <span className="uppercase">{q.model || 'Gemini 2.0 Flash'}</span>
                </div>
            </div>
        </>
    );
};

export default QuestionMetadata;
