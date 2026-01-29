/**
 * Query Rate Limiter
 *
 * Prevents excessive Firestore queries by enforcing minimum intervals
 * between repeated queries. Helps prevent accidental query spam from
 * rapid UI interactions or render cycles.
 *
 * @module utils/queryRateLimiter
 */

import { FIRESTORE_LIMITS } from "./constants";

/** @type {Map<string, number>} */
const lastQueryTimes = new Map();

/**
 * Executes a query function with rate limiting.
 * If the same query key was executed recently, waits until the minimum interval has passed.
 *
 * @param {string} queryKey - Unique identifier for this query type
 * @param {Function} queryFn - Async function to execute
 * @param {number} [minIntervalMs] - Minimum ms between queries (default: from constants)
 * @returns {Promise<*>} - Result of queryFn
 *
 * @example
 * const result = await rateLimitedQuery('userQuestions', () => getUserQuestions(userId));
 */
export const rateLimitedQuery = async (
  queryKey,
  queryFn,
  minIntervalMs = FIRESTORE_LIMITS.MIN_QUERY_INTERVAL_MS
) => {
  const now = Date.now();
  const lastTime = lastQueryTimes.get(queryKey) || 0;
  const timeSinceLast = now - lastTime;

  if (timeSinceLast < minIntervalMs) {
    // Wait for the remaining time
    const waitTime = minIntervalMs - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastQueryTimes.set(queryKey, Date.now());
  return queryFn();
};

/**
 * Checks if a query can be executed immediately without rate limiting.
 *
 * @param {string} queryKey - Unique identifier for this query type
 * @param {number} [minIntervalMs] - Minimum ms between queries
 * @returns {boolean} - True if query can execute immediately
 */
export const canQueryNow = (
  queryKey,
  minIntervalMs = FIRESTORE_LIMITS.MIN_QUERY_INTERVAL_MS
) => {
  const lastTime = lastQueryTimes.get(queryKey) || 0;
  return Date.now() - lastTime >= minIntervalMs;
};

/**
 * Clears the rate limit tracking for a specific query or all queries.
 *
 * @param {string} [queryKey] - Specific query to clear, or all if omitted
 */
export const clearRateLimit = (queryKey = null) => {
  if (queryKey) {
    lastQueryTimes.delete(queryKey);
  } else {
    lastQueryTimes.clear();
  }
};

/**
 * Gets statistics about current rate limiting state.
 *
 * @returns {Object} - Rate limit statistics
 */
export const getRateLimitStats = () => {
  const now = Date.now();
  const stats = {};

  for (const [key, time] of lastQueryTimes) {
    stats[key] = {
      lastQuery: time,
      msSinceLastQuery: now - time,
      canQueryNow: now - time >= FIRESTORE_LIMITS.MIN_QUERY_INTERVAL_MS,
    };
  }

  return stats;
};
