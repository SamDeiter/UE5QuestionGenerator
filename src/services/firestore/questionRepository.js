/**
 * Question Repository
 *
 * Clean repository interface for question CRUD operations.
 * Wraps the underlying firebaseQueries and firebaseSave modules.
 *
 * @example
 * import { questions } from '../services/firestore';
 *
 * // Get all questions
 * const allQuestions = await questions.getAll();
 *
 * // Get questions with filters
 * const pending = await questions.getByStatus('pending');
 *
 * // Save a question
 * await questions.save(questionData);
 */
import {
  getQuestionsFromFirestore,
  getAllQuestionsFromFirestore,
  subscribeToAllQuestions,
  getQuestionsPaginated,
  getQuestionsPaginatedWithFilters,
  deleteQuestionFromFirestore,
  clearAllQuestionsFromFirestore,
  deleteSoftDeletedQuestionsFromFirestore,
  invalidateQuestionsCache,
} from "../firebaseQueries";

import { saveQuestionToFirestore, batchSaveQuestions } from "../firebaseSave";

// Default page size for pagination (configurable via FIRESTORE_LIMITS)
const DEFAULT_PAGE_SIZE = 20;

/**
 * Question Repository - Clean API for question operations
 */
export const questions = {
  /**
   * Get all questions for the current user
   * @returns {Promise<Array>} Array of question objects
   */
  getForCurrentUser: getQuestionsFromFirestore,

  /**
   * Get all questions (shared database view)
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number to return
   * @param {boolean} options.forceRefresh - Bypass cache
   * @returns {Promise<Array>} Array of question objects
   */
  getAll: async ({ limit, forceRefresh = false } = {}) => {
    return getAllQuestionsFromFirestore(undefined, forceRefresh, limit);
  },

  /**
   * Subscribe to real-time question updates
   * @param {Function} callback - Called with (questions, error)
   * @param {Object} options - Subscription options
   * @returns {Function} Unsubscribe function
   */
  subscribe: (callback, { maxResults } = {}) => {
    return subscribeToAllQuestions(callback, maxResults);
  },

  /**
   * Get questions with pagination
   * @param {string} userId - User ID to filter by
   * @param {Object} options - Pagination options
   * @returns {Promise<{questions, lastDoc, hasMore}>}
   */
  getPaginated: (
    userId,
    { limit = DEFAULT_PAGE_SIZE, lastDoc = null } = {}
  ) => {
    return getQuestionsPaginated(userId, limit, lastDoc);
  },

  /**
   * Get questions with filters and pagination
   * @param {Object} options - Filter and pagination options
   * @returns {Promise<{questions, lastDoc, hasMore}>}
   */
  getFiltered: ({
    status,
    discipline,
    pageSize = DEFAULT_PAGE_SIZE,
    lastDoc = null,
    orderBy = "firestoreUpdatedAt",
    orderDirection = "desc",
  } = {}) => {
    return getQuestionsPaginatedWithFilters({
      status,
      discipline,
      pageSize,
      lastDoc,
      orderByField: orderBy,
      orderDirection,
    });
  },

  /**
   * Get questions by status
   * @param {string} status - Status to filter by (pending, accepted, rejected)
   * @param {Object} options - Pagination options
   * @returns {Promise<{questions, lastDoc, hasMore}>}
   */
  getByStatus: (status, options = {}) => {
    return getQuestionsPaginatedWithFilters({ status, ...options });
  },

  /**
   * Save a single question
   * @param {Object} question - Question object to save
   * @returns {Promise<{success, queued, error?}>}
   */
  save: saveQuestionToFirestore,

  /**
   * Save multiple questions in batch
   * @param {Array} questionsToSave - Array of question objects
   * @returns {Promise<{success, failed, queued}>}
   */
  saveBatch: batchSaveQuestions,

  /**
   * Delete a question by ID
   * @param {string} uniqueId - Question unique ID
   * @returns {Promise<void>}
   */
  delete: deleteQuestionFromFirestore,

  /**
   * Delete all questions for current user
   * WARNING: Destructive operation
   * @returns {Promise<number>} Number of deleted documents
   */
  deleteAll: clearAllQuestionsFromFirestore,

  /**
   * Delete all soft-deleted questions
   * @returns {Promise<number>} Number of deleted documents
   */
  deleteSoftDeleted: deleteSoftDeletedQuestionsFromFirestore,

  /**
   * Invalidate the questions cache
   */
  invalidateCache: invalidateQuestionsCache,
};

// Default export for convenience
export default questions;
