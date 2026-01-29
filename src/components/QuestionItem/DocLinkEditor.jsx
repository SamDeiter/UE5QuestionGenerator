import React, { useState, useEffect } from "react";
import Icon from "../Icon";
import { isEpicLink } from "../../utils/urlValidator";
import { TOAST_DURATION } from "../../utils/constants";

/**
 * DocLinkEditor - Inline editor for source URL and excerpt
 *
 * Allows reviewers to:
 * - Edit or replace documentation links
 * - Add justification notes for changes
 * - Track whether link is system (AI-generated) or user-modified
 *
 * Core principle: If the answer is correct but the doc is wrong, fix the doc.
 */
const DocLinkEditor = ({
  sourceUrl,
  sourceExcerpt,
  docLinkSource = "system",
  docLinkModifiedBy = null,
  docLinkModificationNote = null,
  originalSourceUrl = null,
  originalSourceExcerpt = null,
  onUpdate,
  showMessage,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUrl, setEditedUrl] = useState(sourceUrl || "");
  const [editedExcerpt, setEditedExcerpt] = useState(sourceExcerpt || "");
  const [justification, setJustification] = useState("");

  // Sync local state when props change
  useEffect(() => {
    setEditedUrl(sourceUrl || "");
    setEditedExcerpt(sourceExcerpt || "");
  }, [sourceUrl, sourceExcerpt]);

  const isModified = docLinkSource === "user_modified";
  const hasValidUrl = isEpicLink(editedUrl);
  const hasChanges = editedUrl !== sourceUrl || editedExcerpt !== sourceExcerpt;

  const handleSave = () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    // Require justification for changes
    if (!justification.trim()) {
      showMessage?.(
        "⚠️ Please add a justification for this change",
        TOAST_DURATION.LONG
      );
      return;
    }

    // Build update payload
    const updates = {
      sourceUrl: editedUrl.trim(),
      sourceExcerpt: editedExcerpt.trim(),
      docLinkSource: "user_modified",
      docLinkModificationNote: justification.trim(),
      docLinkModifiedAt: new Date().toISOString(),
      // Preserve originals if this is the first edit
      originalSourceUrl: originalSourceUrl || sourceUrl,
      originalSourceExcerpt: originalSourceExcerpt || sourceExcerpt,
    };

    onUpdate?.(updates);
    setIsEditing(false);
    setJustification("");
    showMessage?.("✅ Doc link updated!", TOAST_DURATION.MEDIUM);
  };

  const handleRevert = () => {
    if (!originalSourceUrl && !originalSourceExcerpt) {
      showMessage?.("No original to revert to", TOAST_DURATION.MEDIUM);
      return;
    }

    const updates = {
      sourceUrl: originalSourceUrl || sourceUrl,
      sourceExcerpt: originalSourceExcerpt || sourceExcerpt,
      docLinkSource: "system",
      docLinkModificationNote: null,
      docLinkModifiedBy: null,
      docLinkModifiedAt: null,
      // Keep originals for audit trail
    };

    onUpdate?.(updates);
    setEditedUrl(originalSourceUrl || sourceUrl);
    setEditedExcerpt(originalSourceExcerpt || sourceExcerpt);
    showMessage?.("↩️ Reverted to original doc link", TOAST_DURATION.MEDIUM);
  };

  const handleCancel = () => {
    setEditedUrl(sourceUrl || "");
    setEditedExcerpt(sourceExcerpt || "");
    setJustification("");
    setIsEditing(false);
  };

  // Compact display mode
  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        {/* Modified badge */}
        {isModified && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-purple-900/30 text-purple-300 border border-purple-700/40"
            title={`Modified by ${docLinkModifiedBy || "reviewer"}: ${docLinkModificationNote || "No note"}`}
          >
            <Icon name="edit-2" size={10} />
            Edited
          </span>
        )}

        {/* Edit button */}
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          disabled={disabled}
          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded border transition-all ${
            disabled
              ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
              : "bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white"
          }`}
          title="Edit documentation link"
        >
          <Icon name="edit-3" size={12} />
          Edit Link
        </button>

        {/* Revert button (only if modified) */}
        {isModified && originalSourceUrl && (
          <button
            type="button"
            onClick={handleRevert}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-slate-800 text-amber-400 border border-amber-700/40 hover:bg-amber-900/30 transition-all"
            title="Revert to original AI-generated link"
          >
            <Icon name="rotate-ccw" size={12} />
            Revert
          </button>
        )}
      </div>
    );
  }

  // Expanded edit mode
  return (
    <div className="bg-slate-900/70 border border-blue-700/50 rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 mb-2">
        <Icon name="link" size={16} className="text-blue-400" />
        <span className="text-sm font-bold text-blue-300">
          Edit Documentation Link
        </span>
      </div>

      {/* URL Input */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Source URL
        </label>
        <input
          type="url"
          value={editedUrl}
          onChange={(e) => setEditedUrl(e.target.value)}
          placeholder="https://dev.epicgames.com/documentation/..."
          className={`w-full px-3 py-2 rounded-lg bg-slate-800 border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
            hasValidUrl
              ? "border-green-600/50 focus:ring-green-500/50"
              : "border-red-600/50 focus:ring-red-500/50"
          }`}
        />
        {!hasValidUrl && editedUrl && (
          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
            <Icon name="alert-circle" size={12} />
            URL should be an Epic Games documentation link
          </p>
        )}
      </div>

      {/* Excerpt Input */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Source Excerpt
        </label>
        <textarea
          value={editedExcerpt}
          onChange={(e) => setEditedExcerpt(e.target.value)}
          placeholder="The relevant quote from the documentation..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
        />
      </div>

      {/* Justification (required for changes) */}
      {hasChanges && (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-200">
          <label className="block text-xs font-medium text-amber-400 mb-1">
            Justification (required) *
          </label>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Why are you changing this link? e.g., 'Original link was too broad, found more specific page'"
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/50 text-sm text-white placeholder-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
        <button
          type="button"
          onClick={handleSave}
          disabled={hasChanges && !justification.trim()}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold rounded-lg border transition-all ${
            hasChanges && justification.trim()
              ? "bg-green-600/20 text-green-400 border-green-500/40 hover:bg-green-600/40"
              : "bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed"
          }`}
        >
          <Icon name="check" size={14} />
          {hasChanges ? "Save Changes" : "Done"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-3 py-2 text-sm font-medium rounded-lg bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700 transition-all"
        >
          Cancel
        </button>
      </div>

      {/* Show original if this was already modified */}
      {originalSourceUrl && originalSourceUrl !== sourceUrl && (
        <div className="text-xs text-slate-500 bg-slate-800/50 rounded p-2">
          <span className="font-medium">Original URL:</span>{" "}
          <span className="text-slate-400 break-all">{originalSourceUrl}</span>
        </div>
      )}
    </div>
  );
};

export default DocLinkEditor;
