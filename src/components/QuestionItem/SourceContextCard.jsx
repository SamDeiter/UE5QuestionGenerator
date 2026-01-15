import React from "react";
import DOMPurify from "dompurify";
import Icon from "../Icon";

/**
 * Validates if a URL is a legitimate Epic Games documentation link
 */
const isValidDocUrl = (url) => {
  if (!url || typeof url !== "string") return false;

  // Must be HTTPS
  if (!url.startsWith("https://")) return false;

  // Must be from Epic Games documentation
  const validDomains = [
    "dev.epicgames.com/documentation",
    "docs.unrealengine.com",
    "dev.epicgames.com/community",
  ];

  return validDomains.some((domain) => url.includes(domain));
};

const SourceContextCard = ({ sourceUrl, sourceExcerpt, isVerified }) => {
  // Validate the URL
  const hasValidUrl = isValidDocUrl(sourceUrl);

  // Don't render if no valid content
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
          <p className="text-slate-600 text-xs mt-1">
            ⚠️ AI-generated excerpt — click "Verify Source" to confirm this text
            appears on the page
          </p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {hasValidUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 hover:text-orange-300 text-xs font-semibold rounded-md border border-orange-500/40 transition-all hover:border-orange-500/60"
          >
            <Icon name="external-link" size={12} /> Verify Source
          </a>
        ) : sourceUrl ? (
          // Show disabled state for invalid URLs
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 text-red-400 text-xs rounded-md border border-red-700/50 cursor-not-allowed"
            title="This link may be broken or from an unsupported domain"
          >
            <Icon name="alert-circle" size={12} /> Broken/Invalid Link
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SourceContextCard;
