import React from "react";
import Icon from "../Icon";
import { ANSWER_STATE, DOC_LINK_STATE } from "../../utils/constants";

/**
 * ReviewStateSelector - Explicit state selection for answer and doc link assessment
 *
 * Decouples answer correctness from doc link quality, allowing reviewers to:
 * - Mark answer as Correct / Incorrect / Unsure
 * - Mark doc link as Relevant / Too Broad / Incorrect / Missing
 *
 * This enables the core principle: "If answer is correct but doc is wrong, fix the doc"
 */
const ReviewStateSelector = ({
  answerState,
  docLinkState,
  onAnswerStateChange,
  onDocLinkStateChange,
  disabled = false,
  showGuidance = true,
}) => {
  // Answer state options with styling
  const answerOptions = [
    {
      value: ANSWER_STATE.CORRECT,
      label: "Correct",
      icon: "check-circle",
      activeClass: "bg-green-600/30 text-green-400 border-green-500/50",
      hoverClass: "hover:bg-green-600/20 hover:border-green-600/40",
    },
    {
      value: ANSWER_STATE.INCORRECT,
      label: "Incorrect",
      icon: "x-circle",
      activeClass: "bg-red-600/30 text-red-400 border-red-500/50",
      hoverClass: "hover:bg-red-600/20 hover:border-red-600/40",
    },
    {
      value: ANSWER_STATE.UNSURE,
      label: "Unsure",
      icon: "help-circle",
      activeClass: "bg-amber-600/30 text-amber-400 border-amber-500/50",
      hoverClass: "hover:bg-amber-600/20 hover:border-amber-600/40",
    },
  ];

  // Doc link state options with styling
  const docLinkOptions = [
    {
      value: DOC_LINK_STATE.RELEVANT,
      label: "Relevant",
      icon: "check",
      activeClass: "bg-green-600/30 text-green-400 border-green-500/50",
      hoverClass: "hover:bg-green-600/20 hover:border-green-600/40",
    },
    {
      value: DOC_LINK_STATE.TOO_BROAD,
      label: "Too Broad",
      icon: "maximize-2",
      activeClass: "bg-amber-600/30 text-amber-400 border-amber-500/50",
      hoverClass: "hover:bg-amber-600/20 hover:border-amber-600/40",
    },
    {
      value: DOC_LINK_STATE.INCORRECT,
      label: "Incorrect",
      icon: "x",
      activeClass: "bg-red-600/30 text-red-400 border-red-500/50",
      hoverClass: "hover:bg-red-600/20 hover:border-red-600/40",
    },
    {
      value: DOC_LINK_STATE.MISSING,
      label: "Missing",
      icon: "file-x",
      activeClass: "bg-slate-600/30 text-slate-400 border-slate-500/50",
      hoverClass: "hover:bg-slate-600/20 hover:border-slate-600/40",
    },
  ];

  // Get contextual guidance based on current state
  const getGuidanceMessage = () => {
    if (
      answerState === ANSWER_STATE.CORRECT &&
      docLinkState === DOC_LINK_STATE.INCORRECT
    ) {
      return {
        icon: "edit",
        color: "text-blue-400",
        message:
          "✅ Answer looks good! Edit the doc link above to fix the issue.",
      };
    }
    if (
      answerState === ANSWER_STATE.CORRECT &&
      docLinkState === DOC_LINK_STATE.TOO_BROAD
    ) {
      return {
        icon: "search",
        color: "text-amber-400",
        message:
          "✅ Answer correct, but doc link could be more specific. Consider editing it.",
      };
    }
    if (answerState === ANSWER_STATE.UNSURE) {
      return {
        icon: "alert-circle",
        color: "text-amber-400",
        message:
          "🤔 Not sure about the answer? Consider marking for research below.",
      };
    }
    if (answerState === ANSWER_STATE.INCORRECT) {
      return {
        icon: "alert-triangle",
        color: "text-red-400",
        message:
          "❌ If the answer is incorrect, edit it above or reject the question.",
      };
    }
    return null;
  };

  const guidance = showGuidance ? getGuidanceMessage() : null;

  const renderOptionButton = (option, currentValue, onChange) => {
    const isActive = currentValue === option.value;
    const baseClass =
      "flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md border transition-all";
    const inactiveClass = "bg-slate-800/50 text-slate-400 border-slate-700";

    return (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        disabled={disabled}
        className={`${baseClass} ${
          isActive
            ? option.activeClass
            : `${inactiveClass} ${option.hoverClass}`
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        title={option.label}
      >
        <Icon name={option.icon} size={12} />
        <span className="hidden sm:inline">{option.label}</span>
      </button>
    );
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon name="clipboard-check" size={14} className="text-blue-400" />
        <span className="text-xs font-bold text-blue-300 uppercase tracking-wide">
          Review Assessment
        </span>
      </div>

      {/* Two-column layout for Answer and Doc Link states */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Answer State */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Answer Correctness
          </label>
          <div className="flex gap-1">
            {answerOptions.map((option) =>
              renderOptionButton(option, answerState, onAnswerStateChange)
            )}
          </div>
        </div>

        {/* Doc Link State */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Documentation Link Quality
          </label>
          <div className="flex gap-1">
            {docLinkOptions.map((option) =>
              renderOptionButton(option, docLinkState, onDocLinkStateChange)
            )}
          </div>
        </div>
      </div>

      {/* Contextual guidance */}
      {guidance && (
        <div
          className={`flex items-center gap-2 text-xs ${guidance.color} bg-slate-800/50 rounded-md px-3 py-2 animate-in fade-in slide-in-from-bottom-1 duration-200`}
        >
          <Icon name={guidance.icon} size={14} />
          <span>{guidance.message}</span>
        </div>
      )}
    </div>
  );
};

export default ReviewStateSelector;
