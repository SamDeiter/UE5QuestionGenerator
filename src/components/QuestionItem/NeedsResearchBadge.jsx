import React from "react";
import Icon from "../Icon";
import { formatDate } from "../../utils/reviewerAnalytics";

/**
 * NeedsResearchBadge - Visual indicator for questions marked as needing research
 *
 * Shows an amber badge when a question is flagged for research,
 * preventing auto-progression to Accept without forcing rejection.
 */
const NeedsResearchBadge = ({
  needsResearch,
  needsResearchReason,
  needsResearchBy,
  needsResearchAt,
  onClearResearch,
  canClear = true,
}) => {
  if (!needsResearch) return null;

  return (
    <div className="bg-amber-900/30 border border-amber-500/50 rounded-lg p-3 mb-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Icon
            name="search"
            size={18}
            className="text-amber-400 mt-0.5 flex-shrink-0"
          />
          <div>
            <div className="text-amber-300 font-bold text-sm flex items-center gap-2">
              🔬 Needs Research
            </div>
            {needsResearchReason && (
              <p className="text-amber-200/80 text-xs mt-1 leading-relaxed">
                {needsResearchReason}
              </p>
            )}
            {needsResearchBy && (
              <p className="text-amber-400/60 text-xs mt-1">
                Flagged by {needsResearchBy}
                {needsResearchAt && ` on ${formatDate(needsResearchAt)}`}
              </p>
            )}
          </div>
        </div>

        {canClear && onClearResearch && (
          <button
            type="button"
            onClick={onClearResearch}
            className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-amber-800/50 text-amber-300 border border-amber-600/40 hover:bg-amber-700/50 transition-all"
            title="Clear research flag and proceed with review"
          >
            <Icon name="check" size={12} />
            Clear
          </button>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-amber-600/30">
        <p className="text-amber-400/70 text-xs italic">
          ⚠️ This question cannot be accepted until research is complete. Either
          clear the flag or reject the question.
        </p>
      </div>
    </div>
  );
};

/**
 * NeedsResearchButton - Button to mark a question as needing research
 */
export const NeedsResearchButton = ({
  needsResearch,
  onMarkForResearch,
  disabled = false,
}) => {
  if (needsResearch) return null;

  return (
    <button
      type="button"
      onClick={onMarkForResearch}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-md border transition-all ${
        disabled
          ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
          : "bg-amber-900/30 text-amber-400 border-amber-600/40 hover:bg-amber-800/40 hover:border-amber-500"
      }`}
      title="Mark this question as needing manual research before approval"
    >
      <Icon name="search" size={14} />
      Mark for Research
    </button>
  );
};

export default NeedsResearchBadge;
