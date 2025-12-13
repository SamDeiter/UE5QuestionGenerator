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
  // Helper to normalize difficulty from "Easy MC" -> "Easy"
  const normalizeDiff = (d) => {
    if (!d) return d;
    const base = d.split(" ")[0];
    // Map config values to base difficulty
    if (base === "Beginner") return "Easy";
    if (base === "Intermediate") return "Medium";
    if (base === "Expert") return "Hard";
    return base;
  };

  const targetDiff = normalizeDiff(difficulty);

  // Check total quota
  if (isTotalQuotaMet(questions)) {
    return {
      allowed: false,
      reason: `Total quota reached (${TARGET_TOTAL} questions). No more generation allowed.`,
      maxAllowed: 0,
    };
  }

  // Filter questions for this discipline and base difficulty
  const relevantQuestions = questions.filter((q) => {
    if (q.status === "rejected") return false;
    if (q.discipline !== discipline) return false;
    const qDiff = normalizeDiff(q.difficulty);
    return qDiff === targetDiff;
  });

  // Count MC and T/F separately
  const mcCount = relevantQuestions.filter(
    (q) => q.type === "Multiple Choice" || q.type === "MC"
  ).length;

  const tfCount = relevantQuestions.filter(
    (q) => q.type === "True/False" || q.type === "T/F"
  ).length;

  const MC_QUOTA = TARGET_PER_CATEGORY;
  const TF_QUOTA = TARGET_PER_CATEGORY;

  // Check if both MC and T/F are full for this difficulty
  if (mcCount >= MC_QUOTA && tfCount >= TF_QUOTA) {
    return {
      allowed: false,
      reason: `Both MC (${mcCount}/${MC_QUOTA}) and T/F (${tfCount}/${TF_QUOTA}) are full for ${difficulty}. Select a different difficulty.`,
      maxAllowed: 0,
    };
  }

  // For Balanced mode, check which type needs more
  if (type === "Balanced" || type === "Balanced (50/50 MC & T/F)") {
    if (mcCount >= MC_QUOTA && tfCount < TF_QUOTA) {
      return {
        allowed: true,
        reason: `MC is full (${mcCount}/${MC_QUOTA}). Will generate T/F only.`,
        maxAllowed: Math.min(batchSize, TF_QUOTA - tfCount),
        forceType: "True/False",
        warning: true,
      };
    }
    if (tfCount >= TF_QUOTA && mcCount < MC_QUOTA) {
      return {
        allowed: true,
        reason: `T/F is full (${tfCount}/${TF_QUOTA}). Will generate MC only.`,
        maxAllowed: Math.min(batchSize, MC_QUOTA - mcCount),
        forceType: "Multiple Choice",
        warning: true,
      };
    }
  }

  // For specific type selection
  if (type === "Multiple Choice" || type === "MC") {
    if (mcCount >= MC_QUOTA) {
      return {
        allowed: false,
        reason: `MC quota full for ${difficulty} (${mcCount}/${MC_QUOTA}). Switch to T/F or Balanced.`,
        maxAllowed: 0,
        forceType: "True/False",
      };
    }
    return {
      allowed: true,
      reason: "Generation allowed",
      maxAllowed: Math.min(batchSize, MC_QUOTA - mcCount),
    };
  }

  if (type === "True/False" || type === "T/F") {
    if (tfCount >= TF_QUOTA) {
      return {
        allowed: false,
        reason: `T/F quota full for ${difficulty} (${tfCount}/${TF_QUOTA}). Switch to MC or Balanced.`,
        maxAllowed: 0,
        forceType: "Multiple Choice",
      };
    }
    return {
      allowed: true,
      reason: "Generation allowed",
      maxAllowed: Math.min(batchSize, TF_QUOTA - tfCount),
    };
  }

  // Default: allow generation
  const totalRemaining = MC_QUOTA - mcCount + (TF_QUOTA - tfCount);
  return {
    allowed: true,
    reason: "Generation allowed",
    maxAllowed: Math.min(batchSize, totalRemaining),
  };
};
