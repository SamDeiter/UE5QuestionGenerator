import React, { useState, useEffect, useRef } from "react";
import { logger } from "../../utils/logger";
import { useMessage } from "../../contexts/MessageContext";

const QuestionNotesField = ({ question, onUpdateQuestion }) => {
  const { showMessage } = useMessage();
  const [notes, setNotes] = useState(question.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Check for unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(notes !== (question.notes || ""));
  }, [notes, question.notes]);

  // Auto-save after 2 seconds of no typing
  useEffect(() => {
    if (hasUnsavedChanges) {
      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Set new timeout
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 2000);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, hasUnsavedChanges]);

  // Sync notes when question changes (e.g., navigation)
  useEffect(() => {
    setNotes(question.notes || "");
  }, [question.id, question.notes]);

  const handleSave = async () => {
    if (notes === (question.notes || "")) {
      return; // No changes
    }

    setIsSaving(true);
    try {
      await onUpdateQuestion(question.id, { notes });
      setHasUnsavedChanges(false);
      if (showMessage) {
        showMessage("✓ Notes saved", 2000);
      }
    } catch (error) {
      logger.error("Failed to save notes:", error);
      if (showMessage) {
        showMessage("⚠️ Failed to save notes", 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlur = () => {
    if (hasUnsavedChanges) {
      handleSave();
    }
  };

  return (
    <div className="mt-3 border-t border-slate-700 pt-3">
      <label className="block text-xs font-semibold text-slate-400 mb-1">
        Internal Notes
        {hasUnsavedChanges && (
          <span className="ml-2 text-amber-400 text-xs">• Unsaved changes</span>
        )}
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        placeholder="Add notes about this question (internal use only)..."
        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-y min-h-[60px]"
        disabled={isSaving}
        maxLength={500}
      />
      <div className="flex justify-between items-center mt-1">
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-slate-500">Saving...</span>
          )}
          {hasUnsavedChanges && !isSaving && (
            <button
              onClick={handleSave}
              className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors"
            >
              Save Notes
            </button>
          )}
        </div>
        {/* Character count */}
        {(() => {
          let colorClass = "text-slate-500";
          if (notes.length >= 500) {
            colorClass = "text-red-400";
          } else if (notes.length >= 450) {
            colorClass = "text-orange-400";
          }
          return (
            <span className={`text-xs ${colorClass}`}>
              {notes.length} / 500 characters
            </span>
          );
        })()}
      </div>
    </div>
  );
};

export default QuestionNotesField;
