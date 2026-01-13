/**
 * CritiqueDisplay Component - Shows AI critique with markdown rendering
 *
 * NOTE: Regex patterns are for parsing markdown/list formats.
 * Input is AI-generated critique text - controlled, no DoS risk.
 */
/* eslint-disable sonarjs/slow-regex */
import Icon from "./Icon";
import DiffText from "./DiffText";
import DOMPurify from "dompurify";
import { QUALITY_PASS_THRESHOLD } from "../utils/constants";
import { useThemeColors } from "../hooks/useThemeColors";
import { useAccessibility } from "../contexts/AccessibilityContext";

// Simple markdown to HTML converter with XSS protection
const parseMarkdown = (text) => {
  if (!text) return "";

  // Convert **bold** to <strong>
  let html = text.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="font-semibold text-white">$1</strong>'
  );

  // Convert *italic* to <em> (must be done after bold to avoid conflicts)
  html = html.replace(
    /\*([^*]+)\*/g,
    '<em class="italic text-slate-200">$1</em>'
  );

  // Convert `code` to <code>
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-slate-800 px-1 rounded text-orange-300">$1</code>'
  );

  // SECURITY: Sanitize output to prevent XSS from AI-generated content
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["strong", "em", "code"],
    ALLOWED_ATTR: ["class"],
  });
};

// DiffText imported from shared component

