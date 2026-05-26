import { useState } from "react";
import Icon from "../Icon";
// FlagIcon available but emoji used instead for simplicity
import ScoreBadge from "../ScoreBadge";
import { QUESTION_DIFFICULTY } from "../../utils/constants";
import { getDiffBadgeColor } from "../../utils/questionItemHelpers";

/**
 * Normalize difficulty value - handles legacy "BALANCED ALL" and other invalid values
 */
const normalizeDifficulty = (difficulty) => {
  if (!difficulty) return "Unknown";
  const d = difficulty.toString().toLowerCase().trim();

  // Handle legacy "balanced" values - default to the difficulty that was most common
  if (d.includes("balanced")) return "Beginner";

  // Normalize to standard values
  if (d.includes("easy") || d.includes("beginner")) return "Beginner";
  if (d.includes("medium") || d.includes("intermediate")) return "Intermediate";
  if (d.includes("hard") || d.includes("expert") || d.includes("advanced"))
    return "Expert";

  // Return original if it's already valid
  if (["beginner", "intermediate", "expert"].includes(d)) {
    return (
      difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase()
    );
  }

  return difficulty; // Return as-is if we can't normalize
};

const DIFFICULTY_OPTIONS = [
  { value: QUESTION_DIFFICULTY.BEGINNER, label: "Beginner", color: "emerald" },
  {
    value: QUESTION_DIFFICULTY.INTERMEDIATE,
    label: "Intermediate",
    color: "amber",
  },
  { value: QUESTION_DIFFICULTY.EXPERT, label: "Expert", color: "red" },
];

const TRUE_FALSE_OPTIONS = [
  { value: "A", label: "True", color: "emerald" },
  { value: "B", label: "False", color: "red" },
];

