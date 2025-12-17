import Icon from "./Icon";

/**
 * LowScoreWarningModal - Full-screen warning when a question is struggling to pass
 * Shows prominently that the question needs improvement or will be auto-rejected
 */
const LowScoreWarningModal = ({
  score,
  attemptsLeft,
  maxAttempts,
  passingScore,
  onApplyImprovements,
  onDismiss,
  isProcessing = false,
}) => {
  const isLastChance = attemptsLeft === 1;
  const isFinalRejection = attemptsLeft <= 0;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div
        className={`max-w-lg w-full rounded-xl border-2 shadow-2xl overflow-hidden ${
          isFinalRejection
            ? "border-red-500 bg-gradient-to-b from-red-950 to-slate-900"
            : isLastChance
            ? "border-orange-500 bg-gradient-to-b from-orange-950 to-slate-900"
            : "border-yellow-500 bg-gradient-to-b from-yellow-950 to-slate-900"
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b ${
            isFinalRejection
              ? "border-red-700/50 bg-red-900/30"
              : isLastChance
              ? "border-orange-700/50 bg-orange-900/30"
              : "border-yellow-700/50 bg-yellow-900/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                isFinalRejection
                  ? "bg-red-500/20"
                  : isLastChance
                  ? "bg-orange-500/20"
                  : "bg-yellow-500/20"
              }`}
            >
              <Icon
                name={isFinalRejection ? "x-circle" : "alert-triangle"}
                size={28}
                className={
                  isFinalRejection
                    ? "text-red-400"
                    : isLastChance
                    ? "text-orange-400"
                    : "text-yellow-400"
                }
              />
            </div>
            <div>
              <h2
                className={`text-xl font-bold ${
                  isFinalRejection
                    ? "text-red-300"
                    : isLastChance
                    ? "text-orange-300"
                    : "text-yellow-300"
                }`}
              >
                {isFinalRejection
                  ? "Question Automatically Rejected"
                  : isLastChance
                  ? "Final Attempt Warning!"
                  : "Quality Score Below Threshold"}
              </h2>
              <p className="text-sm text-slate-400">
                {isFinalRejection
                  ? "This question has been rejected due to repeated low scores"
                  : `Score: ${score}/100 (needs ${passingScore}+ to pass)`}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Score Display */}
          <div className="flex items-center justify-center gap-4 py-4 bg-slate-800/50 rounded-lg">
            <div className="text-center">
              <div
                className={`text-5xl font-black ${
                  score >= 70
                    ? "text-yellow-400"
                    : score >= 50
                    ? "text-orange-400"
                    : "text-red-400"
                }`}
              >
                {score}
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                Current Score
              </div>
            </div>
            <div className="text-slate-600 text-2xl">→</div>
            <div className="text-center">
              <div className="text-5xl font-black text-green-400">
                {passingScore}+
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                Required
              </div>
            </div>
          </div>

          {/* Warning Message */}
          {!isFinalRejection && (
            <div
              className={`p-4 rounded-lg border ${
                isLastChance
                  ? "bg-red-900/20 border-red-700/50"
                  : "bg-orange-900/20 border-orange-700/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon
                  name="info"
                  size={18}
                  className={
                    isLastChance
                      ? "text-red-400 mt-0.5"
                      : "text-orange-400 mt-0.5"
                  }
                />
                <div className="text-sm">
                  <p
                    className={
                      isLastChance ? "text-red-200" : "text-orange-200"
                    }
                  >
                    {isLastChance ? (
                      <>
                        This is your <strong>LAST CHANCE</strong>. If the score
                        doesn't reach {passingScore}+ after applying
                        improvements, this question will be{" "}
                        <strong>automatically rejected</strong>.
                      </>
                    ) : (
                      <>
                        You have{" "}
                        <strong>
                          {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""}
                        </strong>{" "}
                        left to improve this question above {passingScore}/100
                        before it's automatically rejected.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* What to do */}
          {!isFinalRejection && (
            <div className="text-sm text-slate-300">
              <p className="mb-2 font-medium">To improve the score:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>
                  Click{" "}
                  <strong className="text-green-400">
                    &quot;Apply Improvements&quot;
                  </strong>{" "}
                  to use the AI-suggested fixes
                </li>
                <li>
                  The question will be automatically re-critiqued after applying
                </li>
                <li>Review the improved question carefully before accepting</li>
              </ul>
            </div>
          )}

          {/* Rejection notice */}
          {isFinalRejection && (
            <div className="text-sm text-slate-300 text-center py-2">
              <p>
                This question failed to meet quality standards after{" "}
                {maxAttempts} attempts.
              </p>
              <p className="text-slate-500 mt-1">
                You can regenerate a new question on this topic.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-900/50 flex gap-3 justify-end">
          <button
            onClick={onDismiss}
            className="px-4 py-2 rounded-lg font-medium text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600 transition-all"
          >
            {isFinalRejection ? "Close" : "Dismiss"}
          </button>
          {!isFinalRejection && (
            <button
              onClick={onApplyImprovements}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg font-bold text-sm bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/50 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Icon name="zap" size={16} />
              {isProcessing ? "Applying..." : "Apply Improvements"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LowScoreWarningModal;
