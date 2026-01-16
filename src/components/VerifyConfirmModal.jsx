import React from "react";
import Icon from "./Icon";

/**
 * VerifyConfirmModal - Appears after user opens docs to confirm verification
 * Similar UX pattern to the ImprovementModal but simpler for verification
 */
const VerifyConfirmModal = ({
  sourceUrl,
  sourceExcerpt,
  onConfirm,
  onDismiss,
  verifyingMethod = "docs", // "docs" or "search"
}) => {
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
                {verifyingMethod === "docs"
                  ? "Epic Documentation opened in new tab"
                  : "Google Search opened in new tab"}
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

          {/* Source URL */}
          {sourceUrl && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="link" size={14} className="text-yellow-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Source URL
                </span>
              </div>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-yellow-400 hover:text-yellow-300 underline break-all"
              >
                {sourceUrl}
              </a>
            </div>
          )}

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
