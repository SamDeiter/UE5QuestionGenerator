/**
 * CSRF (Cross-Site Request Forgery) Protection Utility
 * Generates and validates CSRF tokens for state-changing operations
 */

let csrfToken = null;

/**
 * Generates a random CSRF token
 * @returns {string} CSRF token
 */
const generateCSRFToken = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Gets or creates the current CSRF token
 * Token is regenerated on each app load for additional security
 * @returns {string} Current CSRF token
 */
export const getCSRFToken = () => {
    if (!csrfToken) {
        csrfToken = generateCSRFToken();
        console.log('[CSRF] Token generated');
    }
    return csrfToken;
};

/**
 * Validates a CSRF token
 * @param {string} token - Token to validate
 * @returns {boolean} Whether token is valid
 */
export const validateCSRFToken = (token) => {
    return token === csrfToken;
};

/**
 * Refreshes the CSRF token (call after logout or security events)
 */
export const refreshCSRFToken = () => {
    csrfToken = generateCSRFToken();
    console.log('[CSRF] Token refreshed');
    return csrfToken;
};

/**
 * Adds CSRF token to request headers
 * @param {object} headers - Existing headers object
 * @returns {object} Headers with CSRF token added
 */
export const addCSRFHeader = (headers = {}) => {
    return {
        ...headers,
        'X-CSRF-Token': getCSRFToken()
    };
};

export default {
    getCSRFToken,
    validateCSRFToken,
    refreshCSRFToken,
    addCSRFHeader
};
