import Icon from './Icon';

/**
 * ReviewProgressBar - Visual stepper workflow for the review process
 * Shows 3 steps: CRITIQUE → VERIFY → ACCEPT with connecting lines
 */
const ReviewProgressBar = ({ question, onCritique, onVerify, onAccept, isProcessing }) => {
    const q = question;

    // Determine step states
    const hasCritique = q.critiqueScore !== undefined && q.critiqueScore !== null;
    const critiquePass = hasCritique && q.critiqueScore >= 70;
    const critiqueFail = hasCritique && q.critiqueScore < 70;
    const isVerified = q.humanVerified === true;
    const isAccepted = q.status === 'accepted';
    const isRejected = q.status === 'rejected';

    if (isRejected) {
        const reasons = {
            'low_score_after_retries': 'Could not reach quality threshold after multiple attempts',
            'factually_incorrect': 'Contains factual errors',
            'unclear': 'Question or answers are unclear',
            'duplicate': 'Duplicate of another question',
            'off_topic': 'Not relevant to the topic',
            'other': 'Rejected by reviewer'
        };
        const reasonText = reasons[q.rejectionReason] || q.rejectionReason?.replace(/_/g, ' ') || 'Rejected';

        return (
            <div className="py-5 px-6 bg-red-950/50 border-2 border-red-600/50 rounded-lg">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 animate-pulse">
                        <Icon name="x" size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="text-lg font-bold text-red-400 mb-1">
                            ❌ QUESTION REJECTED
                        </div>
                        <div className="text-sm text-red-300/80">
                            {reasonText}
                        </div>
                        <div className="text-xs text-red-400/60 mt-2">
                            This question will not be exported. You can delete it or move on to the next question.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isAccepted) {
        return (
            <div className="flex items-center justify-center gap-3 py-3 px-4 bg-green-950/30 border border-green-900/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                    <Icon name="check" size={18} className="text-white" />
                </div>
                <div>
                    <span className="text-sm font-bold text-green-400">ACCEPTED</span>
                    <span className="text-xs text-green-400/70 ml-2">Ready for export</span>
                </div>
            </div>
        );
    }

    const steps = [
        {
            num: 1,
            label: 'Critique',
            sublabel: hasCritique ? `Score: ${q.critiqueScore}/100` : 'Run AI analysis',
            completed: hasCritique && critiquePass,
            failed: critiqueFail,
            active: !hasCritique,
            ready: false,
            icon: 'zap',
            onClick: onCritique
        },
        {
            num: 2,
            label: 'Verify',
            sublabel: isVerified ? 'Source confirmed' : 'Check source & answer',
            completed: isVerified,
            // For high scores, Verify is the next step (flash it)
            active: critiquePass && !isVerified,
            ready: false,
            locked: !critiquePass, // Locked until score ≥ 70
            icon: 'eye',
            onClick: onVerify
        },
        {
            num: 3,
            label: 'Accept',
            sublabel: 'Approve for export',
            completed: false,
            // Accept comes AFTER verification
            active: isVerified && !isAccepted,
            ready: false,
            locked: !isVerified, // Locked until verified
            icon: 'check-circle',
            onClick: onAccept
        }
    ];

    return (
        <div className="py-4 px-6 bg-slate-900/70 border border-slate-700/50 rounded-lg">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                    <div key={step.num} className="flex items-center flex-1">
                        {/* Step Circle + Content */}
                        <button
                            onClick={() => !step.locked && !step.completed && !isProcessing && step.onClick?.()}
                            disabled={step.locked || step.completed || isProcessing}
                            className={`
                                flex items-center gap-3 transition-all
                                ${step.active && !isProcessing ? 'cursor-pointer group' : ''}
                                ${step.locked ? 'opacity-40 cursor-not-allowed' : ''}
                            `}
                            title={step.locked ? 'Complete previous step first' : step.sublabel}
                        >
                            {/* Circle */}
                            <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                                ${step.completed
                                    ? 'bg-green-600 text-white'
                                    : step.failed
                                        ? 'bg-red-600 text-white'
                                        : step.active
                                            ? 'bg-orange-500 text-white animate-pulse shadow-lg shadow-orange-500/50 group-hover:bg-orange-400'
                                            : step.ready
                                                ? 'bg-blue-600/70 text-white cursor-pointer hover:bg-blue-500'
                                                : 'bg-slate-700 text-slate-400 border-2 border-slate-600'
                                }
                            `}>
                                {step.completed ? (
                                    <Icon name="check" size={18} />
                                ) : step.failed ? (
                                    <span>{q.critiqueScore}</span>
                                ) : (
                                    <span>{step.num}</span>
                                )}
                            </div>

                            {/* Label */}
                            <div className="flex flex-col">
                                <span className={`text-sm font-bold ${step.completed ? 'text-green-400' :
                                    step.failed ? 'text-red-400' :
                                        step.active ? 'text-orange-400' :
                                            step.ready ? 'text-blue-400' :
                                                'text-slate-500'
                                    }`}>
                                    {step.label}
                                </span>
                                <span className={`text-xs ${step.completed ? 'text-green-400/70' :
                                    step.failed ? 'text-red-400/70' :
                                        step.active ? 'text-orange-400/70' :
                                            step.ready ? 'text-blue-400/70' :
                                                'text-slate-600'
                                    }`}>
                                    {step.sublabel}
                                </span>
                            </div>
                        </button>

                        {/* Connecting Line */}
                        {index < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-4 rounded ${step.completed ? 'bg-green-600' :
                                step.failed ? 'bg-red-600/50' :
                                    'bg-slate-700'
                                }`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Help Text */}
            {critiqueFail && (
                <div className="mt-3 text-center text-xs text-red-400/80 bg-red-950/30 py-2 rounded">
                    <Icon name="alert-triangle" size={12} className="inline mr-1" />
                    Score below 70. Click "Apply" in the AI Critique section to improve, then re-critique.
                </div>
            )}
            {critiquePass && !isVerified && (
                <div className="mt-3 text-center text-xs text-green-400/80 bg-green-950/30 py-2 rounded">
                    <Icon name="check-circle" size={12} className="inline mr-1" />
                    <strong>Good score!</strong> Click <strong>Verify</strong> to check the source and answer before accepting.
                </div>
            )}
        </div>
    );
};

export default ReviewProgressBar;
