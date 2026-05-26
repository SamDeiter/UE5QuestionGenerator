import React, { useState } from "react";
import DOMPurify from "dompurify";
import Icon from "../Icon";
import FlagIcon from "../FlagIcon";
import { formatDate } from "../../utils/reviewerAnalytics";
import { isEpicLink } from "../../utils/urlValidator";
import { LANGUAGE_CODES } from "../../utils/constants";
import DocLinkEditor from "./DocLinkEditor";

const SourceContextActions = ({
  sourceUrl,
  isVerified,
  verifiedBy,
  verifiedAt,
  onVerifyDocs,
  onVerifySearch,
  onConfirmVerify,
  canVerify,
}) => {
  const [hasOpenedDocs, setHasOpenedDocs] = useState(false);
  const hasValidUrl = isEpicLink(sourceUrl);
  const isVerifyDisabled = !canVerify && !isVerified;
  const cleanUrl = sourceUrl?.trim() || "";

  const getDocsButtonStyles = () => {
    if (isVerifyDisabled) {
      return "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60";
    }
    if (hasValidUrl) {
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/30";
    }
    return "bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30 opacity-50";
  };

  const getSearchButtonStyles = () => {
    if (isVerifyDisabled) {
      return "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60";
    }
    return "bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30";
  };

  const handleOpenDocs = (e) => {
    e.preventDefault();
    setHasOpenedDocs(true);
    onVerifyDocs?.();
  };

  const handleOpenSearch = (e) => {
    e.preventDefault();
    setHasOpenedDocs(true);
    onVerifySearch?.();
  };

  const handleConfirmVerify = (e) => {
    e.preventDefault();
    onConfirmVerify?.();
  };

  return (
    <div className="flex flex-col gap-3">
      {isVerified && verifiedBy && (
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium animate-in fade-in slide-in-from-left-1 duration-300">
          <Icon name="check-circle" size={14} />
          Verified by {verifiedBy} on {formatDate(verifiedAt)}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* BUTTON 1: OFFICIAL DOCS */}
        <button
          type="button"
          disabled={isVerifyDisabled}
          onClick={handleOpenDocs}
          data-tour="verify-button"
          className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md border transition-all ${getDocsButtonStyles()}`}
          title={
            hasValidUrl
              ? `Open Docs: ${cleanUrl}`
              : "Documentation link is missing or generic"
          }
        >
          <Icon
            name={hasValidUrl ? "external-link" : "alert-circle"}
            size={14}
          />
          {hasValidUrl ? "Epic Documentation" : "Docs Link Broken"}
        </button>

        {/* BUTTON 2: GOOGLE SEARCH */}
        <button
          type="button"
          disabled={isVerifyDisabled}
          onClick={handleOpenSearch}
          className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md border transition-all ${getSearchButtonStyles()}`}
          title="Search the excerpt text on Google"
        >
          <Icon name="search" size={14} />
          Search Excerpt
        </button>
      </div>

      {/* BUTTON 3: CONFIRM VERIFIED - Shows after opening docs, even if score is low */}
      {hasOpenedDocs && !isVerified && (
        <button
          type="button"
          onClick={handleConfirmVerify}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-md border transition-all bg-emerald-600/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/40 hover:border-emerald-400 animate-in fade-in slide-in-from-bottom-2 duration-300"
          title="Confirm that you have verified the source content"
        >
          <Icon name="check-circle" size={16} />
          Confirm Verified
        </button>
      )}
    </div>
  );
};

