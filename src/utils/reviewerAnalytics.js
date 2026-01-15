/**
 * reviewerAnalytics.js - Reviewer Activity Analytics
 *
 * Provides functions to aggregate and analyze reviewer performance metrics
 * from Firestore question data.
 */

import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { getDb } from "../services/firebase";
import { logger } from "../utils/logger";

/**
 * Fetches all questions that have been reviewed (have reviewCompletedAt timestamp)
 * @returns {Promise<Array>} Array of reviewed question objects
 */
export const fetchReviewedQuestions = async () => {
  try {
    // Query the questions collection for reviewed questions (accepted or rejected)
    const questionsRef = collection(getDb(), "questions");

    // Query for questions that have been reviewed (have status of accepted or rejected)
    const q = query(
      questionsRef,
      where("status", "in", ["accepted", "rejected"]),
      orderBy("reviewCompletedAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const questions = [];

    querySnapshot.forEach((doc) => {
      questions.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    logger.log(
      `📊 [ReviewerAnalytics] Found ${questions.length} reviewed questions`
    );
    return questions;
  } catch (error) {
    // Handle permission errors gracefully - user may not be admin
    if (
      error.code === "permission-denied" ||
      error.message?.includes("insufficient permissions")
    ) {
      logger.warn(
        "User does not have permission to access reviewer analytics. Admin access required."
      );
      return []; // Return empty array instead of throwing
    }

    // Handle index errors - reviewCompletedAt index might not exist
    if (error.message?.includes("index")) {
      logger.warn(
        "Firestore index required for reviewCompletedAt query. Falling back to simple query."
      );
      // Fallback: Query without ordering by reviewCompletedAt
      try {
        const questionsRef = collection(getDb(), "questions");
        const fallbackQuery = query(
          questionsRef,
          where("status", "in", ["accepted", "rejected"])
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackQuestions = [];
        fallbackSnapshot.forEach((doc) => {
          fallbackQuestions.push({ id: doc.id, ...doc.data() });
        });
        logger.log(
          `📊 [ReviewerAnalytics] Fallback found ${fallbackQuestions.length} reviewed questions`
        );
        return fallbackQuestions;
      } catch (fallbackError) {
        logger.error("Fallback query also failed:", fallbackError);
        return [];
      }
    }

    logger.error("Error fetching reviewed questions:", error);
    throw error;
  }
};

/**
 * Aggregates reviewer activity metrics from question data
 * @param {Array} questions - Array of question objects
 * @returns {Array} Array of reviewer stats objects
 */
export const aggregateReviewerStats = (questions) => {
  const reviewerMap = new Map();

  /**
   * Normalize reviewer name - fix duplicated names like "Sam DeiterSam Deiter"
   */
  const normalizeReviewerName = (name) => {
    if (!name || typeof name !== "string") return "Unknown";
    const trimmed = name.trim();

    // Detect and fix duplicated names: "NameName" or "Name Name" (exact duplicate)
    const halfLen = Math.floor(trimmed.length / 2);
    const firstHalf = trimmed.substring(0, halfLen);
    const secondHalf = trimmed.substring(halfLen);

    if (firstHalf === secondHalf && firstHalf.length > 0) {
      logger.log(`🔧 Fixed duplicated name: "${trimmed}" -> "${firstHalf}"`);
      return firstHalf;
    }

    return trimmed;
  };

  questions.forEach((q) => {
    // Use reviewerName, acceptedBy name, or email as fallback for reviewer identification
    const rawName =
      q.reviewerName ||
      q.acceptedBy ||
      q.creatorEmail ||
      q.creatorName ||
      "Unknown";

    const reviewerName = normalizeReviewerName(rawName);

    if (!reviewerMap.has(reviewerName)) {
      reviewerMap.set(reviewerName, {
        name: reviewerName,
        totalQuestionsReviewed: 0,
        totalReviewTimeSeconds: 0,
        reviewDurations: [], // Track individual durations for avg calculation
        acceptedCount: 0,
        rejectedCount: 0,
        rejectionReasons: {}, // Track rejection reasons
        firstReviewDate: null,
        lastReviewDate: null,
      });
    }

    const stats = reviewerMap.get(reviewerName);

    // Increment question count
    stats.totalQuestionsReviewed += 1;

    // Track acceptance/rejection
    if (q.status === "accepted") {
      stats.acceptedCount += 1;
    } else if (q.status === "rejected") {
      stats.rejectedCount += 1;
      // Track rejection reason
      const reason = q.rejectionReason || "other";
      stats.rejectionReasons[reason] =
        (stats.rejectionReasons[reason] || 0) + 1;
    }

    // Add review duration if available (with HARDENED validation)
    if (q.reviewDuration && q.reviewDuration > 0) {
      let durationSeconds = q.reviewDuration;

      // HARDENING: Detect if value is likely in milliseconds instead of seconds
      // A review taking > 1 hour (3600s) is suspicious; if > 100000 it's likely ms
      if (durationSeconds > 100000) {
        // Likely stored in milliseconds - convert to seconds
        durationSeconds = Math.round(durationSeconds / 1000);
        logger.log(
          `⚠️ Converted likely millisecond duration for ${reviewerName}: ${q.reviewDuration} -> ${durationSeconds}s`
        );
      }

      // HARDENING: Cap at reasonable maximum (1 hour = 3600 seconds per question)
      // Reviews taking longer than 1 hour are likely stale/abandoned sessions
      const MAX_REVIEW_SECONDS = 3600; // 1 hour
      if (durationSeconds > MAX_REVIEW_SECONDS) {
        logger.log(
          `⚠️ Capping excessive duration for ${reviewerName}: ${durationSeconds}s -> ${MAX_REVIEW_SECONDS}s`
        );
        durationSeconds = MAX_REVIEW_SECONDS;
      }

      // HARDENING: Skip durations less than 1 second (likely bogus data)
      if (durationSeconds >= 1) {
        stats.totalReviewTimeSeconds += durationSeconds;
        stats.reviewDurations.push(durationSeconds);
      }
    }

    // Track date range
    const reviewDate = q.reviewCompletedAt || q.acceptedAt;
    if (reviewDate) {
      const date = new Date(reviewDate);
      if (!stats.firstReviewDate || date < stats.firstReviewDate) {
        stats.firstReviewDate = date;
      }
      if (!stats.lastReviewDate || date > stats.lastReviewDate) {
        stats.lastReviewDate = date;
      }
    }
  });

  // Convert Map to array and calculate averages
  const reviewerStats = Array.from(reviewerMap.values()).map((stats) => ({
    ...stats,
    averageReviewTimeSeconds:
      stats.reviewDurations.length > 0
        ? Math.round(
            stats.reviewDurations.reduce((sum, d) => sum + d, 0) /
              stats.reviewDurations.length
          )
        : 0,
    // Calculate review velocity (questions per day)
    reviewVelocity:
      stats.firstReviewDate && stats.lastReviewDate
        ? calculateVelocity(
            stats.totalQuestionsReviewed,
            stats.firstReviewDate,
            stats.lastReviewDate
          )
        : 0,
  }));

  // Sort by total questions reviewed (descending)
  return reviewerStats.sort(
    (a, b) => b.totalQuestionsReviewed - a.totalQuestionsReviewed
  );
};

/**
 * Calculate review velocity (questions per day)
 * @param {number} totalQuestions - Total questions reviewed
 * @param {Date} startDate - First review date
 * @param {Date} endDate - Last review date
 * @returns {number} Questions per day
 */
const calculateVelocity = (totalQuestions, startDate, endDate) => {
  const daysDiff = Math.max(
    1,
    Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
  );
  return (totalQuestions / daysDiff).toFixed(2);
};

/**
 * Format duration in seconds to human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "2m 30s", "1h 15m")
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return "--";

  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
};

/**
 * Format date to readable string
 * @param {Date|string} dateVal - Date value
 * @returns {string} Formatted date
 */
export const formatDate = (dateVal) => {
  if (!dateVal) return "N/A";
  try {
    const date = dateVal instanceof Date ? dateVal : new Date(dateVal);
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString();
  } catch (e) {
    logger.error("Date formatting error:", e);
    return "Invalid Date";
  }
};

/**
 * Main function to fetch and aggregate reviewer analytics
 * @returns {Promise<Object>} Analytics data with reviewer stats and metadata
 */
export const getReviewerAnalytics = async () => {
  try {
    const reviewedQuestions = await fetchReviewedQuestions();
    const reviewerStats = aggregateReviewerStats(reviewedQuestions);

    // Aggregate overall rejection reasons
    const overallRejectionReasons = {};
    reviewerStats.forEach((stats) => {
      Object.entries(stats.rejectionReasons || {}).forEach(
        ([reason, count]) => {
          overallRejectionReasons[reason] =
            (overallRejectionReasons[reason] || 0) + count;
        }
      );
    });

    return {
      reviewerStats,
      metadata: {
        totalQuestionsReviewed: reviewedQuestions.length,
        totalReviewers: reviewerStats.length,
        lastUpdated: new Date().toISOString(),
        rejectionReasons: overallRejectionReasons,
      },
    };
  } catch (error) {
    // Handle permission errors gracefully
    if (
      error.code === "permission-denied" ||
      error.message?.includes("insufficient permissions")
    ) {
      logger.warn(
        "User does not have permission for reviewer analytics. Admin access required."
      );
      return {
        reviewerStats: [],
        metadata: {
          totalQuestionsReviewed: 0,
          totalReviewers: 0,
          lastUpdated: new Date().toISOString(),
          error: "Admin access required",
        },
      };
    }
    logger.error("Error getting reviewer analytics:", error);
    throw error;
  }
};
