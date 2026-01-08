import { logger } from "../utils/logger";
/**
 * Utility functions for quiz GUID generation and seeded randomization
 */

/**
 * Generate a UUID v4 GUID
 * NOTE: Using Math.random for GUID generation is acceptable here.
 * This is for generating unique identifiers, not for security purposes.
 * @returns {string} GUID in format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateGUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    // eslint-disable-next-line sonarjs/pseudo-random
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Simple hash function to convert string to number
 * @param {string} str - String to hash
 * @returns {number} Hash value
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Create a seeded random number generator
 * Uses a simple Linear Congruential Generator (LCG)
 * @param {string} seed - String seed (e.g., GUID)
 * @returns {Function} Random function that returns 0-1
 */
export function createSeededRandom(seed) {
  let state = hashString(seed);

  return function () {
    // LCG using GCC's constants
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Shuffle an array using a seeded random function
 * Fisher-Yates shuffle with custom RNG
 * @param {Array} array - Array to shuffle
 * @param {Function} randomFn - Seeded random function
 * @returns {Array} Shuffled copy of array
 */
export function seededShuffle(array, randomFn) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Report quiz results to SCORM LMS
 * @param {Object} results - Quiz results
 * @param {string} quizGuid - Quiz instance GUID
 * @param {number} timeSpent - Time spent in seconds
 */
export function reportToSCORM(results, quizGuid, timeSpent) {
  if (typeof window.SCORM12 === "undefined" || !window.SCORM12.isConnected()) {
    logger.log("SCORM not available - results not sent to LMS");
    logger.log("Quiz GUID:", quizGuid);
    logger.log("Results:", results);
    return;
  }

  try {
    // Send score
    window.SCORM12.setScoreRaw(results.percentage, 0, 100);

    // Send pass/fail status
    window.SCORM12.setStatus(results.passed ? "passed" : "failed");

    // Send session time
    window.SCORM12.setSessionTimeSeconds(timeSpent);

    // Send quiz GUID as suspend data for debugging
    // SCORM 1.2 allows up to 4096 characters in suspend_data
    const suspendData = JSON.stringify({
      quizGuid,
      completedAt: new Date().toISOString(),
      score: results.percentage,
      correct: results.correct,
      total: results.total,
    });

    window.SCORM12.setValue("cmi.suspend_data", suspendData);

    // Commit all changes
    window.SCORM12.commit();

    logger.log("Quiz results sent to SCORM LMS");
    logger.log("Quiz GUID:", quizGuid);
  } catch (error) {
    logger.error("Failed to report to SCORM:", error);
  }
}
