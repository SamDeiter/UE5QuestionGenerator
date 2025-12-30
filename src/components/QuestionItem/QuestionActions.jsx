import { useState, useRef, useEffect } from "react";
import Icon from "../Icon";

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

  // Source Issues
  {
    id: "bad_source",
    label: "Bad/Missing Source",
    icon: "link-2",
    category: "source",
  },
  {
    id: "broken_link",
    label: "Broken Link",
    icon: "link-off",
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
];

const QuestionActions = ({
  q,
  isLocked = false,
  lockedBy = null,
  onUpdateStatus,
  _onCritique,
  _onExplain,
  _onVariate,
  onDelete,
  onUpdateQuestion,
  _isProcessing,
  appMode,
  showMessage,
}) => {
  const [rejectMenuOpen, setRejectMenuOpen] = useState(false);
  const rejectMenuRef = useRef(null);

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

  // Handle human verification
  const _handleVerify = () => {
    const reviewerName = localStorage.getItem("ue5_gen_config")
      ? JSON.parse(localStorage.getItem("ue5_gen_config")).creatorName ||
        "Unknown"
      : "Unknown";

    onUpdateQuestion(q.id, {
      ...q,
      humanVerified: true,
      humanVerifiedAt: new Date().toISOString(),
      humanVerifiedBy: reviewerName,
    });
    if (showMessage)
      showMessage("✓ Question verified! You can now accept it.", 3000);
  };

  // Handle accept with verification and score check
    // Get accept button styling based on score
    // Get accept button tooltip
    if (appMode === "database") return null;

  return (
    <div className="flex items-center gap-2">
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
          <div className="relative" ref={rejectMenuRef}>
            <button
              onClick={() => {
                if (isLocked) {
                  if (showMessage)
                    showMessage(
                      `⚠️ Question locked by ${
                        lockedBy?.userEmail || "another user"
                      }`,
                      3000
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
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold text-sm ${
                isLocked
                  ? "bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed border-2 border-slate-700"
                  : q.status === "rejected"
                  ? "bg-red-600 text-white shadow-lg shadow-red-900/50 ring-2 ring-red-500"
                  : "bg-red-900/40 text-red-300 hover:bg-red-800/60 hover:text-red-200 border-2 border-red-700/50 hover:border-red-500"
              }`}
              title={
                isLocked
                  ? `Locked by ${lockedBy?.userEmail || "another user"}`
                  : q.status === "rejected" && q.rejectionReason
                  ? `Rejected: ${
                      REJECTION_REASONS.find((r) => r.id === q.rejectionReason)
                        ?.label || q.rejectionReason
                    }`
                  : "Mark as bad question"
              }
              aria-label="Reject question"
              data-tour="review-actions"
            >
              <Icon name="x-circle" size={18} />
              <span>REJECT</span>
              {!q.status && <Icon name="chevron-down" size={14} />}
            </button>

            {rejectMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border-2 border-red-700/50 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 -translate-x-0 md:-translate-x-48">
                <div className="px-3 py-2 bg-red-900/40 border-b border-red-700/50">
                  <span className="text-sm font-bold text-red-300 flex items-center gap-2">
                    <Icon name="alert-octagon" size={16} />
                    Why is this question bad?
                  </span>
                </div>
                <div className="py-1 max-h-72 overflow-y-auto">
                  {REJECTION_REASONS.map((reason) => (
                    <button
                      key={reason.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Note: rejectionCategory and qualityIssues are now tracked via normalizeQuestion
                        onUpdateStatus(q.id, "rejected", reason.id);
                        setRejectMenuOpen(false);
                        if (showMessage)
                          showMessage(`❌ Rejected: ${reason.label}`, 3000);
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm text-slate-200 hover:bg-red-900/40 hover:text-white flex items-center gap-3 transition-colors border-l-2 border-transparent hover:border-red-500"
                    >
                      <Icon
                        name={reason.icon}
                        size={16}
                        className="text-red-400"
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
                    💡 Tip: Use Internal Notes below for detailed feedback. Keep
                    it brief!
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
