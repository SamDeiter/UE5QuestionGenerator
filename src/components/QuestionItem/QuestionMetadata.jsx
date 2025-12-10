import Icon from '../Icon';
import { getDisplayUrl, stripHtmlTags } from '../../utils/helpers';

const getVerificationBadge = (status) => {
    switch (status) {
        case true:
            return { icon: 'check-circle', color: 'text-green-400', bg: 'bg-green-950/50', label: 'Verified Source', title: 'URL matched grounding search results' };
        case 'unverified':
            return { icon: 'help-circle', color: 'text-yellow-400', bg: 'bg-yellow-950/50', label: 'Unverified', title: 'URL not found in search results - may be hallucinated' };
        case 'assumed':
            return { icon: 'info', color: 'text-blue-400', bg: 'bg-blue-950/50', label: 'Assumed Valid', title: 'Looks like Epic docs but no grounding to verify' };
        case 'missing':
            return { icon: 'x-circle', color: 'text-red-400', bg: 'bg-red-950/50', label: 'No Source', title: 'No source URL provided' };
        case false:
        default:
            return { icon: 'alert-triangle', color: 'text-red-400', bg: 'bg-red-950/50', label: 'Invalid', title: 'Source URL is invalid or from forbidden domain' };
    }
};

const QuestionMetadata = ({ q, showMessage }) => {
    const verification = getVerificationBadge(q.sourceVerified);

    return (
        <>
            {/* Answer Mismatch Warning - Most Critical */}
            {q.answerMismatch && (
                <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-900/50 border border-red-500 text-red-300 mb-2 animate-pulse" title="The marked correct answer doesn't appear in the source excerpt - this question may be WRONG!">
                    <Icon name="alert-octagon" size={16} />
                    <span className="text-xs font-bold">⚠️ ANSWER MAY BE WRONG - Check Source!</span>
                </div>
            )}

            {/* Source Verification Badge */}
            {q.sourceVerified !== undefined && (
                <div className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] font-bold uppercase ${verification.bg} ${verification.color} mb-2`} title={verification.title}>
                    <Icon name={verification.icon} size={12} />
                    <span>{verification.label}</span>
                </div>
            )}

            {/* Tags Display */}
            {q.tags && q.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {q.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Grounding Sources (if available) */}
            {q.groundingSources && q.groundingSources.length > 0 && (
                <div className="mt-2 p-2 bg-indigo-950/20 border border-indigo-800/30 rounded">
                    <div className="text-[10px] text-indigo-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <Icon name="search" size={10} />
                        Grounding Sources Used:
                    </div>
                    <div className="flex flex-col gap-1">
                        {q.groundingSources.map((src, i) => (
                            <a
                                key={i}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-indigo-300 hover:text-indigo-200 hover:underline truncate"
                                title={src.url}
                            >
                                {src.title || getDisplayUrl(src.url)}
                            </a>
                        ))}
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

