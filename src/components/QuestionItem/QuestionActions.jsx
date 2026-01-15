import { useState, useRef, useEffect } from "react";
import Icon from "../Icon";
import { useAccessibility } from "../../contexts/AccessibilityContext";
import { TOAST_DURATION } from "../../utils/constants";

// Rejection reason options with categories for analytics
const REJECTION_REASONS = [
  // Content Issues
  {
    id: "too_easy",
    label: "Too Easy",
    icon: "arrow-down",
    category: "content",
  },
  {
    id: "too_hard",
    label: "Too Difficult",
    icon: "arrow-up",
    category: "content",
  },
  {
    id: "unclear",
    label: "Unclear Question",
    icon: "help-circle",
    category: "content",
  },
  {
    id: "irrelevant",
    label: "Off Topic/Irrelevant",
    icon: "slash",
    category: "content",
  },

  // Accuracy Issues
  {
    id: "incorrect",
    label: "Incorrect Answer",
    icon: "x-circle",
    category: "accuracy",
  },
  {
    id: "outdated",
    label: "Outdated Info",
    icon: "clock",
    category: "accuracy",
  },
  {
    id: "misleading",
    label: "Misleading Options",
    icon: "alert-triangle",
    category: "accuracy",
  },

  // Duplicate Issues
  { id: "duplicate", label: "Duplicate", icon: "copy", category: "duplicate" },
  {
    id: "too_similar",
    label: "Too Similar to Another",
    icon: "git-merge",
    category: "duplicate",
  },

  // AI Issues
  {
    id: "hallucination",
    label: "AI Hallucination",
    icon: "bot",
    category: "accuracy",
  },
  {
    id: "ai_overview",
    label: "Google AI Overview",
    icon: "search",
    category: "accuracy",
  },

  // Source Issues
  {
    id: "bad_source",
    label: "Bad/Missing Source",
    icon: "link-2",
    category: "source",
  },
  {
    id: "source_not_found",
    label: "Source Excerpt NOT on Page",
    icon: "file-minus",
    category: "source",
  },
  {
    id: "broken_link",
    label: "Broken Link",
    icon: "unlink",
    category: "source",
  },

  // Quality Issues
  {
    id: "poor_quality",
    label: "Poor Quality",
    icon: "thumbs-down",
    category: "quality",
  },
  {
    id: "formatting",
    label: "Formatting Issues",
    icon: "type",
    category: "quality",
  },
  {
    id: "insufficient_tags",
    label: "Not Enough Tags",
    icon: "tag",
    category: "quality",
  },
  {
    id: "tf_in_question",
    label: "True/False in Question",
    icon: "help-circle",
    category: "quality",
  },
];

