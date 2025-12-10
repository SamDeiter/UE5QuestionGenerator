import Icon from './Icon';

/**
 * ReviewProgressBar - Visual stepper workflow for the review process
 * Shows 3 steps: CRITIQUE → VERIFY → ACCEPT with connecting lines
 */
const ReviewProgressBar = ({ question, onCritique, onVerify, onAccept, onFix, isProcessing }) => {
    const q = question;

    // ... (rest of logic)

    {
        critiqueFail && (
            <div className="mt-3 text-center text-xs text-red-400/80 bg-red-950/30 py-2 rounded flex items-center justify-center gap-2">
                <Icon name="alert-triangle" size={12} />
                <span>Score below 70.</span>
                {onFix && q.suggestedRewrite ? (
                    <button
                        onClick={onFix}
                        disabled={isProcessing}
                        className="px-2 py-0.5 bg-red-800 hover:bg-red-700 text-white text-[10px] font-bold rounded shadow-sm border border-red-600 transition-colors uppercase"
                    >
                        Fix & Re-run
                    </button>
                ) : (
                    <span>Check critique below.</span>
                )}
            </div>
        )
    }
    {
        critiquePass && !isVerified && (
            <div className="mt-3 text-center text-xs text-green-400/80 bg-green-950/30 py-2 rounded">
                <Icon name="check-circle" size={12} className="inline mr-1" />
                <strong>Good score!</strong> Click <strong>Verify</strong> to check the source and answer before accepting.
            </div>
        )
    }
    {
        isVerified && !isAccepted && (
            <div className="mt-3 text-center text-xs text-blue-400/80 bg-blue-950/30 py-2 rounded animate-pulse">
                <Icon name="check-circle" size={12} className="inline mr-1" />
                <strong>Verified!</strong> Click <strong>Accept</strong> to approve this question for export.
            </div>
        )
    }
        </div >
    );
};

export default ReviewProgressBar;
