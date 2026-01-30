/**
 * reviewerAnalytics.js - Reviewer Activity Analytics
 *
 * Provides functions to aggregate and analyze reviewer performance metrics
 * from Firestore question data.
 */

import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { getDb } from "../services/firebase";
import { logger } from "../utils/logger";
import { logError } from "../utils/AppError";
import { normalizeReviewerName } from "./normalizeReviewerName";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Duration threshold in seconds - values above this are likely stored in milliseconds */
const LIKELY_MILLISECONDS_THRESHOLD = 100000;

/** Milliseconds to seconds conversion factor */
const MS_TO_SECONDS = 1000;

/** Maximum reasonable review duration (1 hour) - longer durations are capped */
const MAX_REVIEW_SECONDS = 3600;

/** Seconds per minute */
const SECONDS_PER_MINUTE = 60;

/** Seconds per hour */
const SECONDS_PER_HOUR = 3600;

/** Hours per day */
const HOURS_PER_DAY = 24;

/** Milliseconds per day (used for velocity calculation) */
const MS_PER_DAY =
  MS_TO_SECONDS * SECONDS_PER_MINUTE * SECONDS_PER_MINUTE * HOURS_PER_DAY;

/** Number of decimal places for velocity calculation */
const VELOCITY_DECIMAL_PLACES = 2;

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
        logError(fallbackError, {
          operation: "fetchReviewedQuestionsFallback",
        });
        return [];
      }
    }

    logError(error, { operation: "fetchReviewedQuestions" });
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
   * Process and validate review duration, handling unit conversion and capping
   * @param {Object} q - Question object
   * @param {string} reviewerName - Normalized reviewer name
   * @returns {number|null} Valid duration in seconds, or null if invalid
   */
  const processReviewDuration = (q, reviewerName) => {
    if (!q.reviewDuration || q.reviewDuration <= 0) return null;

    let durationSeconds = q.reviewDuration;

    // HARDENING: Detect if value is likely in milliseconds instead of seconds
    if (durationSeconds > LIKELY_MILLISECONDS_THRESHOLD) {
      durationSeconds = Math.round(durationSeconds / MS_TO_SECONDS);
      logger.log(
        `⚠️ Converted likely millisecond duration for ${reviewerName}: ${q.reviewDuration} -> ${durationSeconds}s`
      );
    }

    // HARDENING: Cap at reasonable maximum (1 hour per question)
    if (durationSeconds > MAX_REVIEW_SECONDS) {
      logger.log(
        `⚠️ Capping excessive duration for ${reviewerName}: ${durationSeconds}s -> ${MAX_REVIEW_SECONDS}s`
      );
      durationSeconds = MAX_REVIEW_SECONDS;
    }

    // Skip durations less than 1 second (likely bogus data)
    return durationSeconds >= 1 ? durationSeconds : null;
  };

  /** Update date range tracking for a reviewer */
  const updateDateRange = (stats, q) => {
    const reviewDate = q.reviewCompletedAt || q.acceptedAt;
    if (!reviewDate) return;
    const date = new Date(reviewDate);
    if (!stats.firstReviewDate || date < stats.firstReviewDate)
      stats.firstReviewDate = date;
    if (!stats.lastReviewDate || date > stats.lastReviewDate)
      stats.lastReviewDate = date;
  };
  questions.forEach((q) => {
    // Use shared normalizer that maps emails to display names
    // NOTE: Deliberately NOT using creatorEmail/creatorName - we only want to count
    // actual review actions, not question creation (fixes analytics discrepancy)
    const rawName = q.reviewerName || q.acceptedBy;

    // Skip questions that don't have a reviewer assigned
    if (!rawName) return;

    // Use imported normalizer (handles email->name mapping and duplicate name fixing)
    const reviewerName = normalizeReviewerName(rawName) || "Unknown";

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

    // Add review duration if available (using extracted helper for validation)
    const validDuration = processReviewDuration(q, reviewerName);
    if (validDuration !== null) {
      stats.totalReviewTimeSeconds += validDuration;
      stats.reviewDurations.push(validDuration);
    }

    // Track date range using extracted helper
    updateDateRange(stats, q);
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
 * Calculates a specific reviewer's average critique score
 * @param {string} reviewerName - Name/Email of the reviewer
 * @param {Array} questions - Array of all questions
 * @returns {Object} Object with averageScore and totalScored count
 */
export const calculateReviewerAverageScore = (reviewerName, questions) => {
  if (!reviewerName || !questions || questions.length === 0) {
    return { averageScore: null, totalScored: 0 };
  }

  const reviewerQuestions = questions.filter((q) => {
    const name =
      q.reviewerName ||
      q.acceptedBy ||
      q.creatorEmail ||
      q.creatorName ||
      "Unknown";
    return (
      name === reviewerName &&
      q.critiqueScore !== undefined &&
      q.critiqueScore !== null
    );
  });

  if (reviewerQuestions.length === 0) {
    return { averageScore: null, totalScored: 0 };
  }

  const totalScore = reviewerQuestions.reduce(
    (sum, q) => sum + q.critiqueScore,
    0
  );
  const averageScore = Math.round(totalScore / reviewerQuestions.length);

  return {
    averageScore,
    totalScored: reviewerQuestions.length,
  };
};

/**
 * Calculate review velocity (questions per day)
 * @param {number} totalQuestions - Total questions reviewed
 * @param {Date} startDate - First review date
 * @param {Date} endDate - Last review date
 * @returns {number} Questions per day
 */
const calculateVelocity = (totalQuestions, startDate, endDate) => {
  const daysDiff = Math.max(1, Math.ceil((endDate - startDate) / MS_PER_DAY));
  return (totalQuestions / daysDiff).toFixed(VELOCITY_DECIMAL_PLACES);
};

/**
 * Format duration in seconds to human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "2m 30s", "1h 15m")
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return "--";

  if (seconds < SECONDS_PER_MINUTE) {
    return `${seconds}s`;
  } else if (seconds < SECONDS_PER_HOUR) {
    const mins = Math.floor(seconds / SECONDS_PER_MINUTE);
    const secs = seconds % SECONDS_PER_MINUTE;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  } else {
    const hours = Math.floor(seconds / SECONDS_PER_HOUR);
    const mins = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
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
    logError(e, { operation: "formatDate", dateVal: String(dateVal) });
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
    logError(error, { operation: "getReviewerAnalytics" });
    throw error;
  }
};
