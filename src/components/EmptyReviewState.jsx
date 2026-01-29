import React from "react";
import Icon from "./Icon";

/**
 * EmptyReviewState - Illustrated empty state with CTA
 * Guides users to generate questions when Review is empty
 */
const EmptyReviewState = ({
  onNavigateToCreate,
  hasQuestionsInOtherFilters = false,
  isAdmin = false,
}) => {
  const getMessage = () => {
    if (hasQuestionsInOtherFilters) {
      return "All questions in this filter have been reviewed! Check other filters or generate more.";
    }
    if (isAdmin) {
      return "Generate your first batch of questions to start reviewing and approving them for your assessments.";
    }
    return "No questions are pending review. Ask an administrator to generate more questions.";
  };

  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-8">
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
          <Icon name="clipboard-list" size={48} className="text-indigo-400" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center animate-bounce">
          <Icon name="sparkles" size={20} className="text-orange-400" />
        </div>
      </div>

      {/* Message */}
      <h3 className="text-xl font-bold text-white mb-2">
        {hasQuestionsInOtherFilters
          ? "No Pending Questions"
          : "Ready to Review"}
      </h3>
      <p className="text-slate-400 text-center max-w-md mb-6">{getMessage()}</p>

      {/* CTA Button - Admin only */}
      {isAdmin && (
        <button
          onClick={onNavigateToCreate}
          className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95"
        >
          <Icon name="plus-circle" size={20} />
          Generate Your First Batch
        </button>
      )}

      {/* Keyboard shortcut hint - Admin only */}
      {isAdmin && (
        <p className="text-xs text-slate-600 mt-4">
          or press{" "}
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">
            Ctrl
          </kbd>{" "}
          +{" "}
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">
            Enter
          </kbd>{" "}
          in Create mode
        </p>
      )}
    </div>
  );
};

export default EmptyReviewState;
