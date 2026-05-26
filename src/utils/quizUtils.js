import { logger } from "../utils/logger";
/**
 * Utility functions for quiz GUID generation and seeded randomization
 */

/**
 * Normalize a raw difficulty string into one of: "easy" | "medium" | "hard" | "other".
 *
 * The app uses two interchangeable difficulty vocabularies that must both map
 * to the same SCORM tier:
 *   - Canonical (Firestore, default config): "Beginner" / "Intermediate" / "Expert"
 *   - Legacy (mock data, older records, tests): "Easy" / "Medium" / "Hard"
 *
 * Values may also carry a type suffix (e.g. "Easy MC", "Beginner T/F"); we
 * inspect the substring so suffixed values still classify correctly.
 *
 * @param {string} rawDifficulty - Difficulty value from a question record.
 * @returns {"easy"|"medium"|"hard"|"other"}
 */
export function classifyDifficulty(rawDifficulty) {
  const d = (rawDifficulty || "").toLowerCase();
  if (!d) return "other";
  if (d.includes("easy") || d.includes("beginner")) return "easy";
  if (d.includes("medium") || d.includes("intermediate")) return "medium";
  if (d.includes("hard") || d.includes("expert") || d.includes("advanced"))
    return "hard";
  return "other";
}

/**
 * Bucket a list of questions into easy/medium/hard/other counts using
 * the dual-vocabulary classifier above.
 *
 * @param {Array<{difficulty?: string}>} questions
 * @returns {{easy:number, medium:number, hard:number, other:number, total:number}}
 */
export function bucketByDifficulty(questions) {
  const buckets = { easy: 0, medium: 0, hard: 0, other: 0 };
  for (const q of questions) {
    buckets[classifyDifficulty(q.difficulty)] += 1;
  }
  return { ...buckets, total: questions.length };
}

/**
 * Simulate the weighted distribution that scorm-template/game.js will apply
 * at quiz launch time. Mirrors buildBalancedQuestionList() so the export
 * modal can show users what each attempt will actually contain.
 *
 * @param {{easy:number, medium:number, hard:number, other:number, total:number}} pool
 * @param {{questionsPerAttempt?: number, weights?: {easy:number, medium:number, hard:number}}} [config]
 * @returns {{easy:number, medium:number, hard:number, other:number, total:number}}
 */
export function simulateAttemptDistribution(pool, config = {}) {
  const weights = config.weights || { easy: 0.15, medium: 0.35, hard: 0.5 };
  const totalAvailable = pool.total;
  const targetTotal = config.questionsPerAttempt
    ? Math.min(config.questionsPerAttempt, totalAvailable)
    : totalAvailable;

  const targetEasy = Math.round(targetTotal * weights.easy);
  const targetMedium = Math.round(targetTotal * weights.medium);
  const targetHard = targetTotal - targetEasy - targetMedium;

  const actualEasy = Math.min(targetEasy, pool.easy);
  const actualMedium = Math.min(targetMedium, pool.medium);
  const actualHard = Math.min(targetHard, pool.hard);

  let surplus =
    targetEasy -
    actualEasy +
    (targetMedium - actualMedium) +
    (targetHard - actualHard);
  const extraHard = Math.min(surplus, pool.hard - actualHard);
  surplus -= extraHard;
  const extraMedium = Math.min(surplus, pool.medium - actualMedium);
  surplus -= extraMedium;
  const extraEasy = Math.min(surplus, pool.easy - actualEasy);

  const easy = actualEasy + extraEasy;
  const medium = actualMedium + extraMedium;
  const hard = actualHard + extraHard;
  const other = pool.other; // uncategorized always tacked on
  return { easy, medium, hard, other, total: easy + medium + hard + other };
}

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
