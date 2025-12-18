import React, { useState } from "react";

const QuestionNotesField = ({ question, onUpdateQuestion, showMessage }) => {
  const [notes, setNotes] = useState(question.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (notes === (question.notes || "")) {
      // No changes
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateQuestion(question.id, { notes });
      if (showMessage) {
        showMessage("✓ Notes saved", 2000);
      }
    } catch (error) {
      console.error("Failed to save notes:", error);
      if (showMessage) {
        showMessage("⚠️ Failed to save notes", 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlur = () => {
    if (notes !== (question.notes || "")) {
      handleSave();
    }
  };

  return (
    <div className="mt-3 border-t border-slate-700 pt-3">
      <label className="block text-xs font-semibold text-slate-400 mb-1">
        Internal Notes
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        placeholder="Add notes about this question (internal use only)..."
        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-y min-h-[60px]"
        disabled={isSaving}
      />
      {isSaving && <p className="text-xs text-slate-500 mt-1">Saving...</p>}
    </div>
  );
};

export default QuestionNotesField;
