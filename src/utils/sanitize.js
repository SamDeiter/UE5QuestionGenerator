import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param {string} dirty - Untrusted HTML content
 * @param {object} options - DOMPurify configuration options
 * @returns {object} - Sanitized HTML safe for dangerouslySetInnerHTML
 */
export const sanitizeHTML = (dirty, options = {}) => {
    const defaultConfig = {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'code', 'pre', 'ul', 'ol', 'li', 'a'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        ALLOW_DATA_ATTR: false,
        ...options
    };
    
    return {
        __html: DOMPurify.sanitize(dirty, defaultConfig)
    };
};

/**
 * Sanitizes plain text content (more restrictive)
 * @param {string} dirty - Untrusted text content
 * @returns {object} - Sanitized content safe for rendering
 */
export const sanitizeText = (dirty) => {
    return {
        __html: DOMPurify.sanitize(dirty, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code'],
            ALLOWED_ATTR: []
        })
    };
};

/**
 * Sanitizes markdown content
 * @param {string} dirty - Untrusted markdown/HTML content
 * @returns {object} - Sanitized content
 */
export const sanitizeMarkdown = (dirty) => {
    return {
        __html: DOMPurify.sanitize(dirty, {
            ALLOWED_TAGS: [
                'b', 'i', 'em', 'strong', 'p', 'br', 'code', 'pre',
                'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'blockquote', 'hr'
            ],
            ALLOWED_ATTR: ['href', 'target', 'rel'],
            ALLOW_DATA_ATTR: false
        })
    };
};

export default { sanitizeHTML, sanitizeText, sanitizeMarkdown };
