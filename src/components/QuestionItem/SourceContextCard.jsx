import React from "react";
import DOMPurify from "dompurify";
import Icon from "../Icon";
import { logger } from "../../utils/logger";
import { formatDate } from "../../utils/reviewerAnalytics";

/**
 * Validates if a URL is a legitimate Epic Games documentation link
 */
const isValidDocUrl = (url) => {
  if (!url || typeof url !== "string") return false;

  const trimmedUrl = url.trim();

  // Must be HTTPS
  if (!trimmedUrl.startsWith("https://")) return false;

  // Must be from Epic Games documentation
  const validDomains = [
    "dev.epicgames.com/documentation",
    "docs.unrealengine.com",
    "dev.epicgames.com/community",
  ];

  return validDomains.some((domain) => trimmedUrl.includes(domain));
};

const SourceContextCard = ({
  sourceUrl,
  sourceExcerpt,
  isVerified,
  verifiedBy,
  verifiedAt,
  onVerify,
}) => {
  // Validate the URL
  const hasValidUrl = isValidDocUrl(sourceUrl);

  // Don't render if no valid content
  if (!sourceExcerpt && !hasValidUrl) {
    return null;
  }

  const renderAction = () => {
    if (hasValidUrl) {
      const cleanUrl = sourceUrl.trim();
      return (
        <div className="flex flex-col gap-2">
          {isVerified && verifiedBy && (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium animate-in fade-in slide-in-from-left-1 duration-300">
              <Icon name="check-circle" size={14} />
              AI was verified by {verifiedBy} on {formatDate(verifiedAt)}
            </div>
          )}
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 hover:text-orange-300 text-xs font-semibold rounded-md border border-orange-500/40 transition-all hover:border-orange-500/60 cursor-pointer"
            onClick={(e) => {
              // Note: We don't call e.preventDefault() because we WANT to open the link
              logger.log(`[SourceContextCard] Navigating to: ${cleanUrl}`);
              if (onVerify && !isVerified) {
                onVerify();
              }
            }}
            title={`Check official documentation: ${cleanUrl}`}
          >
            <Icon name="external-link" size={12} /> {isVerified ? 'Re-Verify Source' : 'Verify Source'}
          </a>
        </div>
      );
    }

    if (sourceUrl) {
      return (
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 text-red-400 text-xs rounded-md border border-red-700/50 cursor-not-allowed"
          title="This link may be broken or from an unsupported domain"
        >
          <Icon name="alert-circle" size={12} /> Broken/Invalid Link
        </div>
      );
    }

    return null;
  };

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
              ⚠️ AI-generated excerpt — click "Verify Source" to confirm this text
              appears on the page
            </p>
          ) : (
            <p className="text-emerald-500/70 text-xs mt-1 flex items-center gap-1">
              <Icon name="check" size={12} /> Source content verified by reviewer
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">{renderAction()}</div>
    </div>
  );
};

export default SourceContextCard;
