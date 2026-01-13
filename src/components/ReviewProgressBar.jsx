import Icon from "./Icon";
import { QUALITY_PASS_THRESHOLD } from "../utils/constants";
import { useAccessibility } from "../contexts/AccessibilityContext";

// Helper functions to compute step styling without nested ternaries
// cb = colorblind mode flag
const getCircleClass = (step, cb = false) => {
  if (step.completed)
    return cb ? "bg-blue-600 text-white" : "bg-green-600 text-white";
  if (step.failed)
    return cb ? "bg-rose-600 text-white" : "bg-red-600 text-white";
  if (step.active)
    return "bg-orange-500 text-white animate-pulse shadow-lg shadow-orange-500/50 group-hover:bg-orange-400";
  if (step.ready)
    return "bg-blue-600/70 text-white cursor-pointer hover:bg-blue-500";
  return "bg-slate-700 text-slate-400 border-2 border-slate-600";
};

const getLabelClass = (step, cb = false) => {
  if (step.completed) return cb ? "text-blue-400" : "text-green-400";
  if (step.failed) return cb ? "text-rose-400" : "text-red-400";
  if (step.active) return "text-orange-400";
  if (step.ready) return "text-blue-400";
  return "text-slate-500";
};

const getSublabelClass = (step, cb = false) => {
  if (step.completed) return cb ? "text-blue-400/70" : "text-green-400/70";
  if (step.failed) return cb ? "text-rose-400/70" : "text-red-400/70";
  if (step.active) return "text-orange-400/70";
  if (step.ready) return "text-blue-400/70";
  return "text-slate-600";
};

const getLineClass = (step, cb = false) => {
  if (step.completed) return cb ? "bg-blue-600" : "bg-green-600";
  if (step.failed) return cb ? "bg-rose-600/50" : "bg-red-600/50";
  return "bg-slate-700";
};

const getButtonTitle = (step, isLocked, lockedBy) => {
  if (isLocked) return `Locked by ${lockedBy?.userEmail || "another user"}`;
  if (step.locked) return "Complete previous step first";
  return step.sublabel;
};

// Helper to render circle content
const renderCircleContent = (step, critiqueScore) => {
  if (step.completed) return <Icon name="check" size={18} />;
  if (step.failed) return <span>{critiqueScore}</span>;
  return <span>{step.num}</span>;
};

/**
 * ReviewProgressBar - Visual stepper workflow for the review process
 * Shows 3 steps: CRITIQUE → VERIFY → ACCEPT with connecting lines
 */
