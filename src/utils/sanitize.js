import DOMPurify from "dompurify";

/**
 * Sanitizes plain text content (more restrictive)
 * @param {string} dirty - Untrusted text content
 * @returns {object} - Sanitized content safe for rendering
 */
export const sanitizeText = (dirty) => {
  return {
    __html: DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ["b", "i", "em", "strong", "code"],
      ALLOWED_ATTR: [],
    }),
  };
};

export default { sanitizeText };
