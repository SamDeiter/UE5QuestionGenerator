import Icon from "../Icon";
import ScoreBadge from "../ScoreBadge";
import { useThemeColors } from "../../hooks/useThemeColors";

/**
 * Normalize difficulty value - handles legacy "BALANCED ALL" and other invalid values
 */
const normalizeDifficulty = (difficulty) => {
  if (!difficulty) return "Unknown";
  const d = difficulty.toString().toLowerCase().trim();

  // Handle legacy "balanced" values - default to the difficulty that was most common
  if (d.includes("balanced")) return "Beginner";

  // Normalize to standard values
  if (d.includes("easy") || d.includes("beginner")) return "Beginner";
  if (d.includes("medium") || d.includes("intermediate")) return "Intermediate";
  if (d.includes("hard") || d.includes("expert") || d.includes("advanced"))
    return "Expert";

  // Return original if it's already valid
  if (["beginner", "intermediate", "expert"].includes(d)) {
    return (
      difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase()
    );
  }

  return difficulty; // Return as-is if we can't normalize
};

const QuestionHeader = ({
  q,
  getDiffBadgeColor,
  onKickBack,
  appMode,
  onOpenCritiqueModal,
}) => {
  const { actionColor } = useThemeColors();
  const displayDifficulty = normalizeDifficulty(q.difficulty);

  // Colorblind-safe AI Improvement button classes from centralized theme
  const aiImprovementClasses = actionColor("success");

  return (
    <div className="flex justify-between items-start">
      <div className="flex flex-col gap-1">
        <div className="flex gap-2 items-center">
          <span
            className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${getDiffBadgeColor(
              displayDifficulty
            )} flex items-center gap-1`}
          >
            <Icon name="zap" size={12} />
            {displayDifficulty}
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border bg-blue-950 text-blue-400 border-blue-900">
            {q.type === "True/False" ? "T/F" : "MC"}
          </span>

          {/* Variation Badge */}
          {q.isVariation && (
            <span
              className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border bg-purple-950 text-purple-400 border-purple-900 flex items-center gap-1"
              title={q.variationNote || "Alternative question variation"}
            >
              <Icon name="git-branch" size={12} />
              ALT
            </span>
          )}

          {/* AI Score Badge - Restore visibility */}
          {q.critiqueScore !== undefined && q.critiqueScore !== null && (
            <ScoreBadge score={q.critiqueScore} />
          )}

          {/* AI Improvement Badge - Shows when improvements are available */}
          {q.suggestedRewrite && (
            <button
              onClick={() => onOpenCritiqueModal?.()}
              className={`px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 transition-all cursor-pointer hover:scale-105 ${aiImprovementClasses}`}
              title="AI Improvements Available - Click to review"
            >
              <Icon name="sparkles" size={12} />
              AI IMPROVEMENT
            </button>
          )}

          {/* Human Verified Badge */}
          {q.humanVerified && (
            <span
              className="px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 bg-emerald-900/50 text-emerald-400 border border-emerald-700/50"
              title={`Human Verified by ${q.humanVerifiedBy || "Unknown"}${
                q.humanVerifiedAt
                  ? ` on ${new Date(q.humanVerifiedAt).toLocaleDateString()}`
                  : ""
              }`}
            >
              <Icon name="eye" size={12} />
              VERIFIED
            </span>
          )}

          {/* Creator / Reviewer Info */}
          <div className="flex items-center gap-2 ml-1 border-l border-slate-700/50 pl-2">
            <div
              className="flex items-center gap-1 text-xs text-slate-500"
              title="Creator"
            >
              <Icon name="user" size={12} />
              <span className="font-bold text-slate-400">
                {q.creatorName || "N/A"}
              </span>
            </div>
            {q.reviewerName && q.reviewerName !== q.creatorName && (
              <div
                className="flex items-center gap-1 text-xs text-slate-500"
                title="Reviewer"
              >
                <Icon name="check" size={12} />
                <span className="font-bold text-indigo-400">
                  {q.reviewerName}
                </span>
              </div>
            )}
          </div>
          {/* AI Score as a Tag (as user requested) */}
          {q.critiqueScore !== undefined && q.critiqueScore !== null && (
            <span className="px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-700/50 font-bold">
              AI Score: {q.critiqueScore}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* DATABASE MODE: Show Kick Back to Review button */}
        {appMode === "database" && (
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

        {/* REVIEW MODE: Show Restore button for rejected questions */}
        {appMode === "review" && q.status === "rejected" && onKickBack && (
          <button
            onClick={() => onKickBack(q)}
            className="px-4 py-2 mr-4 rounded-lg transition-all bg-amber-900/40 text-amber-300 hover:bg-amber-800/60 hover:text-amber-200 border-2 border-amber-700/50 hover:border-amber-500 flex items-center gap-2 text-sm font-bold"
            title="Restore to Pending for re-review"
            aria-label="Restore to pending"
          >
            <Icon name="refresh-cw" size={18} />
            Restore to Pending
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionHeader;
