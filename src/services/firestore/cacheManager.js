/**
 * Cache Manager
 *
 * Centralized cache management for Firestore data.
 * Provides unified cache invalidation and statistics.
 *
 * @example
 * import { invalidateCache, getCacheStats } from '../services/firestore';
 *
 * // Invalidate all caches
 * invalidateCache('all');
 *
 * // Invalidate just questions cache
 * invalidateCache('questions');
 */
import { invalidateQuestionsCache } from "../firebaseQueries";

/**
 * Cache types that can be invalidated
 */
const CACHE_TYPES = {
  QUESTIONS: "questions",
  USERS: "users",
  STATS: "stats",
  ALL: "all",
};

/**
 * Invalidate a specific cache or all caches
 * @param {string} cacheType - Type of cache to invalidate
 */
export const invalidateCache = (cacheType = CACHE_TYPES.ALL) => {
  switch (cacheType) {
    case CACHE_TYPES.QUESTIONS:
      invalidateQuestionsCache();
      break;
    case CACHE_TYPES.USERS:
      // User cache invalidation (if implemented)
      break;
    case CACHE_TYPES.STATS:
      // Stats cache invalidation (if implemented)
      break;
    case CACHE_TYPES.ALL:
    default:
      invalidateQuestionsCache();
      // Add other cache invalidations as needed
      break;
  }
};

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export const getCacheStats = () => {
  // This would return cache hit/miss stats, sizes, etc.
  // For now, return placeholder stats
  return {
    questions: {
      type: "questions",
      size: 0,
      lastInvalidated: null,
    },
  };
};

/**
 * Clear all caches
 */
export const clearAllCaches = () => {
  invalidateCache(CACHE_TYPES.ALL);
};

export default { invalidateCache, getCacheStats, clearAllCaches };
