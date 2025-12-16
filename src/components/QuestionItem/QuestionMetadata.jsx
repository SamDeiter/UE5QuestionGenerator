import Icon from "../Icon";
import { getDisplayUrl } from "../../utils/questionHelpers";

const getVerificationBadge = (status) => {
  switch (status) {
    case true:
      return {
        icon: "check-circle",
        color: "text-green-400",
        bg: "bg-green-950/50",
        label: "Verified Source",
        title: "URL matched grounding search results",
      };
    case "unverified":
      return {
        icon: "help-circle",
        color: "text-yellow-400",
        bg: "bg-yellow-950/50",
        label: "Unverified",
        title: "URL not found in search results - may be hallucinated",
      };
    case "assumed":
      return {
        icon: "info",
        color: "text-blue-400",
        bg: "bg-blue-950/50",
        label: "Assumed Valid",
        title: "Looks like Epic docs but no grounding to verify",
      };
    case "missing":
      return {
        icon: "x-circle",
        color: "text-red-400",
        bg: "bg-red-950/50",
        label: "No Source",
        title: "No source URL provided",
      };
    case false:
    default:
      return {
        icon: "alert-triangle",
        color: "text-red-400",
        bg: "bg-red-950/50",
        label: "Invalid",
        title: "Source URL is invalid or from forbidden domain",
      };
  }
};

const QuestionMetadata = ({ q, onAutoTag, isProcessing }) => {
  const verification = getVerificationBadge(q.sourceVerified);
  const hasLowTags = !q.tags || q.tags.length < 3;

  return (
    <>
      {/* Answer Mismatch Warning - Most Critical */}
      {q.answerMismatch && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded bg-red-900/50 border border-red-500 text-red-300 mb-2 animate-pulse"
          title="The marked correct answer doesn't appear in the source excerpt - this question may be WRONG!"
        >
          <Icon name="alert-octagon" size={16} />
          <span className="text-xs font-bold">
            ⚠️ ANSWER MAY BE WRONG - Check Source!
          </span>
        </div>
      )}

      {/* Source Verification Badge */}
      {q.sourceVerified !== undefined && (
        <div
          className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] font-bold uppercase ${verification.bg} ${verification.color} mb-2`}
          title={verification.title}
        >
          <Icon name={verification.icon} size={12} />
          <span>{verification.label}</span>
        </div>
      )}

      {/* Tags Display with Auto-Tag Button */}
      <div className="flex items-center gap-2 mb-2">
        {q.tags && q.tags.length > 0 && (
          <div className="flex items-center gap-1 text-[9px] text-slate-500 flex-1">
            <span className="text-slate-600">Tags:</span>
            {q.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-300 transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Auto-Tag Button */}
        {onAutoTag && (hasLowTags || q.status === "pending") && (
          <button
            onClick={() => onAutoTag(q)}
            disabled={isProcessing}
            className={`px-2 py-1 text-[10px] font-medium rounded border transition-all flex items-center gap-1 ${
              hasLowTags
                ? "bg-cyan-900/30 border-cyan-700/50 text-cyan-400 hover:bg-cyan-800/40 hover:border-cyan-600"
                : "bg-slate-800/50 border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-500"
            } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
            title={
              hasLowTags
                ? `Add tags (current: ${q.tags?.length || 0}/3)`
                : "Generate AI tags for this question"
            }
          >
            <Icon name="tag" size={12} />
            {hasLowTags ? `Add Tags (${q.tags?.length || 0}/3)` : "Auto-Tag"}
          </button>
        )}
      </div>

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
            <span>
              {q.generationTime ? (q.generationTime / 1000).toFixed(2) : "0.00"}
              s
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1" title="AI Model">
          <Icon name="cpu" size={10} />
          <span className="uppercase">{q.model || "Gemini 2.0 Flash"}</span>
        </div>
      </div>
    </>
  );
};

export default QuestionMetadata;
