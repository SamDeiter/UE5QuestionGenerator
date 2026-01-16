import React, { useState } from "react";
import Icon from "./Icon";
import { isEpicLink } from "../utils/urlValidator";

/**
 * VerifyConfirmModal - "Traffic Light" verification with three outcomes:
 * 1. Found in Epic Docs (green) - verifies with source="epic_docs"
 * 2. Found in Google Search (blue) - verifies with source="google_search"
 * 3. Cannot Verify (red) - opens rejection reason menu
 */

const REJECTION_REASONS = [
  { id: "excerpt_not_in_docs", label: "Excerpt not on Epic Docs page" },
  { id: "excerpt_not_in_search", label: "Excerpt not found in search results" },
  { id: "source_url_broken", label: "Source URL is broken/invalid" },
  { id: "info_outdated", label: "Information appears outdated" },
  { id: "ai_hallucination", label: "AI Hallucination suspected" },
  { id: "other", label: "Other reason" },
];

const VerifyConfirmModal = ({
  sourceUrl,
  sourceExcerpt,
  onVerifyDocs,
  onVerifySearch,
  onReject,
  onDismiss,
}) => {
  const [showRejectMenu, setShowRejectMenu] = useState(false);
  const hasValidUrl = isEpicLink(sourceUrl);
  const cleanUrl = sourceUrl?.trim() || "";

  const handleOpenDocs = () => {
    if (hasValidUrl) {
      window.open(cleanUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenSearch = () => {
    if (sourceExcerpt) {
      navigator.clipboard.writeText(sourceExcerpt).catch(() => {});
      const query = encodeURIComponent(sourceExcerpt);
      window.open(
        `https://www.google.com/search?q=${query}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  const handleReject = (reasonId) => {
    onReject(reasonId);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[10000] flex items-start justify-center pt-8 p-4 overflow-y-auto pointer-events-auto cursor-pointer"
      onClick={onDismiss}
    >
      <div
        className="bg-slate-900 rounded-xl border-2 border-emerald-500/50 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col pointer-events-auto relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border-b border-emerald-600/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600/30 flex items-center justify-center">
              <Icon name="eye" size={22} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Verify Source Content
              </h2>
              <p className="text-xs text-emerald-400/80">
                Check the source and confirm where the excerpt was found
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {/* Source Excerpt */}
          {sourceExcerpt && (
            <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="file-text" size={14} className="text-orange-400" />
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wide">
                  Excerpt to Verify
                </span>
              </div>
              <p className="text-sm text-slate-200 italic leading-relaxed border-l-2 border-orange-500/50 pl-3">
                &ldquo;{sourceExcerpt}&rdquo;
              </p>
            </div>
          )}

          {/* Open Source Buttons */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="external-link" size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Open Source to Check
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleOpenDocs}
                disabled={!hasValidUrl}
                className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-all ${
                  hasValidUrl
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/40 opacity-50 cursor-not-allowed"
                }`}
              >
                <Icon
                  name={hasValidUrl ? "external-link" : "alert-circle"}
                  size={16}
                />
                {hasValidUrl ? "Epic Documentation" : "Docs Link Broken"}
              </button>
              <button
                type="button"
                onClick={handleOpenSearch}
                disabled={!sourceExcerpt}
                className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-all bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30"
              >
                <Icon name="search" size={16} />
                Search Excerpt
              </button>
            </div>
          </div>

          {/* Verification Outcome Section */}
          {!showRejectMenu ? (
            <div className="bg-slate-800/30 border border-slate-600/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon
                  name="check-circle"
                  size={14}
                  className="text-slate-400"
                />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Where did you find the excerpt?
                </span>
              </div>
              <div className="space-y-2">
                {/* Found in Docs - Green */}
                <button
                  type="button"
                  onClick={() => onVerifyDocs()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-lg border transition-all bg-green-600/20 text-green-400 border-green-500/40 hover:bg-green-600/40 hover:border-green-400"
                >
                  <Icon name="check-circle" size={18} />✓ Found in Epic Docs
                </button>

                {/* Found in Search - Blue */}
                <button
                  type="button"
                  onClick={() => onVerifySearch()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-lg border transition-all bg-blue-600/20 text-blue-400 border-blue-500/40 hover:bg-blue-600/40 hover:border-blue-400"
                >
                  <Icon name="search" size={18} />
                  🔍 Found in Google Search
                </button>

                {/* Cannot Verify - Red */}
                <button
                  type="button"
                  onClick={() => setShowRejectMenu(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-lg border transition-all bg-red-600/20 text-red-400 border-red-500/40 hover:bg-red-600/40 hover:border-red-400"
                >
                  <Icon name="x-circle" size={18} />✗ Cannot Verify - Source Not
                  Found
                </button>
              </div>
            </div>
          ) : (
            /* Rejection Reason Menu */
            <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon
                    name="alert-triangle"
                    size={14}
                    className="text-red-400"
                  />
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wide">
                    Select Rejection Reason
                  </span>
                </div>
                <button
                  onClick={() => setShowRejectMenu(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ← Back
                </button>
              </div>
              <div className="space-y-2">
                {REJECTION_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => handleReject(reason.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg border transition-all bg-red-900/30 text-red-300 border-red-700/50 hover:bg-red-800/50 hover:border-red-500 text-left"
                  >
                    <Icon name="x" size={14} className="flex-shrink-0" />
                    {reason.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Cancel only */}
        <div className="border-t border-slate-700 bg-slate-900/90 px-5 py-3 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="px-5 py-2 rounded-lg font-bold text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyConfirmModal;
