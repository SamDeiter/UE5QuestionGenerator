import { logger } from "../utils/logger";
/**
 * Migration Script: Add improvedScore to existing critique data
 *
 * For questions that have critique data but no improvedScore,
 * this estimates a reasonable improved score based on the original score.
 */

/**
 * Estimates improved score based on original critique score
 * @param {number} originalScore - The original critique score (0-100)
 * @returns {number} - Estimated improved score
 */
const estimateImprovedScore = (originalScore) => {
  if (!originalScore || originalScore >= 95) {
    // Already excellent, minimal room for improvement
    return Math.min(originalScore + 5, 100);
  } else if (originalScore >= 80) {
    // Good score, moderate improvement expected
    return Math.min(originalScore + 10, 100);
  } else if (originalScore >= 60) {
    // Acceptable score, significant improvement possible
    return Math.min(originalScore + 15, 100);
  } else {
    // Poor score, major improvement expected
    return Math.min(originalScore + 20, 100);
  }
};

/**
 * Migrates questions to add improvedScore where missing
 * @param {Array} questions - Array of question objects
 * @returns {Object} - { updated: number, migrated: Array }
 */
const migrateQuestionsWithImprovedScores = (questions) => {
  let updatedCount = 0;
  const migratedQuestions = questions.map((q) => {
    // Only migrate if:
    // 1. Has a critique score (was critiqued)
    // 2. Has a suggested rewrite (AI provided improvement)
    // 3. Does NOT already have an improvedScore
    if (
      q.critiqueScore !== undefined &&
      q.critiqueScore !== null &&
      q.suggestedRewrite &&
      !q.improvedScore
    ) {
      updatedCount++;
      return {
        ...q,
        improvedScore: estimateImprovedScore(q.critiqueScore),
      };
    }
    return q;
  });

  logger.log(
    `✅ Migration complete: Added improvedScore to ${updatedCount} questions`
  );
  return {
    updated: updatedCount,
    migrated: migratedQuestions,
  };
};

/**
 * Runs migration on localStorage questions
 */
export const runLocalStorageMigration = () => {
  try {
    const questionsKey = "ue5_questions";
    const stored = localStorage.getItem(questionsKey);

    if (!stored) {
      logger.log("ℹ️ No questions found in localStorage");
      return { updated: 0 };
    }

    const questions = JSON.parse(stored);
    const result = migrateQuestionsWithImprovedScores(questions);

    // Save migrated questions back
    localStorage.setItem(questionsKey, JSON.stringify(result.migrated));

    logger.log(
      `✅ localStorage migration complete: ${result.updated} questions updated`
    );
    return result;
  } catch (error) {
    logger.error("❌ Migration failed:", error);
    return { updated: 0, error };
  }
};
