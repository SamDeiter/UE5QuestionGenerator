import { useState } from "react";
import Icon from "./Icon";

/**
 * Comprehensive Critique Modal - Shows critique + side-by-side improvements
 * Combines AI feedback with visual comparison in one view
 */
const ImprovementModal = ({
  originalQuestion,
  improvedQuestion,
  changesExplanation,
  critiqueText,
  critiqueScore,
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
    improvedQuestion?.critiqueScore && originalQuestion?.critiqueScore
      ? improvedQuestion.critiqueScore - originalQuestion.critiqueScore
      : 0;

  const originalTags = originalQuestion?.tags || [];
  const improvedTags = improvedQuestion?.tags || [];
  const newTags = improvedQuestion
    ? improvedTags.filter((tag) => !originalTags.includes(tag))
    : [];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl border-2 border-green-500/50 shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border-b border-green-600/30 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="sparkles" size={20} className="text-green-400" />
              <h2 className="text-lg font-bold text-white">AI Critique</h2>
              <span
                className={`px-3 py-1 rounded text-sm font-bold ${
                  critiqueScore >= 90
                    ? "bg-green-600/20 border border-green-500/50 text-green-300"
                    : critiqueScore >= 70
                    ? "bg-yellow-600/20 border border-yellow-500/50 text-yellow-300"
                    : "bg-red-600/20 border border-red-500/50 text-red-300"
                }`}
              >
                Score: {critiqueScore}/100
              </span>
              {scoreDelta > 0 && (
                <span className="px-2 py-1 bg-green-600/20 border border-green-500/50 rounded text-xs font-bold text-green-300">
                  +{scoreDelta} pts improvement
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* AI Critique Feedback */}
          <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-2">
              <Icon
                name="message-square"
                size={16}
                className="text-orange-400 mt-0.5 flex-shrink-0"
              />
              <div className="text-xs font-bold text-orange-400 uppercase tracking-wide">
                AI Critique
              </div>
            </div>
            <div className="text-sm text-slate-200 leading-relaxed">
              {critiqueText}
            </div>
          </div>

          {/* Suggested Improvement Section */}
          {changesExplanation && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="zap" size={16} className="text-green-400" />
                <div className="text-sm font-bold text-green-400 uppercase tracking-wide">
                  Suggested Improvement
                </div>
              </div>

              {/* Why Explanation */}
              <div className="bg-blue-900/15 border border-blue-700/30 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Icon
                    name="lightbulb"
                    size={14}
                    className="text-blue-400 mt-0.5 flex-shrink-0"
                  />
                  <div className="text-xs text-slate-200 leading-relaxed">
                    <strong className="text-blue-400">Why:</strong>{" "}
                    {changesExplanation}
                  </div>
                </div>
              </div>

              {/* Column Headers with Scores */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <Icon name="file-text" size={14} />
                    Original
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold border ${
                      critiqueScore >= 90
                        ? "bg-green-900/50 border-green-500 text-green-300"
                        : critiqueScore >= 70
                        ? "bg-yellow-900/50 border-yellow-500 text-yellow-300"
                        : "bg-red-900/50 border-red-500 text-red-300"
                    }`}
                  >
                    {critiqueScore}/100
                  </span>
                </div>
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-bold text-green-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <Icon name="check-circle" size={14} />
                    Improved
                  </h3>
                  {improvedQuestion?.critiqueScore ? (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold border ${
                        improvedQuestion.critiqueScore >= 90
                          ? "bg-green-900/50 border-green-500 text-green-300"
                          : improvedQuestion.critiqueScore >= 70
                          ? "bg-yellow-900/50 border-yellow-500 text-yellow-300"
                          : "bg-orange-900/50 border-orange-500 text-orange-300"
                      }`}
                    >
                      {improvedQuestion.critiqueScore}/100
                      {scoreDelta > 0 && (
                        <span className="ml-1 text-green-400">
                          (+{scoreDelta})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-500 italic">
                      Not scored
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div className="grid grid-cols-2 gap-4 mb-4">
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

              {/* Answer Options */}
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                Answer Options
              </div>
              <div className="space-y-1.5 mb-4">
                {["A", "B", "C", "D"].map((letter) => {
                  const originalOpt =
                    originalQuestion.options?.[letter] ||
                    originalQuestion[`option${letter}`] ||
                    "";
                  const improvedOpt =
                    improvedQuestion.options?.[letter] ||
                    improvedQuestion[`option${letter}`] ||
                    "";
                  const originalCorrect =
                    originalQuestion.correctLetter === letter ||
                    originalQuestion.correct === letter;
                  const improvedCorrect =
                    improvedQuestion.correctLetter === letter ||
                    improvedQuestion.correct === letter;

                  return (
                    <div key={letter} className="grid grid-cols-2 gap-4">
                      {/* Original Option */}
                      <div
                        className={`p-2 rounded text-xs border ${
                          originalCorrect
                            ? "bg-green-600/10 border-green-500/40"
                            : "bg-slate-800/40 border-slate-700/40"
                        }`}
                      >
                        <span className="font-bold text-slate-400 mr-1.5">
                          {letter})
                        </span>
                        <span className="text-white">
                          {originalOpt || "(empty)"}
                        </span>
                      </div>

                      {/* Improved Option */}
                      <div
                        className={`p-2 rounded text-xs border ${
                          improvedCorrect
                            ? "bg-green-600/10 border-green-500/40"
                            : "bg-slate-800/40 border-slate-700/40"
                        }`}
                      >
                        <span className="font-bold text-slate-400 mr-1.5">
                          {letter})
                        </span>
                        <span className="text-white">
                          {improvedOpt || "(empty)"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tags */}
              {(originalTags.length > 0 || improvedTags.length > 0) && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                    Tags
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Original Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {originalTags.length > 0 ? (
                        originalTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-700/50 border border-slate-600/50 rounded text-xs text-slate-300"
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">
                          No tags
                        </span>
                      )}
                    </div>

                    {/* Improved Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {improvedTags.length > 0 ? (
                        improvedTags.map((tag, idx) => {
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
                        })
                      ) : (
                        <span className="text-xs text-slate-500 italic">
                          No tags
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-slate-700 bg-slate-900/90 px-5 py-3 flex items-center justify-center gap-2.5">
          <div className="flex gap-2.5">
            <button
              onClick={onDismiss}
              className="px-4 py-1.5 rounded-lg font-bold text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600 transition-all"
            >
              {changesExplanation ? "Keep Original" : "Close"}
            </button>
            {changesExplanation && (
              <button
                onClick={handleApply}
                disabled={isApplying}
                className="px-4 py-1.5 rounded-lg font-bold text-xs bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/50 transition-all disabled:opacity-50"
              >
                {isApplying ? "Applying..." : "Apply Improvements"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovementModal;
