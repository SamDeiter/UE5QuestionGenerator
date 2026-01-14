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

const SourceContextCard = ({ sourceUrl, sourceExcerpt }) => {
  // Validate the URL
  const hasValidUrl = isValidDocUrl(sourceUrl);

  // Don't render if no valid content
  if (!sourceExcerpt && !hasValidUrl) {
    return null;
  }

  return (
    <div className="bg-slate-950/50 border border-blue-700/30 rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon name="book-open" className="text-blue-400" size={16} />
        <span className="text-blue-300 font-bold text-sm">Source Context</span>
      </div>

      {sourceExcerpt && (
        <p
          className="text-slate-400 text-sm italic leading-relaxed mb-3"
          dangerouslySetInnerHTML={{
            __html: `"${DOMPurify.sanitize(sourceExcerpt, {
              ALLOWED_TAGS: [],
            })}"`,
          }}
        />
      )}

      {hasValidUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 hover:text-orange-300 text-xs font-semibold rounded-md border border-orange-500/40 transition-all hover:border-orange-500/60"
        >
          <Icon name="external-link" size={12} /> View Full Documentation
        </a>
      ) : sourceUrl ? (
        // Show disabled state for invalid URLs
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 text-slate-500 text-xs rounded-md border border-slate-700 cursor-not-allowed"
          title="Documentation link unavailable"
        >
          <Icon name="link-off" size={12} /> Documentation Unavailable
        </div>
      ) : null}
    </div>
  );
};

export default SourceContextCard;
