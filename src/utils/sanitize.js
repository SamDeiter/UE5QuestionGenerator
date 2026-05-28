import DOMPurify from "dompurify";

/**
 * Sanitizes untrusted text content and returns a `{ __html }` object ready
 * to pass to React's `dangerouslySetInnerHTML`. Renamed from the previous
 * `sanitizeText` to remove a footgun: `stringHelpers.js` also exports
 * `sanitizeText`, but that one returns a sanitized STRING (used for the
 * `__html` value, not the prop object). Mixing the two ended in
 * runtime "expected object" / "string used as object" surprises.
 *
 * Use this when you have `dangerouslySetInnerHTML={...}`.
 * Use stringHelpers.sanitizeText / renderMarkdown when you need a string.
 *
 * @param {string} dirty
 * @returns {{ __html: string }}
 */
export const sanitizeToHtmlProps = (dirty) => {
  return {
    __html: DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ["b", "i", "em", "strong", "code"],
      ALLOWED_ATTR: [],
    }),
  };
};

export default { sanitizeToHtmlProps };
