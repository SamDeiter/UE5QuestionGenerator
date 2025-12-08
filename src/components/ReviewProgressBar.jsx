import Icon from './Icon';

/**
 * ReviewProgressBar - Visual workflow indicator for the review process
 * Shows 3 steps: CRITIQUE → VERIFY → ACCEPT
 */
const ReviewProgressBar = ({ question, onCritique, onVerify, onAccept, isProcessing }) => {
    const q = question;

    // Determine step states
    const hasCritique = q.critiqueScore !== undefined && q.critiqueScore !== null;
    const critiquePass = hasCritique && q.critiqueScore >= 70;
    const isVerified = q.humanVerified === true;
    const isAccepted = q.status === 'accepted';
    const isRejected = q.status === 'rejected';

    // Current step (1-indexed)
    let currentStep = 1;
    if (hasCritique && critiquePass && !isVerified) currentStep = 2;
    if (isVerified && !isAccepted) currentStep = 3;
    if (isAccepted) currentStep = 4; // All done

    const steps = [
        {
            id: 'critique',
            label: 'CRITIQUE',
            icon: 'zap',
            completed: hasCritique,
            active: !hasCritique && !isRejected,
            locked: false,
            score: hasCritique ? q.critiqueScore : null,
            onClick: onCritique,
            tooltip: hasCritique
                ? `Score: ${q.critiqueScore}/100${q.critiqueScore < 70 ? ' (needs improvement)' : ' ✓'}`
                : 'Click to run AI critique'
        },
        {
            id: 'verify',
            label: 'VERIFY',
            icon: 'eye',
            completed: isVerified,
            active: hasCritique && critiquePass && !isVerified,
            locked: !critiquePass,
            onClick: onVerify,
            tooltip: isVerified
                ? `Verified by ${q.humanVerifiedBy || 'reviewer'}`
                : critiquePass
                    ? 'Click to verify source & answer'
                    : `Requires score ≥70 (current: ${q.critiqueScore || 'N/A'})`
        },
        {
            id: 'accept',
            label: 'ACCEPT',
            icon: 'check-circle',
            completed: isAccepted,
            active: isVerified && !isAccepted,
            locked: !isVerified,
            onClick: onAccept,
            tooltip: isAccepted
                ? 'Question accepted!'
                : isVerified
                    ? 'Click to accept question'
                    : 'Verify first before accepting'
        }
    ];

    if (isRejected) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-950/30 border border-red-900/50 rounded-lg">
                <Icon name="x-circle" size={16} className="text-red-400" />
                <span className="text-xs font-bold text-red-400">REJECTED</span>
                <span className="text-xs text-red-400/70">
                    {q.rejectionReason ? `(${q.rejectionReason.replace(/_/g, ' ')})` : ''}
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg">
            {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                    {/* Step Circle */}
                    <button
                        onClick={() => !step.locked && !step.completed && !isProcessing && step.onClick?.()}
                        disabled={step.locked || step.completed || isProcessing}
                        className={`
                            relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all text-xs font-bold
                            ${step.completed
                                ? 'bg-green-600 text-white shadow-lg shadow-green-900/50'
                                : step.active
                                    ? 'bg-orange-600 text-white animate-pulse shadow-lg shadow-orange-900/50 cursor-pointer hover:bg-orange-500'
                                    : step.locked
                                        ? 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }
                            ${isProcessing ? 'cursor-wait' : ''}
                        `}
                        title={step.tooltip}
                    >
                        <Icon
                            name={step.completed ? 'check' : step.icon}
                            size={14}
                            className={step.active && !step.completed ? 'animate-bounce' : ''}
                        />
                        <span>{step.label}</span>
                        {step.score !== null && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${step.score >= 70 ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'
                                }`}>
                                {step.score}
                            </span>
                        )}
                    </button>

                    {/* Connector Arrow */}
                    {index < steps.length - 1 && (
                        <div className={`mx-1 ${steps[index + 1].locked
                                ? 'text-slate-700'
                                : steps[index].completed
                                    ? 'text-green-500'
                                    : 'text-slate-600'
                            }`}>
                            <Icon name="chevron-right" size={16} />
                        </div>
                    )}
                </div>
            ))}

            {isAccepted && (
                <div className="ml-2 flex items-center gap-1 text-green-400">
                    <Icon name="check-circle" size={14} />
                    <span className="text-xs font-bold">DONE</span>
                </div>
            )}
        </div>
    );
};

export default ReviewProgressBar;