const ReviewProgressBar = ({
  question,
  isLocked = false,
  lockedBy = null,
  onCritique,
  onVerify,
  onAccept,
  onFix,
  isProcessing,
}) => {
  const { colorblindMode } = useAccessibility();
  const cb = colorblindMode; // shorthand for helper functions
  const q = question;

  // Determine step states
  // Check if critique was done (either score exists OR improvements were applied)
  const hasCritique =
    (q.critiqueScore !== undefined && q.critiqueScore !== null) ||
    q.improvementsApplied === true;
  // Pass if score >= threshold OR if improvements were applied (which means they passed review)
  const critiquePass =
    (hasCritique && q.critiqueScore >= QUALITY_PASS_THRESHOLD) ||
    q.improvementsApplied === true;
  const critiqueFail =
    q.critiqueScore !== null &&
    q.critiqueScore !== undefined &&
    q.critiqueScore < QUALITY_PASS_THRESHOLD &&
    !q.improvementsApplied;
  const isVerified = q.humanVerified === true;
  const isAccepted = q.status === "accepted";
  const isRejected = q.status === "rejected";

  if (isRejected) {
    const reasons = {
      low_score_after_retries:
        "Could not reach quality threshold after multiple attempts",
      factually_incorrect: "Contains factual errors",
      unclear: "Question or answers are unclear",
      duplicate: "Duplicate of another question",
      off_topic: "Not relevant to the topic",
      other: "Rejected by reviewer",
    };
    const reasonText =
      reasons[q.rejectionReason] ||
      q.rejectionReason?.replace(/_/g, " ") ||
      "Rejected";

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
            <div className="text-sm text-red-300/80">{reasonText}</div>
            <div className="text-xs text-red-400/60 mt-2">
              This question will not be exported. You can delete it or move on
              to the next question.
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
          <span className="text-xs text-green-400/70 ml-2">
            Ready for export
          </span>
        </div>
      </div>
    );
  }

  const steps = [
    {
      num: 1,
      label: "Critique",
      sublabel: hasCritique
        ? `Score: ${q.critiqueScore}/100`
        : "Run AI analysis",
      completed: hasCritique && critiquePass,
      failed: critiqueFail,
      active: !hasCritique,
      ready: false,
      icon: "zap",
      onClick: onCritique,
    },
    {
      num: 2,
      label: "Verify",
      sublabel: isVerified ? "Source confirmed" : "Check source & answer",
      completed: isVerified,
      // For high scores, Verify is the next step (flash it)
      active: hasCritique && !isVerified,
      ready: false,
      locked: !hasCritique, // FIX: Locked until critique EXISTS (not just passes)
      icon: "eye",
      onClick: onVerify,
    },
    {
      num: 3,
      label: "Accept",
      sublabel: "Approve for export",
      completed: false,
      // Accept becomes active AFTER verification
      active: isVerified && !isAccepted,
      ready: false,
      locked: !isVerified, // Must verify first
      icon: "check-circle",
      onClick: onAccept,
    },
  ];

  return (
    <div className="py-6 px-6 bg-slate-900/70 border border-slate-700/50 rounded-lg">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.num} className="flex items-center flex-1">
            {/* Step Circle + Content */}
            <button
              onClick={() =>
                !isLocked &&
                !step.locked &&
                !step.completed &&
                !isProcessing &&
                step.onClick?.()
              }
              disabled={
                isLocked || step.locked || step.completed || isProcessing
              }
              className={`
                                flex items-center gap-3 transition-all
                                ${
                                  step.active && !isProcessing && !isLocked
                                    ? "cursor-pointer group"
                                    : ""
                                }
                                ${
                                  step.locked || isLocked
                                    ? "opacity-40 cursor-not-allowed"
                                    : ""
                                }
                            `}
              title={getButtonTitle(step, isLocked, lockedBy)}
              data-tour={step.num === 1 ? "critique-button" : undefined}
            >
              {/* Circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${getCircleClass(
                  step,
                  cb
                )}`}
              >
                {renderCircleContent(step, q.critiqueScore)}
              </div>

              {/* Label */}
              <div className="flex flex-col">
                <span
                  className={`text-sm font-bold ${getLabelClass(step, cb)}`}
                >
                  {step.label}
                </span>
                <span className={`text-xs ${getSublabelClass(step, cb)}`}>
                  {step.sublabel}
                </span>
              </div>
            </button>

            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 rounded ${getLineClass(
                  step,
                  cb
                )}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Help Text */}
      {critiqueFail && (
        <div
          className={`mt-3 text-center text-xs ${
            cb
              ? "text-rose-400/80 bg-rose-950/30"
              : "text-red-400/80 bg-red-950/30"
          } py-2 rounded flex items-center justify-center gap-2`}
        >
          <Icon name="alert-triangle" size={12} />
          <span>Score below {QUALITY_PASS_THRESHOLD}.</span>
          {onFix && q.suggestedRewrite ? (
            <button
              onClick={onFix}
              disabled={isProcessing}
              className={`px-2 py-0.5 ${
                cb
                  ? "bg-rose-800 hover:bg-rose-700 border-rose-600"
                  : "bg-red-800 hover:bg-red-700 border-red-600"
              } text-white text-[10px] font-bold rounded shadow-sm border transition-colors uppercase`}
            >
              Fix & Re-run
            </button>
          ) : (
            <span>Check critique below.</span>
          )}
        </div>
      )}
      {critiquePass && !isVerified && (
        <div
          className={`mt-3 text-center text-xs ${
            cb
              ? "text-blue-400/80 bg-blue-950/30"
              : "text-green-400/80 bg-green-950/30"
          } py-2 rounded`}
        >
          <Icon name="check-circle" size={12} className="inline mr-1" />
          <strong>Good score!</strong> Click <strong>Verify</strong> to check
          the source and answer before accepting.
        </div>
      )}
      {isVerified && !isAccepted && (
        <div className="mt-3 text-center text-xs text-blue-400/80 bg-blue-950/30 py-2 rounded animate-pulse">
          <Icon name="check-circle" size={12} className="inline mr-1" />
          <strong>Verified!</strong> Click <strong>Accept</strong> to approve
          this question for export.
        </div>
      )}
    </div>
  );
};

export default ReviewProgressBar;
