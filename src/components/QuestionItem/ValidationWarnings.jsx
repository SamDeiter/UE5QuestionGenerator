import React from "react";
import Icon from "../Icon";

const ValidationWarnings = ({ q }) => {
  // NOTE: do NOT early-return on validation state here. The tag suggestion
  // depends only on tags.length and must show regardless of whether the
  // question is validation-passed (previously it was hidden on unverified
  // source questions while showing on translations). The single render guard
  // below covers all warning types, including tags.
  const hasAnswerWarning =
    q.answerMismatch ||
    (q._validation &&
      !q._validation.isValid &&
      q._validation.warnings.some((w) => w.includes("Answer")));

  const hasUrlWarning =
    q.invalidUrl ||
    (q._validation &&
      !q._validation.isValid &&
      q._validation.warnings.some((w) => w.includes("URL")));

  const hasTagWarning = !q.tags || q.tags.length < 3;

  const criticalWarnings =
    q._validation && !q._validation.isValid
      ? q._validation.warnings.filter((w) => w.startsWith("Critical"))
      : [];

  const hasCriticalWarnings = criticalWarnings.length > 0;

  if (
    !hasAnswerWarning &&
    !hasUrlWarning &&
    !hasTagWarning &&
    !hasCriticalWarnings
  ) {
    return null;
  }

  return (
    <div className="pl-6 mb-3 flex flex-col gap-2">
      {/* Critical Validation Errors */}
      {hasCriticalWarnings && (
        <div className="flex flex-col gap-1 p-2 bg-red-950/60 border border-red-600/60 rounded text-red-200 text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 font-bold text-red-400">
            <Icon name="x-circle" size={14} />
            <span>Critical Validation Failed:</span>
          </div>
          <ul className="list-disc list-inside pl-1 opacity-90">
            {criticalWarnings.map((w, i) => (
              <li key={i}>{w.replace("Critical: ", "")}</li>
            ))}
          </ul>
        </div>
      )}
      {/* Answer Mismatch Warning */}
      {hasAnswerWarning && (
        <div className="flex items-center gap-2 p-2 bg-yellow-950/40 border border-yellow-700/40 rounded text-yellow-200 text-xs animate-in fade-in slide-in-from-top-1">
          <Icon name="alert-triangle" size={14} className="text-yellow-500" />
          <span>
            <strong>Warning:</strong> Answer may not match source excerpt.
            Verify carefully.
          </span>
        </div>
      )}

      {/* Invalid URL Warning */}
      {hasUrlWarning && (
        <div className="flex items-center gap-2 p-2 bg-red-950/40 border border-red-700/40 rounded text-red-200 text-xs animate-in fade-in slide-in-from-top-1">
          <Icon name="link" size={14} className="text-red-500" />
          <span>
            <strong>Warning:</strong> Source URL may be invalid or generic.
          </span>
        </div>
      )}

      {/* Low Tag Count Warning */}
      {hasTagWarning && (
        <div className="flex items-center gap-2 p-2 bg-blue-950/40 border border-blue-700/40 rounded text-blue-200 text-xs animate-in fade-in slide-in-from-top-1">
          <Icon name="tag" size={14} className="text-blue-500" />
          <span>
            <strong>Suggestion:</strong> Question has fewer than 3 tags.
            Consider adding more.
          </span>
        </div>
      )}
    </div>
  );
};

export default ValidationWarnings;