const QuestionActions = ({
  q,
  isLocked = false,
  lockedBy = null,
  onUpdateStatus,
  onDelete,
  appMode,
  showMessage,
}) => {
  const { colorblindMode } = useAccessibility();
  const [rejectMenuOpen, setRejectMenuOpen] = useState(false);
  const rejectMenuRef = useRef(null);
  const [sortedReasons, setSortedReasons] = useState(REJECTION_REASONS);

  // Load and sort reasons based on usage frequency
  useEffect(() => {
    try {
      const counts = JSON.parse(
        localStorage.getItem("ue5_rejection_counts") || "{}"
      );

      // Sort reasons: higher count first
      const sorted = [...REJECTION_REASONS].sort((a, b) => {
        const countA = counts[a.id] || 0;
        const countB = counts[b.id] || 0;
        return countB - countA; // Descending
      });

      setSortedReasons(sorted);
    } catch (err) {
      console.warn("Failed to load rejection counts", err);
    }
  }, [rejectMenuOpen]); // Re-sort every time menu opens

  const handleRejection = (reasonId) => {
    // 1. Update counts in localStorage
    try {
      const counts = JSON.parse(
        localStorage.getItem("ue5_rejection_counts") || "{}"
      );
      counts[reasonId] = (counts[reasonId] || 0) + 1;
      localStorage.setItem("ue5_rejection_counts", JSON.stringify(counts));
    } catch (err) {
      console.warn("Failed to update rejection counts", err);
    }

    // 2. Perform rejection
    onUpdateStatus(q.id, "rejected", reasonId);
    setRejectMenuOpen(false);

    // 3. Find label for toast
    const reason = REJECTION_REASONS.find((r) => r.id === reasonId);
    if (showMessage)
      showMessage(
        `❌ Rejected: ${reason?.label || reasonId}`,
        TOAST_DURATION.LONG
      );
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        rejectMenuRef.current &&
        !rejectMenuRef.current.contains(event.target)
      ) {
        setRejectMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle accept with verification and score check
  // Get accept button styling based on score
  // Get accept button tooltip

  // Determine button styling based on state - colorblind-safe alternatives
  const getButtonClass = () => {
    const baseClass =
      "px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 font-bold text-sm w-full";
    if (isLocked) {
      return `${baseClass} bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed border-2 border-slate-700`;
    }
    if (q.status === "rejected") {
      // Colorblind mode: use rose instead of red
      return colorblindMode
        ? `${baseClass} bg-rose-600 text-white shadow-lg shadow-rose-900/50 ring-2 ring-rose-500`
        : `${baseClass} bg-red-600 text-white shadow-lg shadow-red-900/50 ring-2 ring-red-500`;
    }
    // Colorblind mode: use rose instead of red
    return colorblindMode
      ? `${baseClass} bg-rose-900/40 text-rose-300 hover:bg-rose-800/60 hover:text-rose-200 border-2 border-rose-700/50 hover:border-rose-500`
      : `${baseClass} bg-red-900/40 text-red-300 hover:bg-red-800/60 hover:text-red-200 border-2 border-red-700/50 hover:border-red-500`;
  };

  // Determine title based on state
  const getButtonTitle = () => {
    if (isLocked) {
      return `Locked by ${lockedBy?.userEmail || "another user"}`;
    }
    if (q.status === "rejected" && q.rejectionReason) {
      const reason = REJECTION_REASONS.find((r) => r.id === q.rejectionReason);
      return `Rejected: ${reason?.label || q.rejectionReason}`;
    }
    return "Mark as bad question";
  };

  if (appMode === "database") return null;

  return (
    <div
      className={appMode === "review" ? "w-full" : "flex items-center gap-2"}
    >
      {appMode === "create" ? (
        // CREATE MODE: Only show Delete (Discard) button
        <button
          onClick={() => onDelete(q.id)}
          className="p-2 rounded-lg transition-all bg-slate-800 text-slate-500 hover:bg-red-900/30 hover:text-red-400 border border-slate-700 hover:border-red-900/50"
          title="Discard this question"
          aria-label="Discard question"
        >
          <Icon name="trash-2" size={18} />
        </button>
      ) : (
        // REVIEW MODE: Only show Reject button (Critique/Verify/Accept handled by ReviewProgressBar)
        <>
          {/* REJECT BUTTON - Made more prominent */}
          <div className="relative w-full" ref={rejectMenuRef}>
            <button
              onClick={() => {
                if (isLocked) {
                  if (showMessage)
                    showMessage(
                      `⚠️ Question locked by ${
                        lockedBy?.userEmail || "another user"
                      }`,
                      TOAST_DURATION.LONG
                    );
                  return;
                }
                if (q.status === "rejected") {
                  if (showMessage)
                    showMessage(
                      `Already rejected${
                        q.rejectionReason
                          ? `: ${
                              REJECTION_REASONS.find(
                                (r) => r.id === q.rejectionReason
                              )?.label || q.rejectionReason
                            }`
                          : ""
                      }`
                    );
                } else {
                  setRejectMenuOpen(!rejectMenuOpen);
                }
              }}
              disabled={isLocked}
              className={getButtonClass()}
              title={getButtonTitle()}
              aria-label="Reject question"
              data-tour="review-actions"
            >
              <Icon name="x-circle" size={18} />
              <span>REJECT</span>
              {!q.status && <Icon name="chevron-down" size={14} />}
            </button>

            {rejectMenuOpen && (
              <div
                className={`absolute inset-x-0 mx-auto top-full mt-2 w-72 bg-slate-800 border-2 ${
                  colorblindMode ? "border-rose-700/50" : "border-red-700/50"
                } rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
              >
                <div
                  className={`px-3 py-2 ${
                    colorblindMode
                      ? "bg-rose-900/40 border-b border-rose-700/50"
                      : "bg-red-900/40 border-b border-red-700/50"
                  }`}
                >
                  <span
                    className={`text-sm font-bold ${
                      colorblindMode ? "text-rose-300" : "text-red-300"
                    } flex items-center gap-2`}
                  >
                    <Icon name="alert-octagon" size={16} />
                    Why is this question bad?
                  </span>
                </div>
                <div className="py-1 max-h-72 overflow-y-auto">
                  {sortedReasons.map((reason) => (
                    <button
                      key={reason.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRejection(reason.id);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm text-slate-200 ${
                        colorblindMode
                          ? "hover:bg-rose-900/40"
                          : "hover:bg-red-900/40"
                      } hover:text-white flex items-center gap-3 transition-colors border-l-2 border-transparent ${
                        colorblindMode
                          ? "hover:border-rose-500"
                          : "hover:border-red-500"
                      }`}
                    >
                      <Icon
                        name={reason.icon}
                        size={16}
                        className={
                          colorblindMode ? "text-rose-400" : "text-red-400"
                        }
                      />
                      <span className="flex-1">{reason.label}</span>
                      <span className="text-xs text-slate-500 uppercase">
                        {reason.category}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="px-3 py-2 bg-slate-900/50 border-t border-slate-700">
                  <span className="text-xs text-slate-400">
                    💡 Tip: User actions auto-sort this list!
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default QuestionActions;
