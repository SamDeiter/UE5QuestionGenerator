import { useState } from "react";
import Icon from "./Icon";
import { diffWords } from "../utils/diffUtils";

/**
 * Modal for comparing original question vs AI-improved version
 * Shows side-by-side comparison with visual diff highlighting
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

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl border-2 border-green-600/50 shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-900/40 to-blue-900/40 border-b border-green-600/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="sparkles" size={24} className="text-green-400" />
              <h2 className="text-xl font-bold text-green-300">
                AI Improvement Available
              </h2>
              {scoreDelta > 0 && (
                <span className="px-3 py-1 bg-green-600/20 border border-green-500/50 rounded-full text-green-300 font-bold text-sm">
                  +{scoreDelta} points ({originalQuestion.critiqueScore || 0} →{" "}
                  {improvedQuestion.critiqueScore || 0})
                </span>
              )}
            </div>
            <button
              onClick={onDismiss}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              aria-label="Close modal"
            >
              <Icon name="x" size={20} />
            </button>
          </div>
        </div>

        {/* Side-by-side comparison */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 divide-x divide-slate-700">
            {/* ORIGINAL VERSION */}
            <div className="p-6 bg-slate-900/50">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                  <Icon name="file-text" size={18} />
                  Original
                </h3>
                <span className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs font-bold text-slate-400">
                  Score: {originalQuestion.critiqueScore || "N/A"}
                </span>
              </div>

              <QuestionComparisonCard
                question={originalQuestion}
                highlightType="removed"
                comparedTo={improvedQuestion}
              />
            </div>

            {/* IMPROVED VERSION */}
            <div className="p-6 bg-gradient-to-br from-green-950/20 to-blue-950/20">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-green-300 flex items-center gap-2">
                  <Icon name="zap" size={18} />
                  AI Improved
                </h3>
                <span className="px-2 py-1 bg-green-600/20 border border-green-500/50 rounded text-xs font-bold text-green-300">
                  Score: {improvedQuestion.critiqueScore || "N/A"}
                </span>
              </div>

              <QuestionComparisonCard
                question={improvedQuestion}
                highlightType="added"
                comparedTo={originalQuestion}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-700 bg-slate-900/80 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            <Icon name="info" size={16} className="inline mr-2" />
            Review changes carefully before applying. You'll still need to
            verify and accept.
          </div>
          <div className="flex gap-3">
            <button
              onClick={onDismiss}
              className="px-6 py-2 rounded-lg font-bold text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600 transition-all"
            >
              <Icon name="x" size={16} className="inline mr-2" />
              Keep Original
            </button>
            <button
              onClick={handleApply}
              disabled={isApplying}
              className="px-6 py-2 rounded-lg font-bold text-sm bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? (
                <>
                  <Icon
                    name="loader"
                    size={16}
                    className="inline mr-2 animate-spin"
                  />
                  Applying...
                </>
              ) : (
                <>
                  <Icon name="check" size={16} className="inline mr-2" />
                  Apply Improvement
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Question card for comparison with diff highlighting
 */
const QuestionComparisonCard = ({ question, highlightType, comparedTo }) => {
  const getDiffHighlightedText = (originalText, comparedText) => {
    const diffs = diffWords(originalText, comparedText);

    return diffs.map((part, index) => {
      if (highlightType === "removed" && part.removed) {
        return (
          <span
            key={index}
            className="bg-red-900/40 text-red-300 line-through px-1 rounded"
          >
            {part.value}
          </span>
        );
      }
      if (highlightType === "added" && part.added) {
        return (
          <span
            key={index}
            className="bg-green-900/40 text-green-300 px-1 rounded font-semibold"
          >
            {part.value}
          </span>
        );
      }
      if (!part.added && !part.removed) {
        return <span key={index}>{part.value}</span>;
      }
      return null;
    });
  };

  return (
    <div className="space-y-4">
      {/* Metadata badges */}
      <div className="flex flex-wrap gap-2 items-center">
        <span
          className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border ${
            question.difficulty === "Beginner"
              ? "bg-slate-800 text-slate-400 border-slate-700"
              : question.difficulty === "Intermediate"
              ? "bg-blue-900/40 text-blue-400 border-blue-800"
              : "bg-purple-900/40 text-purple-400 border-purple-800"
          }`}
        >
          {question.difficulty}
        </span>
        <span className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border bg-blue-950 text-blue-400 border-blue-900">
          {question.type === "True/False" ? "T/F" : "MC"}
        </span>
        <span className="text-xs text-slate-500">
          <Icon name="user" size={12} className="inline mr-1" />
          {question.creatorName || "Unknown"}
        </span>
      </div>

      {/* Question text with diff highlighting */}
      <div className="text-base text-slate-200 leading-relaxed">
        {getDiffHighlightedText(comparedTo.question, question.question)}
      </div>

      {/* Answer options */}
      <div className="flex gap-2">
        {question.type === "True/False" ? (
          <>
            <button
              className={`px-4 py-2 rounded-lg font-bold text-sm ${
                question.correct === "True"
                  ? "bg-green-600/20 text-green-300 border-2 border-green-500"
                  : "bg-slate-800 text-slate-400 border-2 border-slate-700"
              }`}
            >
              TRUE
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-bold text-sm ${
                question.correct === "False"
                  ? "bg-green-600/20 text-green-300 border-2 border-green-500"
                  : "bg-slate-800 text-slate-400 border-2 border-slate-700"
              }`}
            >
              FALSE
            </button>
          </>
        ) : (
          ["A", "B", "C", "D"].map((letter) => {
            const optionText =
              question.options?.[letter] || question[`option${letter}`];
            if (!optionText) return null;

            return (
              <div
                key={letter}
                className={`flex-1 p-3 rounded-lg border-2 ${
                  question.correctLetter === letter
                    ? "bg-green-600/20 border-green-500"
                    : "bg-slate-800 border-slate-700"
                }`}
              >
                <div className="font-bold text-xs text-slate-400 mb-1">
                  {letter}
                </div>
                <div className="text-sm text-slate-200">
                  {getDiffHighlightedText(
                    comparedTo.options?.[letter] ||
                      comparedTo[`option${letter}`] ||
                      "",
                    optionText
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Source context */}
      {question.sourceExcerpt && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
          <div className="text-xs font-bold text-blue-400 mb-1 flex items-center gap-1">
            <Icon name="book-open" size={12} />
            Source Context
          </div>
          <div className="text-xs text-slate-400 italic">
            "{question.sourceExcerpt}"
          </div>
        </div>
      )}

      {/* Tags */}
      {question.tags && question.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {question.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-indigo-900/30 border border-indigo-700/50 rounded text-xs text-indigo-300"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImprovementModal;
