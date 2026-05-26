import {
  query,
  where,
  collection,
  doc,
  getDoc,
  getCountFromServer,
  getAggregateFromServer,
  sum,
  count,
} from "firebase/firestore";
import { logger } from "../utils/logger";
import { getDb } from "./firebaseSave";

/**
 * firebaseStats — aggregation queries that don't touch question docs
 * directly. Extracted from firebaseQueries.js so the read/cache layer
 * can shrink and stats can evolve independently (e.g. when the
 * pre-computed aggregate doc grows new shapes).
 *
 * All three exports are pure server-side aggregations — no in-memory
 * cache reads, no IndexedDB touches. Safe to call from any context.
 */

/**
 * PHASE 2.3: Get category-specific stats for a discipline using server-side aggregation.
 * Calculates counts for all 6 categories (Beginner MC, Beginner T/F, etc.) in one go.
 *
 * @param {string} discipline - The discipline to count for (e.g. "Tech Art")
 * @returns {Promise<Object>} Map of category keys to counts
 */
export const getCategoryStatsAggregated = async (discipline) => {
  try {
    const questionsRef = collection(getDb(), "questions");

    // We want counts for status: accepted OR pending
    // Firestore count() doesn't support 'OR' natively in a single count() call easily
    // without complex Query constraints, but we can query by discipline and filter status.
    // However, to keep it O(1) reads, we'll fetch counts for each category.

    const results = {};
    const categories = [
      { diff: "Beginner", type: "Multiple Choice", key: "Beginner MC" },
      { diff: "Beginner", type: "True/False", key: "Beginner T/F" },
      { diff: "Intermediate", type: "Multiple Choice", key: "Intermediate MC" },
      { diff: "Intermediate", type: "True/False", key: "Intermediate T/F" },
      { diff: "Expert", type: "Multiple Choice", key: "Expert MC" },
      { diff: "Expert", type: "True/False", key: "Expert T/F" },
    ];

    await Promise.all(
      categories.map(async (cat) => {
        // Query for both 'accepted' and 'pending' (merged logic)
        const qAccepted = query(
          questionsRef,
          where("discipline", "==", discipline),
          where("difficulty", "==", cat.diff),
          where("type", "==", cat.type),
          where("status", "==", "accepted")
        );

        const qPending = query(
          questionsRef,
          where("discipline", "==", discipline),
          where("difficulty", "==", cat.diff),
          where("type", "==", cat.type),
          where("status", "in", ["pending", ""]) // Handle missing status as pending
        );

        const [snapAccepted, snapPending] = await Promise.all([
          getCountFromServer(qAccepted),
          getCountFromServer(qPending),
        ]);

        results[cat.key] = snapAccepted.data().count + snapPending.data().count;
      })
    );

    return results;
  } catch (error) {
    logger.error(`Error getting category stats for ${discipline}:`, error);
    return {};
  }
};

/**
 * PHASE 2.1: Get token usage stats for a user using server-side aggregation.
 * Uses Firestore's getAggregateFromServer with sum() and count() for efficient
 * calculation without downloading documents.
 *
 * PERFORMANCE: 1 aggregation read vs 5000+ document reads
 * COST: ~0.0001¢ vs ~$0.18 per request
 *
 * @param {string} userId - The user's UID
 * @returns {Promise<{totalCost: number, questionCount: number, estimatedInputTokens: number, estimatedOutputTokens: number}>}
 */
export const getUserTokenUsageAggregated = async (userId) => {
  try {
    if (!userId) {
      logger.log("⚠️ No userId provided for token usage aggregation");
      return {
        totalCost: 0,
        questionCount: 0,
        estimatedInputTokens: 0,
        estimatedOutputTokens: 0,
      };
    }

    const userQuery = query(
      collection(getDb(), "questions"),
      where("creatorId", "==", userId)
    );

    const snapshot = await getAggregateFromServer(userQuery, {
      totalCost: sum("estimatedCost"),
      questionCount: count(),
    });

    const data = snapshot.data();
    const avgInputTokensPerQuestion = 500;
    const avgOutputTokensPerQuestion = 200;

    const result = {
      totalCost: data.totalCost || 0,
      questionCount: data.questionCount || 0,
      estimatedInputTokens:
        (data.questionCount || 0) * avgInputTokensPerQuestion,
      estimatedOutputTokens:
        (data.questionCount || 0) * avgOutputTokensPerQuestion,
    };

    logger.log(
      `📊 User ${userId.slice(0, 8)}... token usage: ${result.questionCount} questions, $${result.totalCost.toFixed(4)}`
    );

    return result;
  } catch (error) {
    logger.error("Error getting user token usage:", error);
    return {
      totalCost: 0,
      questionCount: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
    };
  }
};

/**
 * Retrieves pre-computed question statistics from the aggregate document.
 * This is FAR cheaper than counting all questions client-side.
 *
 * The aggregate doc is maintained by a Cloud Function trigger.
 *
 * @returns {Promise<Object|null>} Stats object or null if not found
 * @example
 * const stats = await getQuestionStats();
 * // stats = {
 * //   totalQuestions: 4500,
 * //   byStatus: { pending: 150, accepted: 3800, rejected: 500 },
 * //   byDiscipline: { blueprints: 1200, materials: 800, ... },
 * //   byType: { multiple_choice: 3000, true_false: 1500 },
 * //   byDifficulty: { easy: 1500, medium: 2000, hard: 1000 },
 * //   lastUpdated: Timestamp
 * // }
 */
export const getQuestionStats = async () => {
  try {
    const statsRef = doc(getDb(), "_aggregates", "questionStats");
    const statsSnap = await getDoc(statsRef);

    if (statsSnap.exists()) {
      logger.log("📊 Loaded question stats from aggregate doc");
      return statsSnap.data();
    }

    logger.warn("⚠️ No aggregate stats found - run backfill script");
    return null;
  } catch (error) {
    logger.error("Error getting question stats:", error);
    return null;
  }
};
