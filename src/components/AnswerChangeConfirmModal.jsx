import { useState } from "react";
import Icon from "./Icon";

/**
 * AnswerChangeConfirmModal - Confirms answer changes with doc link validation
 * Implements Phase 3: Answer Change Safety
 *
 * Three paths:
 * 1. Answer confirmed correct, doc link is valid → Proceed
 * 2. Answer confirmed correct, doc link needs update → Allow with note
 * 3. Unsure if answer is correct → Flag for research
 */
const AnswerChangeConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  fromAnswer,
  fromText,
  toAnswer,
  toText,
  questionText,
  sourceUrl,
}) => {
  const [selectedPath, setSelectedPath] = useState(null);
  const [note, setNote] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedPath) return;

    onConfirm({
      path: selectedPath,
      note: note.trim(),
      timestamp: new Date().toISOString(),
    });

    // Reset state
    setSelectedPath(null);
    setNote("");
  };

  const handleClose = () => {
    setSelectedPath(null);
    setNote("");
    onClose();
  };

  const paths = [
    {
      id: "valid",
      icon: "check-circle",
      color: "green",
      title: "Answer & Doc Link Verified",
      description:
        "I've verified the new answer is correct and the documentation supports it.",
    },
    {
      id: "update_doc",
      icon: "link",
      color: "amber",
      title: "Answer Correct, Doc Needs Update",
      description:
        "The new answer is correct, but the doc link should be updated to better support it.",
      requiresNote: true,
    },
    {
      id: "research",
      icon: "help-circle",
      color: "purple",
      title: "Needs Further Research",
      description:
        "I'm not 100% certain — mark this question for additional verification.",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-amber-700/50 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-amber-700/30 bg-amber-950/20">
          <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
            <Icon name="alert-triangle" className="text-amber-500" />
            Confirm Answer Change
          </h2>
        </div>

        <div className="p-5 space-y-4">
          {/* Question Context */}
          <div className="text-sm text-slate-400 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="line-clamp-2 italic">
              "{questionText?.substring(0, 100)}..."
            </div>
          </div>

          {/* Change Summary */}
          <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <div className="flex-1">
              <div className="text-xs uppercase text-slate-500 mb-1">From</div>
              <div className="text-red-400 font-medium">
                <span className="font-bold">{fromAnswer})</span>{" "}
                {fromText?.substring(0, 40)}...
              </div>
            </div>
            <Icon name="arrow-right" className="text-slate-600" />
            <div className="flex-1">
              <div className="text-xs uppercase text-slate-500 mb-1">To</div>
              <div className="text-green-400 font-medium">
                <span className="font-bold">{toAnswer})</span>{" "}
                {toText?.substring(0, 40)}...
              </div>
            </div>
          </div>

          {/* Doc Link Reference */}
          {sourceUrl && (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Icon name="external-link" size={12} />
              <span className="truncate">{sourceUrl}</span>
            </div>
          )}

          {/* Path Selection */}
          <div className="space-y-2">
            <div className="text-xs uppercase text-slate-500 font-bold">
              Select Verification Path
            </div>
            {paths.map((path) => {
              const isSelected = selectedPath === path.id;
              const buttonClass = isSelected
                ? `w-full p-3 rounded-lg border text-left transition-all bg-${path.color}-950/40 border-${path.color}-500/50 ring-1 ring-${path.color}-500/30`
                : "w-full p-3 rounded-lg border text-left transition-all bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600";
              const iconClass = isSelected
                ? `mt-0.5 text-${path.color}-400`
                : "mt-0.5 text-slate-500";
              const titleClass = isSelected
                ? `font-medium text-${path.color}-300`
                : "font-medium text-slate-300";

              return (
                <button
                  key={path.id}
                  onClick={() => setSelectedPath(path.id)}
                  className={buttonClass}
                >
                  <div className="flex items-start gap-3">
                    <Icon name={path.icon} size={18} className={iconClass} />
                    <div>
                      <div className={titleClass}>{path.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {path.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Note Field (for update_doc path) */}
          {selectedPath === "update_doc" && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="block text-xs uppercase text-amber-400 font-bold mb-2">
                What should the doc link point to?
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe the correct documentation source..."
                className="w-full px-3 py-2 bg-slate-800 border border-amber-700/50 rounded-lg text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                rows={2}
                autoFocus
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                !selectedPath || (selectedPath === "update_doc" && !note.trim())
              }
              className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
            >
              Confirm Change
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnswerChangeConfirmModal;
