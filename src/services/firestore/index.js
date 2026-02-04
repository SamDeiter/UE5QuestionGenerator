/**
 * Firestore Data Access Layer
 *
 * Centralized entry point for all Firestore operations.
 * Re-exports from specialized modules for cleaner imports.
 *
 * @example
 * // Instead of multiple imports:
 * import { getQuestionsFromFirestore } from '../services/firebaseQueries';
 * import { saveQuestionToFirestore } from '../services/firebaseSave';
 *
 * // Use single import:
 * import { questions, users } from '../services/firestore';
 * const allQuestions = await questions.getAll();
 * await questions.save(questionData);
 */

// Question repository operations
export * from "./questionRepository";

// User repository operations (settings, tags, etc.)
export * from "./userRepository";

// Cache management
export { invalidateCache, getCacheStats } from "./cacheManager";

// Connection and offline queue status
export {
  getConnectionStatus,
  getQueueDetails,
  subscribeToConnectionStatus,
  triggerManualSync,
} from "./connectionMonitor";

// Re-export legacy functions for backward compatibility
// Note: These will be deprecated after consumers migrate to repository pattern
export {
  // Read operations
  getQuestionsFromFirestore,
  getAllQuestionsFromFirestore,
  subscribeToAllQuestions,
  getQuestionsPaginated,
  getQuestionsPaginatedWithFilters,
  getUserTokenUsageAggregated,
  getQuestionStatsAggregated,
  getQuestionStats,
  clearAllQuestionsFromFirestore,
  deleteSoftDeletedQuestionsFromFirestore,
  deleteQuestionFromFirestore,
  saveCustomTags,
  getCustomTags,
  invalidateQuestionsCache,
} from "../firebaseQueries";

export {
  // Write operations
  saveQuestionToFirestore,
  batchSaveQuestions,
  ensurePersistence,
  getPersistenceStatus,
  getConnectionStatus as getConnectionStatusLegacy,
  getQueueDetails as getQueueDetailsLegacy,
  getQueuedQuestionIds,
  triggerManualSync as triggerManualSyncLegacy,
  subscribeToConnectionStatus as subscribeToConnectionStatusLegacy,
  clearOfflineQueue,
} from "../firebaseSave";
