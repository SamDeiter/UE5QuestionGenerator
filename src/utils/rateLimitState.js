/**
 * Rate Limit State Manager
 * Exposes rate limit state for UI consumption with reactive updates.
 */

// Internal state
const rateLimitState = {
  isLimited: false,
  retryAfter: 0,
  listeners: new Set(),
};

/**
 * Gets the current rate limit status.
 * @returns {{ isLimited: boolean, retryAfter: number, remainingSeconds: number }}
 */
export const getRateLimitStatus = () => {
  const now = Date.now();
  const remainingMs = Math.max(0, rateLimitState.retryAfter - now);
  return {
    isLimited: rateLimitState.isLimited && remainingMs > 0,
    retryAfter: rateLimitState.retryAfter,
    remainingSeconds: Math.ceil(remainingMs / 1000),
  };
};

/**
 * Sets the rate limit state (called by gemini.js fetchWithRetry).
 * @param {boolean} isLimited
 * @param {number} retryAfter - Timestamp when limit expires
 */
export const setRateLimitState = (isLimited, retryAfter) => {
  rateLimitState.isLimited = isLimited;
  rateLimitState.retryAfter = retryAfter;
  notifyListeners();
};

/**
 * Clears rate limit state after successful request.
 */
export const clearRateLimitState = () => {
  rateLimitState.isLimited = false;
  rateLimitState.retryAfter = 0;
  notifyListeners();
};

/**
 * Subscribe to rate limit state changes.
 * @param {Function} callback - Called when state changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToRateLimitState = (callback) => {
  rateLimitState.listeners.add(callback);
  return () => rateLimitState.listeners.delete(callback);
};

/** Notify all listeners of state change */
const notifyListeners = () => {
  rateLimitState.listeners.forEach((cb) => cb(getRateLimitStatus()));
};