const QuestionHeader = ({
  q,
  originalQ, // NEW: The base question record
  colorblindMode = false, // NEW: Use colorblind-safe colors
  onKickBack,
  onCritique, // NEW: Allow re-critique from database view
  appMode,
  onOpenCritiqueModal,
  onUpdateQuestion, // NEW: Callback to save difficulty changes
}) => {
  // Theme colors available via useThemeColors() if needed
  const displayDifficulty = normalizeDifficulty(q.difficulty);
  // Language available via q.language if needed
  const [isEditingDifficulty, setIsEditingDifficulty] = useState(false);
  const [isEditingTrueFalse, setIsEditingTrueFalse] = useState(false);

  // Determine if this is a True/False question
  const isTrueFalseQuestion = q.type === "True/False" || q.type === "T/F";

  // Get current correct answer for T/F questions (normalize to A or B)
  const getCurrentTFAnswer = () => {
    const correct = (q.correct || q.correctLetter || "A")
      .toString()
      .toUpperCase();
    return correct === "B" ? "B" : "A"; // Default to A (True) if unclear
  };

  // Compute title text to avoid nested ternary in JSX
  const currentTFLabel = getCurrentTFAnswer() === "A" ? "True" : "False";
  const tfAnswerTitle = onUpdateQuestion
    ? "Click to change correct answer"
    : `Correct: ${currentTFLabel}`;

  const handleTrueFalseChange = async (newAnswer) => {
    if (onUpdateQuestion && newAnswer !== getCurrentTFAnswer()) {
      await onUpdateQuestion(q.id, {
        correct: newAnswer,
        correctLetter: newAnswer,
      });
    }
    setIsEditingTrueFalse(false);
  };

  const handleDifficultyChange = async (newDifficulty) => {
    if (onUpdateQuestion && newDifficulty !== q.difficulty) {
      await onUpdateQuestion(q.id, { difficulty: newDifficulty });
    }
    setIsEditingDifficulty(false);
  };

  return (
    <div className="flex justify-between items-start">
      <div className="flex flex-col gap-1">
        <div className="flex gap-1.5 items-center flex-wrap">
          {/* Difficulty Badge - Now Clickable */}
          {isEditingDifficulty ? (
            <select
              value={displayDifficulty}
              onChange={(e) => handleDifficultyChange(e.target.value)}
              onBlur={() => setIsEditingDifficulty(false)}
              autoFocus
              className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-slate-800 text-white border border-slate-600 cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <button
              onClick={() => onUpdateQuestion && setIsEditingDifficulty(true)}
              className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${getDiffBadgeColor(
                displayDifficulty,
                colorblindMode
              )} flex items-center gap-1 ${
                onUpdateQuestion
                  ? "cursor-pointer hover:opacity-80 transition-opacity"
                  : ""
              }`}
              title={
                onUpdateQuestion
                  ? "Click to change difficulty"
                  : displayDifficulty
              }
              disabled={!onUpdateQuestion}
            >
              <Icon name="zap" size={12} />
              {displayDifficulty}
              {onUpdateQuestion && (
                <Icon
                  name="chevron-down"
                  size={10}
                  className="ml-0.5 opacity-50"
                />
              )}
            </button>
          )}
          <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border bg-blue-950 text-blue-400 border-blue-900">
            {q.type === "True/False" || q.type === "T/F" ? "T/F" : "MC"}
          </span>

          {/* True/False Answer Toggle - Only for T/F questions */}
          {isTrueFalseQuestion && (
            <>
              {isEditingTrueFalse ? (
                <select
                  value={getCurrentTFAnswer()}
                  onChange={(e) => handleTrueFalseChange(e.target.value)}
                  onBlur={() => setIsEditingTrueFalse(false)}
                  autoFocus
                  className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-slate-800 text-white border border-slate-600 cursor-pointer focus:ring-2 focus:ring-blue-500"
                >
                  {TRUE_FALSE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      Answer: {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={() =>
                    onUpdateQuestion && setIsEditingTrueFalse(true)
                  }
                  className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border flex items-center gap-1 ${
                    getCurrentTFAnswer() === "A"
                      ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                      : "bg-red-950 text-red-400 border-red-800"
                  } ${
                    onUpdateQuestion
                      ? "cursor-pointer hover:opacity-80 transition-opacity"
                      : ""
                  }`}
                  title={tfAnswerTitle}
                  disabled={!onUpdateQuestion}
                >
                  <Icon name="check-circle" size={12} />
                  {getCurrentTFAnswer() === "A" ? "True" : "False"}
                  {onUpdateQuestion && (
                    <Icon
                      name="chevron-down"
                      size={10}
                      className="ml-0.5 opacity-50"
                    />
                  )}
                </button>
              )}
            </>
          )}

          {/* Variation Badge */}
          {q.isVariation && (
            <span
              className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border bg-purple-950 text-purple-400 border-purple-900 flex items-center gap-1"
              title={q.variationNote || "Alternative question variation"}
            >
              <Icon name="git-branch" size={12} />
              ALT
            </span>
          )}

          {/* AI Score Badge - Only shows AFTER AI critique has been run */}
          {q.critiqueScore !== null && q.critiqueScore !== undefined && (
            <ScoreBadge score={q.critiqueScore} />
          )}

          {/* Human Verified Badge - reflects English-source content verification */}
          {q.humanVerified && (
            <span
              className="px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 bg-emerald-900/50 text-emerald-400 border border-emerald-700/50"
              title={`Human Verified by ${q.humanVerifiedBy || "Unknown"}${
                q.humanVerifiedAt
                  ? ` on ${new Date(q.humanVerifiedAt).toLocaleDateString()}`
                  : ""
              }`}
            >
              <Icon name="eye" size={12} />
              VERIFIED
            </span>
          )}

          {/* Translation provenance badge - only on translation tabs */}
          {q.language &&
            q.language !== "English" &&
            (q.translationVerified ? (
              <span
                className="px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 bg-emerald-900/50 text-emerald-400 border border-emerald-700/50"
                title={`Translation verified by ${
                  q.translationVerifiedBy || "Unknown"
                }${
                  q.translationVerifiedAt
                    ? ` on ${new Date(q.translationVerifiedAt).toLocaleDateString()}`
                    : ""
                }`}
              >
                <Icon name="check" size={12} />
                TRANSLATION VERIFIED
              </span>
            ) : (
              <span
                className="px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 bg-amber-900/50 text-amber-400 border border-amber-700/50"
                title="Machine-translated - awaiting bilingual reviewer sign-off"
              >
                <Icon name="bot" size={12} />
                MACHINE TRANSLATED
              </span>
            ))}

          {/* Source Unverified Warning Badge */}
          {q.sourceUnverified && (
            <span
              className="px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 bg-amber-900/50 text-amber-400 border border-amber-700/50 animate-pulse"
              title={`Source not found - flagged by ${
                q.sourceUnverifiedBy || "Unknown"
              }${
                q.sourceUnverifiedAt
                  ? ` on ${new Date(q.sourceUnverifiedAt).toLocaleDateString()}`
                  : ""
              }`}
            >
              <Icon name="flag" size={12} />
              🚩 SOURCE UNVERIFIED
            </span>
          )}
          <div className="flex items-center gap-2 ml-1 border-l border-slate-700/50 pl-2">
            <div
              className="flex items-center gap-1 text-xs text-slate-500"
              title="Creator"
            >
              <Icon name="user" size={12} />
              <span className="font-bold text-slate-400">
                {q.creatorName || "N/A"}
              </span>
            </div>
            {/* Show reviewer - use reviewerName OR humanVerifiedBy with fallback chain */}
            {(() => {
              // Fallback chain: reviewerName -> humanVerifiedBy -> acceptedBy -> creatorEmail -> "Unknown"
              const reviewer =
                q.reviewerName ||
                q.humanVerifiedBy ||
                q.acceptedBy ||
                q.creatorEmail;
              // Always show verifier for verified questions
              if (q.humanVerified) {
                const displayName = reviewer || "Unknown";
                const isSelfVerified =
                  reviewer &&
                  (reviewer === q.creatorName ||
                    reviewer === q.creatorEmail ||
                    reviewer.includes(q.creatorName?.split(" ")[0] || "---"));

                // Check if edited after verification by someone else
                const wasEditedAfter =
                  q.lastEditedAt &&
                  q.lastEditedBy &&
                  q.lastEditedBy !== reviewer &&
                  q.lastEditedBy !== "Unknown";

                return (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div
                      className="flex items-center gap-1"
                      title={isSelfVerified ? "Self-verified" : "Verified by"}
                    >
                      <Icon name="check" size={12} />
                      <span
                        className={`font-bold ${
                          isSelfVerified ? "text-slate-400" : "text-indigo-400"
                        }`}
                      >
                        {displayName}
                      </span>
                    </div>
                    {/* Show editor if different from verifier */}
                    {wasEditedAfter && (
                      <div
                        className="flex items-center gap-1 text-amber-400"
                        title={`Edited ${
                          q.lastEditedAt
                            ? new Date(q.lastEditedAt).toLocaleDateString()
                            : ""
                        }`}
                      >
                        <Icon name="edit-2" size={10} />
                        <span className="font-medium">{q.lastEditedBy}</span>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}
            {/* Translation verifier credit - only on translation tabs when bilingual sign-off exists */}
            {q.language &&
              q.language !== "English" &&
              q.translationVerified &&
              q.translationVerifiedBy && (
                <div
                  className="flex items-center gap-1 text-xs text-slate-500"
                  title={`Translation verified by ${q.translationVerifiedBy}${
                    q.translationVerifiedAt
                      ? ` on ${new Date(q.translationVerifiedAt).toLocaleDateString()}`
                      : ""
                  }`}
                >
                  <Icon name="check" size={12} />
                  <span className="font-bold text-indigo-400">
                    {q.translationVerifiedBy}
                  </span>
                </div>
              )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Show Re-Critique ONLY for already-critiqued low-score questions (<70) in Database and Review modes */}
        {/* Pending questions that haven't been critiqued should use ReviewProgressBar's Critique button */}
        {/* Hidden on translation tabs: AI critique scores the source content, not the translation */}
        {(!q.language || q.language === "English") &&
          (appMode === "database" || appMode === "review") &&
          onCritique &&
          q.critiqueScore !== null &&
          q.critiqueScore !== undefined &&
          q.critiqueScore < 70 && (
            <button
              onClick={() => onCritique(originalQ || q)}
              className="px-3 py-1.5 rounded-lg transition-all bg-purple-900/30 text-purple-300 hover:bg-purple-800/50 hover:text-purple-200 border border-purple-700/50 flex items-center gap-2 text-xs font-medium"
              title="Run AI Critique again to generate tags and improvements"
              aria-label="Re-run AI Critique"
            >
              <Icon name="sparkles" size={14} />
              Re-Critique
            </button>
          )}

        {/* View AI Suggestions Button - Shows for ANY critiqued question with suggestions */}
        {(appMode === "database" || appMode === "review") &&
          onOpenCritiqueModal &&
          q.critiqueScore !== null &&
          q.critiqueScore !== undefined &&
          (q.critique || q.suggestedRewrite) && (
            <button
              onClick={onOpenCritiqueModal}
              className="px-3 py-1.5 rounded-lg transition-all bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/50 hover:text-indigo-200 border border-indigo-700/50 flex items-center gap-2 text-xs font-medium"
              title="View AI critique details and suggestions"
              aria-label="View AI Suggestions"
            >
              <Icon name="eye" size={14} />
              View AI Suggestions
            </button>
          )}
        {appMode === "database" && (
          <button
            onClick={() => onKickBack(originalQ || q)}
            className="px-3 py-1.5 rounded-lg transition-all bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/50 hover:text-indigo-200 border border-indigo-700/50 flex items-center gap-2 text-xs font-medium"
            title="Send back to Review Console"
            aria-label="Kick back to review"
          >
            <Icon name="corner-up-left" size={14} />
            Kick Back to Review
          </button>
        )}

        {/* REVIEW MODE: Show Restore button for rejected questions */}
        {appMode === "review" && q.status === "rejected" && onKickBack && (
          <button
            onClick={() => onKickBack(originalQ || q)}
            className="px-4 py-2 mr-4 rounded-lg transition-all bg-amber-900/40 text-amber-300 hover:bg-amber-800/60 hover:text-amber-200 border-2 border-amber-700/50 hover:border-amber-500 flex items-center gap-2 text-sm font-bold"
            title="Restore to Pending for re-review"
            aria-label="Restore to pending"
          >
            <Icon name="refresh-cw" size={18} />
            Restore to Pending
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionHeader;
