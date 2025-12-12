/**
 * Quota Enforcement Utilities
 * Prevents generation when category/discipline quotas are met
 */

import { TARGET_PER_CATEGORY, TARGET_TOTAL, CATEGORY_KEYS } from "./constants";

/**
 * Calculates current question counts by category
 * @param {Array} questions - All questions
 * @returns {Object} Category counts
 */
export const getCategoryCounts = (questions) => {
  const counts = {};

  CATEGORY_KEYS.forEach((cat) => {
    counts[cat] = questions.filter(
      (q) => q.difficulty === cat && q.status !== "rejected"
    ).length;
  });

  return counts;
};

/**
 * Calculates counts by discipline and difficulty
 * @param {Array} questions - All questions
 * @returns {Object} Nested counts { discipline: { difficulty: count } }
 */
export const getDisciplineCounts = (questions) => {
  const counts = {};

  questions.forEach((q) => {
    if (q.status === "rejected") return;

    const discipline = q.discipline || "Unknown";
    const difficulty = q.difficulty || "Unknown";

    if (!counts[discipline]) counts[discipline] = {};
    if (!counts[discipline][difficulty]) counts[discipline][difficulty] = 0;

    counts[discipline][difficulty]++;
  });

  return counts;
};

/**
 * Checks if a category has reached its quota
 * @param {string} category - Category key (e.g., "Easy MC")
 * @param {Array} questions - All questions
 * @returns {boolean} True if quota met or exceeded
 */
export const isCategoryFull = (category, questions) => {
  const count = questions.filter(
    (q) => q.difficulty === category && q.status !== "rejected"
  ).length;

  return count >= TARGET_PER_CATEGORY;
};

/**
 * Checks if specific discipline+difficulty combo is full
 * @param {string} discipline - Discipline (e.g., "Blueprints")
 * @param {string} difficulty - Difficulty (e.g., "Easy MC")
 * @param {Array} questions - All questions
 * @returns {boolean} True if quota met
 */
export const isDisciplineFull = (discipline, difficulty, questions) => {
  const count = questions.filter(
    (q) =>
      q.discipline === discipline &&
      q.difficulty === difficulty &&
      q.status !== "rejected"
  ).length;

  return count >= TARGET_PER_CATEGORY;
};

/**
 * Checks if total question count has been reached
 * @param {Array} questions - All questions
 * @returns {boolean} True if total quota met
 */
export const isTotalQuotaMet = (questions) => {
  const count = questions.filter((q) => q.status !== "rejected").length;
  return count >= TARGET_TOTAL;
};

/**
 * Gets remaining quota for a specific category
 * @param {string} category - Category key
 * @param {Array} questions - All questions
 * @returns {number} Remaining questions allowed (0 if full)
 */
export const getRemainingQuota = (category, questions) => {
  const current = questions.filter(
    (q) => q.difficulty === category && q.status !== "rejected"
  ).length;

  return Math.max(0, TARGET_PER_CATEGORY - current);
};

/**
 * Gets quota status for all categories
 * @param {Array} questions - All questions
 * @returns {Object} { category: { current, target, remaining, isFull } }
 */
export const getQuotaStatus = (questions) => {
  const status = {};

  CATEGORY_KEYS.forEach((cat) => {
    const current = questions.filter(
      (q) => q.difficulty === cat && q.status !== "rejected"
    ).length;

    status[cat] = {
      current,
      target: TARGET_PER_CATEGORY,
      remaining: Math.max(0, TARGET_PER_CATEGORY - current),
      isFull: current >= TARGET_PER_CATEGORY,
      percentage: Math.round((current / TARGET_PER_CATEGORY) * 100),
    };
  });

  // Add total
  const totalCurrent = questions.filter((q) => q.status !== "rejected").length;
  status.TOTAL = {
    current: totalCurrent,
    target: TARGET_TOTAL,
    remaining: Math.max(0, TARGET_TOTAL - totalCurrent),
    isFull: totalCurrent >= TARGET_TOTAL,
    percentage: Math.round((totalCurrent / TARGET_TOTAL) * 100),
  };

  return status;
};

/**
 * Validates if generation should be allowed
 * @param {string} discipline - Selected discipline
 * @param {string} difficulty - Selected difficulty
 * @param {number} batchSize - Number of questions to generate
 * @param {Array} questions - All existing questions
 * @param {string} type - Selected type (MC, T/F, or Balanced)
 * @returns {Object} { allowed: boolean, reason: string, maxAllowed: number, forceType: string }
 */
export const validateGeneration = (
  discipline,
  difficulty,
  batchSize,
  questions,
  type = "Balanced"
) => {
  // Check total quota
  if (isTotalQuotaMet(questions)) {
    return {
      allowed: false,
      reason: `Total quota reached (${TARGET_TOTAL} questions). No more generation allowed.`,
      maxAllowed: 0,
    };
  }

  // Check category quota
  const remaining = getRemainingQuota(difficulty, questions);

  if (remaining === 0) {
    return {
      allowed: false,
      reason: `Category "${difficulty}" is full (${TARGET_PER_CATEGORY}/${TARGET_PER_CATEGORY}). Select a different difficulty.`,
      maxAllowed: 0,
    };
  }

  // TYPE BALANCE CHECK: Prevent generating more of an overrepresented type
  const difficultyQuestions = questions.filter(
    (q) =>
      q.discipline === discipline &&
      q.difficulty === difficulty &&
      q.status !== "rejected"
  );

  const mcCount = difficultyQuestions.filter(
    (q) => q.type === "Multiple Choice" || q.type === "MC"
  ).length;

  const tfCount = difficultyQuestions.filter(
    (q) => q.type === "True/False" || q.type === "T/F"
  ).length;

  const imbalance = Math.abs(mcCount - tfCount);
  const IMBALANCE_THRESHOLD = 3; // Allow up to 3 difference before enforcing

  // If there's a significant imbalance, force generation of the underrepresented type
  if (imbalance > IMBALANCE_THRESHOLD) {
    const needsMore = mcCount < tfCount ? "Multiple Choice" : "True/False";
    const hasMore = mcCount > tfCount ? "Multiple Choice" : "True/False";

    // If trying to generate MORE of the overrepresented type, block it
    if (type === hasMore) {
      return {
        allowed: false,
        reason: `Type imbalance detected at ${difficulty}: ${mcCount} MC vs ${tfCount} T/F. Generate ${needsMore} questions first to restore balance.`,
        maxAllowed: 0,
        forceType: needsMore,
      };
    }

    return {
      allowed: true,
      reason: `Imbalance detected (${mcCount} MC, ${tfCount} T/F). Prioritizing ${needsMore}.`,
      maxAllowed: batchSize,
      forceType: needsMore,
      warning: true,
    };
  }

  if (batchSize > remaining) {
    return {
      allowed: true,
      reason: `Only ${remaining} questions remaining for "${difficulty}". Batch size reduced.`,
      maxAllowed: remaining,
      warning: true,
    };
  }

  return {
    allowed: true,
    reason: "Generation allowed",
    maxAllowed: batchSize,
  };
};
