import { useState } from "react";
import Icon from "./Icon";
import { diffWords } from "../utils/diffUtils";

/**
 * SIMPLIFIED Modal for reviewing AI improvements
 * Human-in-the-loop: User MUST explicitly approve changes
 */
const ImprovementModal = ({
  originalQuestion,
  improvedQuestion,
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

  // Get new tags
  const originalTags = originalQuestion.tags || [];
  const improvedTags = improvedQuestion.tags || [];
  const newTags = improvedTags.filter((t) => !originalTags.includes(t));

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
      <div className="bg-slate-900 rounded-xl border-2 border-green-500/50 shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border-b border-green-600/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="sparkles" size={24} className="text-green-400" />
              <h2 className="text-xl font-bold text-white">
                AI Suggested Improvements
              </h2>
              {scoreDelta > 0 && (
                <span className="px-3 py-1 bg-green-600/20 border border-green-500/50 rounded-full text-green-300 font-bold text-sm">
                  +{scoreDelta} points
                </span>
              )}
            </div>
            <button
              onClick={onDismiss}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <Icon name="x" size={20} />
            </button>
          </div>
        </div>

        {/* Content - SINGLE COLUMN with highlighted changes */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Question Text */}
          <div>
            <div className="text-xs font-bold text-green-400 mb-2 uppercase tracking-wide">
              Question
            </div>
            <div className="text-lg text-white leading-relaxed bg-slate-800/50 p-4 rounded-lg">
              <DiffText
                original={originalQuestion.question}
                improved={improvedQuestion.question}
              />
            </div>
          </div>

          {/* Answer Options */}
          <div>
            <div className="text-xs font-bold text-green-400 mb-3 uppercase tracking-wide">
              Answer Options
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["A", "B", "C", "D"].map((letter) => {
                const origOpt =
                  originalQuestion.options?.[letter] ||
                  originalQuestion[`option${letter}`];
                const impOpt =
                  improvedQuestion.options?.[letter] ||
                  improvedQuestion[`option${letter}`];
                if (!origOpt && !impOpt) return null;

                const isCorrect =
                  improvedQuestion.correctLetter === letter ||
                  improvedQuestion.correct === letter;

                return (
                  <div
                    key={letter}
                    className={`p-3 rounded-lg border-2 ${
                      isCorrect
                        ? "bg-green-600/10 border-green-500/50"
                        : "bg-slate-800/50 border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-400 mb-1">
                      {letter})
                    </div>
                    <div className="text-sm text-white">
                      <DiffText
                        original={origOpt || ""}
                        improved={impOpt || ""}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* New Tags */}
          {newTags.length > 0 && (
            <div>
              <div className="text-xs font-bold text-green-400 mb-2 uppercase tracking-wide">
                New Tags Added
              </div>
              <div className="flex flex-wrap gap-2">
                {newTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-green-600/20 border border-green-500/50 rounded-full text-green-300 font-medium text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 bg-slate-900/90 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-slate-400 flex items-center gap-2">
            <Icon name="info" size={16} />
            You must still <strong>Verify</strong> and <strong>Accept</strong>{" "}
            after applying
          </div>
          <div className="flex gap-3">
            <button
              onClick={onDismiss}
              className="px-5 py-2 rounded-lg font-bold text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600 transition-all"
            >
              Keep Original
            </button>
            <button
              onClick={handleApply}
              disabled={isApplying}
              className="px-5 py-2 rounded-lg font-bold text-sm bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/50 transition-all disabled:opacity-50"
            >
              {isApplying ? "Applying..." : "Apply Improvements"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Displays text with inline diff highlighting (green = added, red = removed)
 */
const DiffText = ({ original, improved }) => {
  const diffs = diffWords(original, improved);

  return (
    <>
      {diffs.map((part, index) => {
        if (part.removed) {
          return (
            <span
              key={index}
              className="bg-red-900/30 text-red-400 line-through px-0.5"
            >
              {part.value}
            </span>
          );
        }
        if (part.added) {
          return (
            <span
              key={index}
              className="bg-green-900/30 text-green-300 font-semibold px-0.5"
            >
              {part.value}
            </span>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </>
  );
};

export default ImprovementModal;
