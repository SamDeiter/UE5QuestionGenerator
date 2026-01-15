import React from "react";
import DOMPurify from "dompurify";
import Icon from "../Icon";
import { formatDate } from "../../utils/reviewerAnalytics";
import { isEpicLink } from "../../utils/urlValidator";

const SourceContextActions = ({
  sourceUrl,
  isVerified,
  verifiedBy,
  verifiedAt,
  onVerifyDocs,
  onVerifySearch,
  canVerify,
}) => {
  const hasValidUrl = isEpicLink(sourceUrl);
  const isVerifyDisabled = !canVerify && !isVerified;
  const cleanUrl = sourceUrl?.trim() || "";

  const getDocsButtonStyles = () => {
    if (isVerifyDisabled)
      return "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60";
    if (hasValidUrl)
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30 opacity-50";
  };

  const getSearchButtonStyles = () => {
    if (isVerifyDisabled)
      return "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60";
    return "bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30";
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
          onClick={(e) => {
            e.preventDefault();
            onVerifyDocs?.();
          }}
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
          onClick={(e) => {
            e.preventDefault();
            onVerifySearch?.();
          }}
          className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md border transition-all ${getSearchButtonStyles()}`}
          title="Search the excerpt text on Google"
        >
          <Icon name="search" size={14} />
          Search Excerpt
        </button>
      </div>
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
  canVerify = true,
}) => {
  const hasValidUrl = isEpicLink(sourceUrl);

  if (!sourceExcerpt && !hasValidUrl) {
    return null;
  }

  return (
    <div className="bg-slate-950/50 border border-blue-700/30 rounded-lg p-4 mb-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Icon name="book-open" className="text-blue-400" size={16} />
          <span className="text-blue-300 font-bold text-sm">
            Source Context
          </span>
        </div>
        {!isVerified && sourceExcerpt && (
          <span
            className="text-amber-400 text-xs flex items-center gap-1"
            title="Verify this excerpt exists on the source page"
          >
            <Icon name="alert-triangle" size={12} />
            Needs verification
          </span>
        )}
      </div>

      {sourceExcerpt && (
        <div className="mb-3">
          <p
            className="text-slate-400 text-sm italic leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: `"${DOMPurify.sanitize(sourceExcerpt, {
                ALLOWED_TAGS: [],
              })}"`,
            }}
          />
          {!isVerified ? (
            <p className="text-slate-600 text-xs mt-1">
              ⚠️ AI-generated excerpt — click verification buttons below to
              confirm this text appears on the page
            </p>
          ) : (
            <p className="text-emerald-500/70 text-xs mt-1 flex items-center gap-1">
              <Icon name="check" size={12} /> Source content verified by
              reviewer
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <SourceContextActions
          sourceUrl={sourceUrl}
          isVerified={isVerified}
          verifiedBy={verifiedBy}
          verifiedAt={verifiedAt}
          onVerifyDocs={onVerifyDocs}
          onVerifySearch={onVerifySearch}
          canVerify={canVerify}
        />
      </div>
    </div>
  );
};

export default SourceContextCard;
