import { useState } from "react";
import Icon from "./Icon";

/**
 * Compact side-by-side modal with shared section headers
 */
const ImprovementModal = ({
  originalQuestion,
  improvedQuestion,
  changesExplanation,
  onApply,
  onDismiss,
}) => {
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    await onApply(improvedQuestion);
    setIsApplying(false);
  };

  const scoreDelta =
    (improvedQuestion.critiqueScore || 0) -
    (originalQuestion.critiqueScore || 0);

  const originalTags = originalQuestion.tags || [];
  const improvedTags = improvedQuestion.tags || [];
  const newTags = improvedTags.filter((t) => !originalTags.includes(t));

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl border-2 border-green-500/50 shadow-2xl max-w-6xl w-full max-h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border-b border-green-600/30 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="sparkles" size={20} className="text-green-400" />
              <h2 className="text-lg font-bold text-white">AI Improvements</h2>
              {scoreDelta > 0 && (
                <span className="px-2 py-1 bg-green-600/20 border border-green-500/50 rounded text-xs font-bold text-green-300">
                  +{scoreDelta} pts
                </span>
              )}
            </div>
            <button
              onClick={onDismiss}
              className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* AI Reasoning */}
        {changesExplanation && (
          <div className="bg-blue-900/15 border-b border-blue-700/30 px-5 py-2.5">
            <div className="flex items-start gap-2">
              <Icon
                name="message-circle"
                size={14}
                className="text-blue-400 mt-0.5 flex-shrink-0"
              />
              <div className="text-xs text-slate-200 leading-relaxed">
                {changesExplanation}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Column Headers */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wide">
                <Icon name="file-text" size={14} />
                Original
              </h3>
              <span className="px-2 py-0.5 bg-slate-700 rounded text-xs font-bold text-slate-400">
                {originalQuestion.critiqueScore || "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-bold text-green-400 flex items-center gap-1.5 uppercase tracking-wide">
                <Icon name="zap" size={14} />
                AI Improved
              </h3>
              <span className="px-2 py-0.5 bg-green-600/30 border border-green-500/50 rounded text-xs font-bold text-green-300">
                {improvedQuestion.critiqueScore || "N/A"}
              </span>
            </div>
          </div>

          {/* Question Text - side by side */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-slate-800/40 p-3 rounded">
              <div className="text-sm text-white leading-relaxed">
                {originalQuestion.question}
              </div>
            </div>
            <div className="bg-green-900/20 p-3 rounded border border-green-700/30">
              <div className="text-sm text-white leading-relaxed">
                {improvedQuestion.question}
              </div>
            </div>
          </div>

          {/* Answer Options - shared header */}
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
            Answer Options
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="space-y-1.5">
              {["A", "B", "C", "D"].map((letter) => {
                const opt =
                  originalQuestion.options?.[letter] ||
                  originalQuestion[`option${letter}`] ||
                  "";
                const isCorrect =
                  originalQuestion.correctLetter === letter ||
                  originalQuestion.correct === letter;
                return (
                  <div
                    key={letter}
                    className={`p-2 rounded text-xs border ${
                      isCorrect
                        ? "bg-green-600/10 border-green-500/40"
                        : "bg-slate-800/40 border-slate-700/40"
                    }`}
                  >
                    <span className="font-bold text-slate-400 mr-1.5">
                      {letter})
                    </span>
                    <span className="text-white">{opt || "(empty)"}</span>
                  </div>
                );
              })}
            </div>
            <div className="space-y-1.5">
              {["A", "B", "C", "D"].map((letter) => {
                const opt =
                  improvedQuestion.options?.[letter] ||
                  improvedQuestion[`option${letter}`] ||
                  "";
                const isCorrect =
                  improvedQuestion.correctLetter === letter ||
                  improvedQuestion.correct === letter;
                return (
                  <div
                    key={letter}
                    className={`p-2 rounded text-xs border ${
                      isCorrect
                        ? "bg-green-600/10 border-green-500/40"
                        : "bg-slate-800/40 border-slate-700/40"
                    }`}
                  >
                    <span className="font-bold text-slate-400 mr-1.5">
                      {letter})
                    </span>
                    <span className="text-white">{opt || "(empty)"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tags - shared header */}
          {(originalTags.length > 0 || improvedTags.length > 0) && (
            <>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                Tags
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-wrap gap-1.5">
                  {originalTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-slate-700/50 border border-slate-600/50 rounded text-xs text-slate-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {improvedTags.map((tag, idx) => {
                    const isNew = newTags.includes(tag);
                    return (
                      <span
                        key={idx}
                        className={`px-2 py-0.5 rounded text-xs ${
                          isNew
                            ? "bg-green-600/30 border border-green-500/50 text-green-200"
                            : "bg-slate-700/50 border border-slate-600/50 text-slate-300"
                        }`}
                      >
                        #{tag}
                      </span>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 bg-slate-900/90 px-5 py-3 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Icon name="info" size={14} />
            Must <strong className="text-white">Verify</strong> +{" "}
            <strong className="text-white">Accept</strong> after applying
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={onDismiss}
              className="px-4 py-1.5 rounded-lg font-bold text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600 transition-all"
            >
              Keep Original
            </button>
            <button
              onClick={handleApply}
              disabled={isApplying}
              className="px-4 py-1.5 rounded-lg font-bold text-xs bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/50 transition-all disabled:opacity-50"
            >
              {isApplying ? "Applying..." : "Apply Improvements"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovementModal;