const CritiqueDisplay = ({
  critique,
  onRewrite,
  isProcessing,
  suggestedRewrite,
  rewriteChanges,
  onApplyRewrite,
  onApplyAndAccept: _onApplyAndAccept,
  originalQuestion,
  onExplain,
  onVariate,
}) => {
  // Get colorblind-safe colors from centralized theme (must be before any returns)
  const { scoreColorByValue } = useThemeColors();
  const { colorblindMode } = useAccessibility();
  const cb = colorblindMode;

  // Colorblind-safe colors for correct answers
  const correctColor = cb ? "text-blue-400" : "text-green-400";
  const correctBg = cb
    ? "bg-blue-900/50 text-blue-300"
    : "bg-green-900/50 text-green-300";

  if (!critique) return null;

  // Helper function to get button text (eliminates nested ternary)
  const getApplyButtonText = (isLoading, qualityScore, threshold) => {
    if (isLoading) return "Applying...";
    if (qualityScore >= threshold) return "NO FIX NEEDED";
    return "APPLY FIX";
  };

  // Handle both old (string) and new (object with score) formats
  const isNewFormat =
    typeof critique === "object" && critique.score !== undefined;
  const score = isNewFormat ? critique.score : null;
  const text = (isNewFormat ? critique.text : critique) || "";

  // Process text into structured sections
  const renderContent = () => {
    const lines = text.split("\n").filter((line) => line.trim());
    const elements = [];
    let currentList = [];
    let listType = null; // 'bullet' or 'number'

    const flushList = () => {
      if (currentList.length > 0) {
        const ListTag = listType === "number" ? "ol" : "ul";
        const listClassName =
          listType === "number"
            ? "list-decimal list-inside space-y-0.5 ml-2"
            : "list-disc list-inside space-y-0.5 ml-2";

        elements.push(
          <ListTag key={`list-${elements.length}`} className={listClassName}>
            {currentList.map((item, i) => (
              <li
                key={i}
                dangerouslySetInnerHTML={{ __html: parseMarkdown(item) }}
              />
            ))}
          </ListTag>
        );
        currentList = [];
        listType = null;
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Check for bullet points (* item or - item)
      const bulletMatch = trimmed.match(/^[*-]\s+(.+)$/);
      if (bulletMatch) {
        if (listType !== "bullet") flushList();
        listType = "bullet";
        currentList.push(bulletMatch[1]);
        return;
      }

      // Check for numbered lists (1. item)
      const numberMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (numberMatch) {
        if (listType !== "number") flushList();
        listType = "number";
        currentList.push(numberMatch[1]);
        return;
      }

      // Regular paragraph - flush any pending list first
      flushList();

      // Check if it's a heading (ends with :)
      if (trimmed.endsWith(":") && trimmed.length < 50) {
        elements.push(
          <p
            key={index}
            className="font-semibold text-white mt-2 first:mt-0"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(trimmed) }}
          />
        );
      } else {
        elements.push(
          <p
            key={index}
            className="text-current"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(trimmed) }}
          />
        );
      }
    });

    // Flush any remaining list
    flushList();

    return elements;
  };

  const questionChanged =
    suggestedRewrite &&
    originalQuestion &&
    suggestedRewrite.question !== originalQuestion.question;

  return (
    <div
      className={`mb-3 p-3 border rounded-lg animate-in fade-in slide-in-from-top-2 ${
        isNewFormat
          ? scoreColorByValue(score)
          : "bg-red-950/30 border-red-500/30"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase">
          <Icon name="zap" size={12} />
          AI Critique
        </div>
        <div className="flex items-center gap-3">
          {onRewrite && !suggestedRewrite && (
            <button
              onClick={onRewrite}
              disabled={isProcessing}
              className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Auto-rewrite this question based on critique"
            >
              <Icon name="edit" size={12} />
              {isProcessing ? "Rewriting..." : "Rewrite"}
            </button>
          )}
        </div>
      </div>
      <div className="text-xs text-slate-300 leading-relaxed space-y-1.5">
        {renderContent()}
      </div>

      {/* Suggested Rewrite Section with Word-Level Diff */}
      {suggestedRewrite && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-indigo-300 flex items-center gap-1">
                <Icon name="sparkles" size={12} /> Suggested Improvement
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/50 flex items-center gap-1">
                <Icon name="git-compare" size={10} />
                Word Diff
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* FIX IT button - applies rewrite but keeps question PENDING for human review */}
              {/* Only enabled when score < 60 (needs improvement) */}
              {onApplyRewrite && (
                <button
                  onClick={onApplyRewrite}
                  disabled={isProcessing || score >= QUALITY_PASS_THRESHOLD}
                  className={`px-5 py-2.5 rounded-lg text-white text-sm font-bold transition-all flex items-center gap-2 shadow-lg ${
                    isProcessing || score >= QUALITY_PASS_THRESHOLD
                      ? "bg-slate-700 cursor-not-allowed opacity-50"
                      : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-900/50"
                  }`}
                  title={
                    score >= QUALITY_PASS_THRESHOLD
                      ? "Score is acceptable - no fix needed"
                      : "Apply AI improvements (question stays pending for your review)"
                  }
                >
                  <Icon name="zap" size={16} />
                  {getApplyButtonText(
                    isProcessing,
                    score,
                    QUALITY_PASS_THRESHOLD
                  )}
                </button>
              )}

              {/* Secondary options */}
              <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                {onExplain && (
                  <button
                    onClick={onExplain}
                    disabled={isProcessing}
                    className="px-2 py-1 rounded border border-slate-600 text-slate-400 text-xs hover:text-white hover:border-slate-400 transition-colors disabled:opacity-50"
                    title="Why is this the answer?"
                  >
                    WHY?
                  </button>
                )}
                {onVariate && (
                  <button
                    onClick={onVariate}
                    disabled={isProcessing}
                    className="px-2 py-1 rounded border border-slate-600 text-slate-400 text-xs hover:text-white hover:border-slate-400 transition-colors disabled:opacity-50"
                    title="Generate alternative question variations"
                  >
                    ALTERNATIVES
                  </button>
                )}
              </div>
            </div>
          </div>

          {rewriteChanges && (
            <div className="mb-2 text-xs text-indigo-200 bg-indigo-900/20 p-2 rounded border border-indigo-500/30 flex items-start gap-2">
              <Icon name="info" size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                <span className="font-bold text-indigo-100">Why:</span>{" "}
                {rewriteChanges}
              </span>
            </div>
          )}

          <div className="text-xs space-y-3 bg-black/20 p-3 rounded border border-white/5">
            {/* Question with word-level diff */}
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                <Icon name="message-square" size={10} />
                Question
              </div>
              <div className="text-sm">
                {questionChanged && originalQuestion ? (
                  <DiffText
                    oldText={originalQuestion.question}
                    newText={suggestedRewrite.question}
                  />
                ) : (
                  <span className="text-white">
                    {suggestedRewrite.question}
                  </span>
                )}
              </div>
            </div>

            {/* Options with word-level diff */}
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                <Icon name="list" size={10} />
                Options
              </div>
              <div className="grid grid-cols-1 gap-1.5 pl-2 border-l-2 border-indigo-500/30">
                {["A", "B", "C", "D"].map((letter) => {
                  const newVal = suggestedRewrite.options?.[letter];
                  if (!newVal) return null;

                  const oldVal = originalQuestion?.options?.[letter];
                  const isChanged = oldVal && oldVal !== newVal;
                  const isCorrect = suggestedRewrite.correct === letter;

                  return (
                    <div
                      key={letter}
                      className={`flex items-start gap-2 ${
                        isCorrect ? `${correctColor} font-bold` : ""
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 w-5 h-5 rounded text-center text-[10px] leading-5 font-bold ${
                          isChanged
                            ? "bg-blue-900/50 text-blue-300 border border-blue-700/50"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="flex-1">
                        {isChanged ? (
                          <DiffText oldText={oldVal} newText={newVal} />
                        ) : (
                          <span
                            className={
                              isCorrect ? correctColor : "text-slate-300"
                            }
                          >
                            {newVal}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Correct answer change indicator */}
            {originalQuestion &&
              suggestedRewrite.correct !== originalQuestion.correct && (
                <div className="flex items-center gap-2 text-xs text-yellow-200 bg-yellow-950/30 border border-yellow-700/50 rounded p-2">
                  <Icon name="alert-triangle" size={14} />
                  <span>
                    Correct answer changed:
                    <span className="ml-1 bg-red-900/50 text-red-300 line-through px-1.5 py-0.5 rounded">
                      {originalQuestion.correct}
                    </span>
                    <span className="mx-1">→</span>
                    <span
                      className={`${correctBg} font-bold px-1.5 py-0.5 rounded`}
                    >
                      {suggestedRewrite.correct}
                    </span>
                  </span>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CritiqueDisplay;