const SourceContextCard = ({
  sourceUrl,
  sourceExcerpt,
  isVerified,
  verifiedBy,
  verifiedAt,
  onVerifyDocs,
  onVerifySearch,
  onConfirmVerify,
  canVerify = true,
  // Doc link management props (Phase 1)
  docLinkSource = "system",
  docLinkModifiedBy = null,
  docLinkModificationNote = null,
  originalSourceUrl = null,
  originalSourceExcerpt = null,
  onDocLinkUpdate = null,
  canEdit = true,
  // Translation-tab props: when present, the source-content section becomes a
  // toggle between English (the verifiable reference matching the docs URL) and
  // the translation. Verification controls are hidden because English-source
  // verification is the English reviewer's job, not the bilingual reviewer's.
  currentLanguage = "English",
  translatedExcerpt = null,
  translatedExcerptEditedBy = null,
  translatedExcerptEditedAt = null,
  onUpdateTranslatedExcerpt = null,
}) => {
  const isTranslationTab = !!currentLanguage && currentLanguage !== "English";
  const flagCode = LANGUAGE_CODES[currentLanguage] || null;

  const [excerptView, setExcerptView] = useState("english");
  const [isEditingExcerpt, setIsEditingExcerpt] = useState(false);
  const [editedExcerptText, setEditedExcerptText] = useState("");

  const hasValidUrl = isEpicLink(sourceUrl);

  if (!sourceExcerpt && !translatedExcerpt && !hasValidUrl) {
    return null;
  }

  const isModified = docLinkSource === "user_modified";

  const displayedExcerpt =
    isTranslationTab && excerptView === "translated"
      ? translatedExcerpt
      : sourceExcerpt;
  const viewingTranslated = isTranslationTab && excerptView === "translated";
  const canEditTranslatedExcerpt =
    viewingTranslated && canEdit && !!onUpdateTranslatedExcerpt;

  const handleSaveEditedExcerpt = () => {
    onUpdateTranslatedExcerpt?.(editedExcerptText);
    setIsEditingExcerpt(false);
  };

  const handleCancelEdit = () => {
    setIsEditingExcerpt(false);
    setEditedExcerptText("");
  };

  return (
    <div className="bg-slate-950/50 border border-blue-700/30 rounded-lg p-4 mb-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Icon name="book-open" className="text-blue-400" size={16} />
          <span className="text-blue-300 font-bold text-sm">
            Source Context
          </span>
          {/* Show modified badge next to title */}
          {isModified && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-900/40 text-purple-300 border border-purple-700/40"
              title={`Modified: ${docLinkModificationNote || "No note"}`}
            >
              <Icon name="edit-2" size={10} />
              Edited
            </span>
          )}
          {/* Translation-tab toggle: switch between English (matches docs URL)
              and the translation. */}
          {isTranslationTab && translatedExcerpt && (
            <div className="ml-1 inline-flex items-center gap-1 rounded border border-slate-700/60 bg-slate-900/60 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setExcerptView("english");
                  setIsEditingExcerpt(false);
                }}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors ${
                  excerptView === "english"
                    ? "bg-blue-500/20 text-blue-200"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Show English excerpt (matches the documentation URL)"
              >
                <FlagIcon code="US" size={12} />
                EN
              </button>
              <button
                type="button"
                onClick={() => setExcerptView("translated")}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors ${
                  excerptView === "translated"
                    ? "bg-blue-500/20 text-blue-200"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title={`Show ${currentLanguage} translation of the excerpt`}
              >
                {flagCode && <FlagIcon code={flagCode} size={12} />}
                {flagCode || "Translation"}
              </button>
            </div>
          )}
        </div>
        {/* "Needs verification" warning suppressed on translation tabs:
            English-source verification is the English reviewer's job. */}
        {!isTranslationTab && !isVerified && sourceExcerpt && (
          <span
            className="text-amber-400 text-xs flex items-center gap-1"
            title="Verify this excerpt exists on the source page"
          >
            <Icon name="alert-triangle" size={12} />
            Needs verification
          </span>
        )}
      </div>

      {displayedExcerpt && (
        <div className="mb-3">
          {isEditingExcerpt ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editedExcerptText}
                onChange={(e) => setEditedExcerptText(e.target.value)}
                className="w-full bg-slate-800 border border-indigo-500 rounded p-2 text-slate-200 text-sm italic resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditedExcerpt}
                  className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold"
                >
                  Save translation
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <p
                className="text-slate-400 text-sm italic leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: `"${DOMPurify.sanitize(displayedExcerpt, {
                    ALLOWED_TAGS: [],
                  })}"`,
                }}
              />
              {canEditTranslatedExcerpt && (
                <button
                  type="button"
                  onClick={() => {
                    setEditedExcerptText(translatedExcerpt || "");
                    setIsEditingExcerpt(true);
                  }}
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-800/80 text-slate-500 hover:text-indigo-300"
                  title="Edit translated excerpt"
                  aria-label="Edit translated excerpt"
                >
                  <Icon name="edit-2" size={12} />
                </button>
              )}
            </div>
          )}

          {/* Status line: English variant shows verification state; translation
              tabs show either the bilingual editor attribution or a hint. */}
          {!isTranslationTab && !isVerified && (
            <p className="text-slate-600 text-xs mt-1">
              ⚠️ AI-generated excerpt — click verification buttons below to
              confirm this text appears on the page
            </p>
          )}
          {!isTranslationTab && isVerified && (
            <p className="text-emerald-500/70 text-xs mt-1 flex items-center gap-1">
              <Icon name="check" size={12} /> Source content verified by
              reviewer
            </p>
          )}
          {viewingTranslated && translatedExcerptEditedBy && (
            <p className="text-indigo-400/70 text-xs mt-1 flex items-center gap-1">
              <Icon name="edit-2" size={12} />
              Translated excerpt edited by {translatedExcerptEditedBy}
              {translatedExcerptEditedAt
                ? ` on ${formatDate(translatedExcerptEditedAt)}`
                : ""}
            </p>
          )}
          {isTranslationTab && !viewingTranslated && isVerified && (
            <p className="text-emerald-500/70 text-xs mt-1 flex items-center gap-1">
              <Icon name="check" size={12} /> Source content verified by{" "}
              {verifiedBy || "the English reviewer"}
            </p>
          )}
        </div>
      )}

      {/* Verification actions: English source verification is the English
          reviewer's job. Hide on translation tabs. */}
      {!isTranslationTab && (
        <div className="flex gap-2 flex-wrap">
          <SourceContextActions
            sourceUrl={sourceUrl}
            isVerified={isVerified}
            verifiedBy={verifiedBy}
            verifiedAt={verifiedAt}
            onVerifyDocs={onVerifyDocs}
            onVerifySearch={onVerifySearch}
            onConfirmVerify={onConfirmVerify}
            canVerify={canVerify}
          />
        </div>
      )}

      {/* Doc Link Editor - Phase 1 feature. Hidden on translation tabs (the
          source URL belongs to the English source, not the translation). */}
      {!isTranslationTab && onDocLinkUpdate && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <DocLinkEditor
            sourceUrl={sourceUrl}
            sourceExcerpt={sourceExcerpt}
            docLinkSource={docLinkSource}
            docLinkModifiedBy={docLinkModifiedBy}
            docLinkModificationNote={docLinkModificationNote}
            originalSourceUrl={originalSourceUrl}
            originalSourceExcerpt={originalSourceExcerpt}
            onUpdate={onDocLinkUpdate}
            disabled={!canEdit}
          />
        </div>
      )}
    </div>
  );
};

export default SourceContextCard;
