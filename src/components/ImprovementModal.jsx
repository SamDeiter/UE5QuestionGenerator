import { useState } from "react";
import Icon from "./Icon";

/**
 * Side-by-side comparison modal with AI reasoning
 * Clean, easy to read, human must approve
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

  // Get new tags
  const originalTags = originalQuestion.tags || [];
  const improvedTags = improvedQuestion.tags || [];
  const newTags = improvedTags.filter((t) => !originalTags.includes(t));

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl border-2 border-green-500/50 shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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

        {/* AI Reasoning - Why improvements are better */}
        {changesExplanation && (
          <div className="bg-blue-900/20 border-b border-blue-700/30 px-6 py-3">
            <div className="flex items-start gap-2">
              <Icon
                name="message-circle"
                size={16}
                className="text-blue-400 mt-0.5"
              />
              <div>
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-1">
                  AI Reasoning
                </div>
                <div className="text-sm text-slate-200 leading-relaxed">
                  {changesExplanation}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Side-by-Side Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 divide-x divide-slate-700 h-full">
            {/* LEFT: Original - Gray background */}
            <div className="p-6 space-y-4 bg-slate-900/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wide">
                  <Icon name="file-text" size={16} />
                  Original
                </h3>
                <span className="px-2 py-1 bg-slate-700 rounded text-xs font-bold text-slate-400">
                  Score: {originalQuestion.critiqueScore || "N/A"}
                </span>
              </div>
              <QuestionDisplay question={originalQuestion} />
            </div>

            {/* RIGHT: Improved - Green tint background */}
            <div className="p-6 space-y-4 bg-gradient-to-br from-green-950/20 to-green-900/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-green-300 flex items-center gap-2 uppercase tracking-wide">
                  <Icon name="zap" size={16} />
                  AI Improved
                </h3>
                <span className="px-2 py-1 bg-green-600/30 border border-green-500/50 rounded text-xs font-bold text-green-300">
                  Score: {improvedQuestion.critiqueScore || "N/A"}
                </span>
              </div>
              <QuestionDisplay question={improvedQuestion} newTags={newTags} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 bg-slate-900/90 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-slate-400 flex items-center gap-2">
            <Icon name="info" size={16} />
            You must still <strong className="text-white">
              Verify
            </strong> and <strong className="text-white">Accept</strong> after
            applying
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
 * Clean question display - NO DIFF HIGHLIGHTING
 */
const QuestionDisplay = ({ question, newTags = [] }) => {
  return (
    <div className="space-y-4">
      {/* Question Text */}
      <div>
        <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
          Question
        </div>
        <div className="text-base text-white leading-relaxed">
          {question.question}
        </div>
      </div>

      {/* Answer Options */}
      <div>
        <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
          Answer Options
        </div>
        <div className="space-y-2">
          {["A", "B", "C", "D"].map((letter) => {
            const optionText =
              question.options?.[letter] || question[`option${letter}`];
            if (!optionText) return null;

            const isCorrect =
              question.correctLetter === letter || question.correct === letter;

            return (
              <div
                key={letter}
                className={`p-3 rounded-lg border ${
                  isCorrect
                    ? "bg-green-600/10 border-green-500/40"
                    : "bg-slate-800/40 border-slate-700/40"
                }`}
              >
                <div className="flex gap-2">
                  <div className="font-bold text-xs text-slate-400 min-w-[20px]">
                    {letter})
                  </div>
                  <div className="text-sm text-white flex-1">{optionText}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tags */}
      {question.tags && question.tags.length > 0 && (
        <div>
          <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
            Tags
          </div>
          <div className="flex flex-wrap gap-2">
            {question.tags.map((tag, idx) => {
              const isNew = newTags.includes(tag);
              return (
                <span
                  key={idx}
                  className={`px-2 py-1 rounded text-xs font-medium ${
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
      )}
    </div>
  );
};

export default ImprovementModal;
