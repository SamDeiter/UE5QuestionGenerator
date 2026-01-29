/**
 * Performance Logger
 *
 * Logs query performance metrics for monitoring and optimization.
 * Helps identify slow queries and track improvements.
 *
 * @module utils/perfLogger
 */

import { logger } from "./logger";

// Warning threshold in milliseconds
const SLOW_QUERY_THRESHOLD_MS = 1000;

/**
 * Logs performance metrics for a Firestore query.
 *
 * @param {string} queryName - Name/identifier for the query
 * @param {number} startTime - performance.now() value from before query
 * @param {number} docCount - Number of documents returned
 */
export const logQueryPerformance = (queryName, startTime, docCount = 0) => {
  const duration = performance.now() - startTime;
  const perDoc = docCount > 0 ? (duration / docCount).toFixed(2) : "N/A";

  const message = `[PERF] ${queryName}: ${duration.toFixed(0)}ms for ${docCount} docs (${perDoc}ms/doc)`;

  if (duration > SLOW_QUERY_THRESHOLD_MS) {
    logger.warn(`⚠️ SLOW QUERY: ${message}`);
  } else {
    logger.log(`⚡ ${message}`);
  }

  return { duration, docCount, perDoc };
};

/**
 * Creates a performance timer that can be stopped later.
 *
 * @param {string} operationName - Name of the operation being timed
 * @returns {Object} - Timer object with stop() method
 *
 * @example
 * const timer = startPerfTimer('loadDashboard');
 * // ... do work ...
 * timer.stop(); // Logs performance metrics
 */
export const startPerfTimer = (operationName) => {
  const startTime = performance.now();

  return {
    /**
     * Stops the timer and logs metrics.
     * @param {number} [docCount] - Optional document count for per-doc metrics
     * @returns {Object} - Performance metrics
     */
    stop: (docCount = 0) => {
      return logQueryPerformance(operationName, startTime, docCount);
    },

    /**
     * Gets elapsed time without stopping.
     * @returns {number} - Elapsed milliseconds
     */
    elapsed: () => performance.now() - startTime,
  };
};

/**
 * Wraps an async function with performance logging.
 *
 * @param {string} operationName - Name for logging
 * @param {Function} asyncFn - Async function to wrap
 * @returns {Promise<*>} - Result of the async function
 *
 * @example
 * const questions = await withPerfLogging('getAllQuestions', () => fetchQuestions());
 */
export const withPerfLogging = async (operationName, asyncFn) => {
  const timer = startPerfTimer(operationName);

  try {
    const result = await asyncFn();
    const docCount = Array.isArray(result) ? result.length : 1;
    timer.stop(docCount);
    return result;
  } catch (error) {
    logger.error(
      `[PERF] ${operationName} failed after ${timer.elapsed().toFixed(0)}ms:`,
      error
    );
    throw error;
  }
};
