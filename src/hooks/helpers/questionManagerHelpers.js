import { logger } from "../../utils/logger";
/**
 * Question Manager Helpers
 * Pure utility functions extracted from useQuestionManager for testability
 */

/**
 * Finds a question by ID (or uniqueId) across multiple arrays
 * First checks allQuestionsMap by uniqueId, then falls back to questions arrays
 * @param {string} id - Question ID or uniqueId to find
 * @param {Map} allQuestionsMap - Map of uniqueId -> variants[]
 * @param {Array} questions - Current session questions
 * @param {Array} historicalQuestions - Historical questions
 * @returns {Object|null} The found question or null
 */
export const findQuestionById = (
  id,
  allQuestionsMap,
  questions,
  historicalQuestions
) => {
  // First check if id matches a uniqueId key in the map
  const variants = allQuestionsMap.get(id);
  if (variants && variants.length > 0) {
    // Return the first variant or one matching by document id
    return variants.find((v) => v.id === id) || variants[0];
  }

  // Fall back to searching by document id in arrays
  return (
    questions.find((q) => q.id === id) ||
    historicalQuestions.find((q) => q.id === id) ||
    null
  );
};

/**
 * Validates and normalizes a document ID for Firestore
 * Firestore expects string IDs, but legacy questions may have numeric IDs
 *
 * @param {Object} question - Question object
 * @returns {{ isValid: boolean, docId: string|null, error: string|null }}
 */
export const validateDocumentId = (question) => {
  let docId = question?.id || question?.uniqueId;

  // Handle legacy numeric IDs by converting to string
  if (typeof docId === "number") {
    logger.warn(`Converting numeric ID to string: ${docId}`);
    docId = String(docId);
  }

  if (!docId || typeof docId !== "string") {
    return {
      isValid: false,
      docId: null,
      error: "Question has invalid ID",
    };
  }

  return { isValid: true, docId, error: null };
};

/**
 * Checks if a question needs creator name backfill
 * @param {Object} question - Question to check
 * @returns {boolean} True if backfill is needed
 */
export const needsCreatorBackfill = (question) => {
  return (
    !question.creatorName ||
    question.creatorName === "N/A" ||
    question.creatorName === "Unknown"
  );
};

/**
 * Builds the update object for status changes
 * @param {Object} currentQuestion - Current question state
 * @param {string} newStatus - New status value
 * @param {string|null} rejectionReason - Optional rejection reason
 * @param {string|null} creatorName - Creator name for review tracking
 * @returns {Object} Updated question object
 */
export const buildStatusUpdate = (
  currentQuestion,
  newStatus,
  rejectionReason = null
) => {
  const now = new Date().toISOString();

  return {
    ...currentQuestion,
    status: newStatus,
    critique: newStatus === "accepted" ? null : currentQuestion.critique,
    rejectionReason: newStatus === "rejected" ? rejectionReason : null,
    rejectedAt: newStatus === "rejected" ? now : null,
    acceptedAt: newStatus === "accepted" ? now : currentQuestion.acceptedAt,
  };
};

/**
 * Checks if a status update represents a "hard delete"
 * @param {string} status - Status value
 * @returns {boolean} True if this is a delete operation
 */
export const isDeleteStatus = (status) => status === "deleted";

/**
 * Estimates a review start time for questions that weren't properly tracked
 * Uses 30 seconds as a reasonable estimate for review duration
 * @returns {string} ISO timestamp 30 seconds ago
 */
export const estimateReviewStartTime = () => {
  const ESTIMATED_REVIEW_SECONDS = 30;
  return new Date(Date.now() - ESTIMATED_REVIEW_SECONDS * 1000).toISOString();
};
