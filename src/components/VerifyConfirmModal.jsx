import React from "react";
import Icon from "./Icon";
import { isEpicLink } from "../utils/urlValidator";

/**
 * VerifyConfirmModal - Appears after user opens docs to confirm verification
 * Shows both Epic Docs and Google Search buttons like the SourceContextCard
 */
const VerifyConfirmModal = ({
  sourceUrl,
  sourceExcerpt,
  onConfirm,
  onDismiss,
}) => {
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
                Check the source and confirm the excerpt is accurate
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {/* Instructions */}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icon
                name="info"
                size={18}
                className="text-blue-400 mt-0.5 flex-shrink-0"
              />
              <div className="text-sm text-slate-200 leading-relaxed">
                <p className="font-medium mb-2">
                  Please verify the following in the source:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>The excerpt text appears on the page</li>
                  <li>The answer to the question is factually correct</li>
                  <li>The information is current and accurate</li>
                </ul>
              </div>
            </div>
          </div>

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

          {/* Verification Buttons - Like SourceContextCard */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="external-link" size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Open Source to Verify
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {/* Epic Documentation Button */}
              <button
                type="button"
                onClick={handleOpenDocs}
                disabled={!hasValidUrl}
                className={`flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg border transition-all ${
                  hasValidUrl
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/30 hover:border-yellow-400"
                    : "bg-red-500/20 text-red-400 border-red-500/40 opacity-50 cursor-not-allowed"
                }`}
                title={
                  hasValidUrl
                    ? `Open: ${cleanUrl}`
                    : "Documentation link is missing"
                }
              >
                <Icon
                  name={hasValidUrl ? "external-link" : "alert-circle"}
                  size={16}
                />
                {hasValidUrl ? "Epic Documentation" : "Docs Link Broken"}
              </button>

              {/* Google Search Button */}
              <button
                type="button"
                onClick={handleOpenSearch}
                disabled={!sourceExcerpt}
                className={`flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg border transition-all ${
                  sourceExcerpt
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30 hover:border-blue-400"
                    : "bg-slate-700/50 text-slate-500 border-slate-600 opacity-50 cursor-not-allowed"
                }`}
                title="Search the excerpt on Google"
              >
                <Icon name="search" size={16} />
                Search Excerpt
              </button>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="border-t border-slate-700 bg-slate-900/90 px-5 py-4 flex items-center justify-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="px-5 py-2.5 rounded-lg font-bold text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600 transition-all pointer-events-auto cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            className="px-5 py-2.5 rounded-lg font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/50 transition-all pointer-events-auto cursor-pointer flex items-center gap-2"
          >
            <Icon name="check-circle" size={18} />
            Confirm Verified
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyConfirmModal;
