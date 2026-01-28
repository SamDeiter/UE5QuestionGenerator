/**
 * Connection Monitor
 *
 * Centralized connection status and offline queue monitoring.
 * Re-exports from firebaseSave for cleaner imports.
 *
 * @example
 * import { getConnectionStatus, subscribeToConnectionStatus } from '../services/firestore';
 *
 * // Check connection status
 * const { isOnline, queuedItems } = getConnectionStatus();
 *
 * // Subscribe to changes
 * const unsubscribe = subscribeToConnectionStatus(status => {
 *   console.log('Connection:', status.isOnline);
 * });
 */
import {
  getConnectionStatus as getStatus,
  getQueueDetails as getQueue,
  getQueuedQuestionIds,
  triggerManualSync as triggerSync,
  subscribeToConnectionStatus as subscribeStatus,
} from "../firebaseSave";

/**
 * Get current connection status
 * @returns {Object} { isOnline, syncInProgress, queuedItems }
 */
export const getConnectionStatus = getStatus;

/**
 * Get detailed queue information
 * @returns {Object} { queueLength, items, oldestItem }
 */
export const getQueueDetails = getQueue;

/**
 * Get IDs of questions currently in the offline queue
 * @returns {Set<string>} Set of question IDs
 */
export const getQueuedIds = getQueuedQuestionIds;

/**
 * Trigger manual sync of queued items
 * @returns {Promise<void>}
 */
export const triggerManualSync = triggerSync;

/**
 * Subscribe to connection status changes
 * @param {Function} callback - Called with status object
 * @returns {Function} Unsubscribe function
 */
export const subscribeToConnectionStatus = subscribeStatus;

/**
 * Check if a specific question is currently queued
 * @param {string} questionId - Question ID to check
 * @returns {boolean} True if queued
 */
export const isQuestionQueued = (questionId) => {
  return getQueuedQuestionIds().has(questionId);
};

export default {
  getConnectionStatus,
  getQueueDetails,
  getQueuedIds,
  triggerManualSync,
  subscribeToConnectionStatus,
  isQuestionQueued,
};
