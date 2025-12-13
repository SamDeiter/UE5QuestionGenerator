import React from "react";
import DOMPurify from "dompurify";
import Icon from "../Icon";

const SourceContextCard = ({ sourceUrl, sourceExcerpt }) => {
  if (!sourceExcerpt && !sourceUrl) {
    return null;
  }

  // Highlight matching terms between question and excerpt
  const highlightExcerpt = () => {
    if (!sourceExcerpt) return "";

    // Simple highlighting - could be enhanced
    return sourceExcerpt;
  };

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
            __html: `"${DOMPurify.sanitize(highlightExcerpt(), {
              ALLOWED_TAGS: [],
            })}"`,
          }}
        />
      )}

      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 transition-colors"
        >
          <Icon name="external-link" size={12} /> View Full Documentation
        </a>
      )}
    </div>
  );
};

export default SourceContextCard;
