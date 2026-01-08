import { sanitizeText } from "../utils/sanitize";
import Icon from "./Icon";
import { renderMarkdown } from "../utils/stringHelpers";
import DiffText from "./DiffText";
import { QUALITY_THRESHOLDS } from "../utils/constants";
import { getSeverityStyles } from "../utils/scoreColors";
import { useAccessibility } from "../contexts/AccessibilityContext";

// DiffText imported from shared component

const CritiqueModal = ({
  isOpen,
  onClose,
  q,
  text,
  score,
  loading,
  onFix,
  isFixing,
  onAccept,
  rewrite,
  changes,
  onApplySuggestions,
}) => {
  if (!isOpen || !q) return null;

  // Get accessibility preference
  const { colorblindMode } = useAccessibility();

  // Use shared severity styles utility with colorblind support
  const styles = getSeverityStyles(score, colorblindMode);
  const isFailing = score !== null && score < QUALITY_THRESHOLDS.MEDIOCRE;

  // Check if question was changed
  const questionChanged = rewrite?.question && rewrite.question !== q.question;

  // Check which options changed
  const optionChanges = ["A", "B", "C", "D"].filter((letter) => {
    const oldVal = q.options?.[letter];
    const newVal = rewrite?.options?.[letter];
    return newVal && oldVal !== newVal;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh]">
        <div
          className={`p-4 border-b ${styles.border} flex justify-between items-center bg-slate-950/50 rounded-t-xl`}
        >
          <div
            className={`flex items-center gap-2 ${styles.icon} font-bold uppercase tracking-wider text-sm`}
          >
            <Icon name="zap" size={18} />
            <span>AI Critique {score !== null && `• Score: ${score}/100`}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Original Question */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase text-slate-500">
              Original Question
            </div>
            <div
              className="p-4 bg-slate-950 border border-slate-800 rounded text-sm text-slate-300"
              dangerouslySetInnerHTML={{ __html: sanitizeText(q.question) }}
            />
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase text-slate-500">
              Feedback
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 animate-pulse p-4">
                <Icon name="loader" className="animate-spin" /> Analyzing Logic
                & Syntax...
              </div>
            ) : (
              <div
                className={`p-4 ${styles.bg} border ${styles.border} rounded text-sm ${styles.text} leading-relaxed`}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
              />
            )}
          </div>

          {/* Suggested Changes with Word-Level Diff */}
          {rewrite && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  AI Improvements
                </div>
                <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/50">
                  <Icon name="git-compare" size={10} />
                  <span>Word-Level Diff</span>
                </div>
              </div>

              {/* Change Summary */}
              {changes && (
                <div className="p-3 bg-indigo-950/30 border border-indigo-700/50 rounded text-xs text-indigo-200 italic flex items-start gap-2">
                  <Icon
                    name="info"
                    size={14}
                    className="flex-shrink-0 mt-0.5"
                  />
                  <span>{changes}</span>
                </div>
              )}

              <div className="p-4 bg-slate-950/50 border border-slate-700 rounded space-y-4">
                {/* Question Diff */}
                {questionChanged && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                      <Icon name="message-square" size={12} />
                      Question Text
                    </div>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded text-sm">
                      <DiffText
                        oldText={q.question}
                        newText={rewrite.question}
                      />
                    </div>
                  </div>
                )}

                {/* Options Diff */}
                {optionChanges.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                      <Icon name="list" size={12} />
                      Answer Options
                    </div>
                    <div className="space-y-2">
                      {optionChanges.map((letter) => (
                        <div
                          key={letter}
                          className="flex items-start gap-3 p-3 bg-slate-900 border border-slate-800 rounded"
                        >
                          <div className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">
                            {letter}
                          </div>
                          <div className="flex-1 text-sm">
                            <DiffText
                              oldText={q.options?.[letter]}
                              newText={rewrite.options?.[letter]}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Correct Answer Change */}
                {rewrite.correct && rewrite.correct !== q.correct && (
                  <div className="flex items-center gap-2 text-xs text-yellow-200 bg-yellow-950/30 border border-yellow-700/50 rounded p-3">
                    <Icon name="alert-triangle" size={14} />
                    <span>
                      Correct answer changed:
                      <span className="ml-1 bg-red-900/50 text-red-300 line-through px-1.5 py-0.5 rounded">
                        {q.correct}
                      </span>
                      <span className="mx-1">→</span>
                      <span className="bg-green-900/50 text-green-300 font-bold px-1.5 py-0.5 rounded">
                        {rewrite.correct}
                      </span>
                    </span>
                  </div>
                )}

                {/* No Changes Detected */}
                {!questionChanged &&
                  optionChanges.length === 0 &&
                  rewrite.correct === q.correct && (
                    <div className="text-xs text-slate-400 text-center py-2">
                      <Icon
                        name="check-circle"
                        size={14}
                        className="inline mr-1"
                      />
                      No structural changes suggested - question is already
                      well-formed
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50 rounded-b-xl flex justify-center gap-3 flex-wrap">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded flex items-center gap-2 text-xs uppercase transition-all shadow-lg hover:shadow-slate-900/20"
          >
            Dismiss
          </button>

          {rewrite && onApplySuggestions && (
            <button
              onClick={() => onApplySuggestions(rewrite)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded flex items-center gap-2 text-xs uppercase transition-all shadow-lg hover:shadow-blue-900/20"
            >
              <Icon name="check-circle" size={14} />
              Apply All Suggestions
            </button>
          )}

          <button
            onClick={onFix}
            disabled={loading || isFixing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded flex items-center gap-2 text-xs uppercase transition-all shadow-lg hover:shadow-indigo-900/20"
          >
            {isFixing ? (
              <Icon name="loader" className="animate-spin" size={14} />
            ) : (
              <Icon name="sparkles" size={14} />
            )}
            Regenerate
          </button>

          <button
            onClick={onAccept}
            disabled={isFailing || loading}
            title={isFailing ? "Score too low to accept" : "Accept Question"}
            className={`px-4 py-2 font-bold rounded flex items-center gap-2 text-xs uppercase transition-all shadow-lg ${
              isFailing || loading
                ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                : "bg-green-600 hover:bg-green-500 text-white hover:shadow-green-900/20"
            }`}
          >
            <Icon name="check" size={14} /> Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CritiqueModal;
