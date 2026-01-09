import { logger } from "../utils/logger";
/**
 * normalizeQuestion.js - Ensures all questions have consistent data fields
 *
 * This utility normalizes question objects to have all required fields with
 * proper defaults, preventing issues with filtering, display, and analytics.
 *
 * NOTE: Uses Math.random for UUID fallback (non-security).
 * Regex patterns are for text normalization - input is app-controlled.
 */
/* eslint-disable sonarjs/pseudo-random, sonarjs/slow-regex */

/**
 * Generate a UUID, with fallback for environments where crypto.randomUUID isn't available
 * NOTE: Math.random fallback is acceptable for unique IDs, not security.
 */
const generateUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 implementation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    // eslint-disable-next-line sonarjs/pseudo-random
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Required question schema with default values
 */
const QUESTION_DEFAULTS = {
  // Identity - both id and uniqueId should be the same string (UUID)
  // This ensures consistency when questions are saved to Firestore
  id: () => generateUUID(),
  uniqueId: () => generateUUID(),

  // Content
  discipline: "General",
  difficulty: "Easy",
  type: "Multiple Choice",
  question: "",
  options: { A: "", B: "", C: "", D: "" },
  correct: "A",

  // Metadata
  status: "pending",
  language: "English",
  creatorName: "Unknown",
  timestamp: () => new Date().toISOString(),

  // Optional fields
  sourceUrl: "",
  sourceExcerpt: "",
  tags: [],

  // Review tracking
  reviewStartedAt: null,
  reviewDuration: null,
  reviewerName: null,
};

/**
 * Normalizes a question object to ensure all required fields are present.
 * Fills missing fields with defaults while preserving existing values.
 *
 * @param {Object} q - The question object to normalize
 * @param {Object} contextDefaults - Optional context-specific defaults (e.g., from config)
 * @returns {Object} Normalized question object
 *
 * @example
 * // Basic usage
 * const normalized = normalizeQuestion({ question: "What is UE5?" });
 *
 * @example
 * // With context defaults from config
 * const normalized = normalizeQuestion(parsedQ, {
 *   discipline: config.discipline,
 *   creatorName: config.creatorName,
 *   language: config.language
 * });
 */
export const normalizeQuestion = (q, contextDefaults = {}) => {
  if (!q || typeof q !== "object") {
    logger.warn("normalizeQuestion received invalid input:", q);
    return null;
  }

  const mergedDefaults = { ...QUESTION_DEFAULTS, ...contextDefaults };

  const getValue = (key, existingValue) => {
    // If value already exists and is not empty/null, keep it
    if (
      existingValue !== undefined &&
      existingValue !== null &&
      existingValue !== ""
    ) {
      return existingValue;
    }

    // Get default value
    const defaultValue = mergedDefaults[key];

    // If default is a function, call it to get dynamic value
    if (typeof defaultValue === "function") {
      return defaultValue();
    }

    return defaultValue;
  };

  // Handle timestamp/dateAdded normalization
  const timestamp = q.timestamp || q.dateAdded || getValue("timestamp");

  // CRITICAL: id and uniqueId MUST be the same value
  // - When loaded from Firestore: id = docSnapshot.id = uniqueId
  // - When created locally: both should use the same generated UUID
  // - If question has uniqueId but no id (or vice versa), unify them
  const existingUniqueId =
    q.uniqueId && typeof q.uniqueId === "string" ? q.uniqueId : null;
  const existingId = q.id && typeof q.id === "string" ? q.id : null;
  const resolvedId = existingUniqueId || existingId || generateUUID();

  return {
    // Identity - id and uniqueId are always the same value
    id: resolvedId,
    uniqueId: resolvedId,

    // Content
    discipline: getValue("discipline", q.discipline),
    difficulty: getValue("difficulty", q.difficulty),
    type: getValue("type", q.type),
    question: q.question || "",
    options: q.options || { A: "", B: "", C: "", D: "" },
    correct: q.correct || "A",

    // Metadata - Core
    status: getValue("status", q.status),
    language: getValue("language", q.language),
    creatorName: getValue("creatorName", q.creatorName),
    timestamp,
    dateAdded: timestamp, // Alias for backward compatibility
    created: timestamp, // Alias for analytics filtering

    // Source/Documentation
    sourceUrl: q.sourceUrl || "",
    sourceExcerpt: q.sourceExcerpt || "",
    tags: Array.isArray(q.tags) ? q.tags : [],
    explanation: q.explanation || null,

    // Quality/Critique fields
    qualityScore: q.qualityScore || null,
    critique: q.critique || null,
    critiqueScore: q.critiqueScore || null,
    suggestedRewrite: q.suggestedRewrite || null,
    rewriteChanges: q.rewriteChanges || null,

    // Verification fields
    sourceVerified: q.sourceVerified || null,
    humanVerified: q.humanVerified || false,
    humanVerifiedBy: q.humanVerifiedBy || null,

    // Validation flags (from questionValidator)
    _validation: q._validation || null,
    answerMismatch: q.answerMismatch || false,
    invalidUrl: q.invalidUrl || false,

    // Rejection tracking (structured for analytics)
    rejectionReason: q.rejectionReason || null, // Primary reason code
    rejectionCategory: q.rejectionCategory || null, // Category: 'content', 'accuracy', 'duplicate', 'formatting', 'source'
    rejectionNotes: q.rejectionNotes || null, // Free-form reviewer notes
    rejectedAt: q.rejectedAt || null,
    rejectedBy: q.rejectedBy || null,

    // Duplicate detection and tracking
    isDuplicate: q.isDuplicate || false, // Flagged as duplicate
    duplicateOf: q.duplicateOf || null, // uniqueId of the original question
    similarityScore: q.similarityScore || null, // 0-1 score from deduplication
    duplicateCheckAt: q.duplicateCheckAt || null, // When was duplicate check run

    // Quality issue tracking (for reviewer tools)
    qualityIssues: q.qualityIssues || [], // Array of issue codes: ['unclear', 'too_easy', 'wrong_source', etc]
    flaggedForReview: q.flaggedForReview || false,
    flaggedReason: q.flaggedReason || null,
    flaggedAt: q.flaggedAt || null,
    flaggedBy: q.flaggedBy || null,

    // Review tracking
    reviewStartedAt: q.reviewStartedAt || null,
    reviewDuration: q.reviewDuration || null,
    reviewerName: q.reviewerName || null,
    reviewCompletedAt: q.reviewCompletedAt || null,

    // Generation metadata (cost tracking, performance)
    estimatedCost: q.estimatedCost || null,
    generationTime: q.generationTime || null,
    model: q.model || "gemini-2.0-flash",
    groundingSources: q.groundingSources || null,

    // Variations/Conversion tracking
    variations: q.variations || null,
    originalMC: q.originalMC || null, // Original MC question if converted to T/F

    // Creator tracking for multi-user support
    creatorId: q.creatorId || null,
    creatorEmail: q.creatorEmail || null,

    // Firestore sync
    firestoreUpdatedAt: q.firestoreUpdatedAt || null,

    // ═══════════════════════════════════════════════════════════════
    // ANALYTICS FIELDS - For comprehensive tracking and reporting
    // ═══════════════════════════════════════════════════════════════

    // Batch/Session tracking
    batchId: q.batchId || null, // ID of generation batch this question came from
    sessionId: q.sessionId || null, // User session ID when generated
    generationIndex: q.generationIndex || null, // Order within the batch (0, 1, 2...)

    // Edit/Revision tracking
    editCount: q.editCount || 0, // How many times the question text was edited
    lastEditedAt: q.lastEditedAt || null, // When was it last edited
    lastEditedBy: q.lastEditedBy || null, // Who last edited it
    editHistory: q.editHistory || [], // Array of { editedAt, editedBy, previousText }

    // View/Interaction tracking
    viewCount: q.viewCount || 0, // How many times viewed in review mode
    firstViewedAt: q.firstViewedAt || null, // First time viewed in review
    lastViewedAt: q.lastViewedAt || null, // Most recent view

    // Acceptance workflow timestamps
    acceptedAt: q.acceptedAt || null, // When accepted
    acceptedBy: q.acceptedBy || null, // Who accepted
    kickedBackAt: q.kickedBackAt || null, // If kicked back from database to review
    kickedBackBy: q.kickedBackBy || null, // Who kicked it back
    kickedBackReason: q.kickedBackReason || null, // Why it was kicked back

    // Rewrite tracking
    wasRewritten: q.wasRewritten || false, // Did user apply a suggested rewrite?
    rewriteAppliedAt: q.rewriteAppliedAt || null,
    originalQuestionText: q.originalQuestionText || null, // Text before rewrite

    // Export tracking
    exportedAt: q.exportedAt || null, // Last export timestamp
    exportedTo: q.exportedTo || null, // Where exported (sheets, csv, scorm)
    exportCount: q.exportCount || 0, // How many times exported

    // Preserve any additional fields from source not explicitly handled
    ...Object.fromEntries(
      Object.entries(q).filter(
        ([key]) =>
          ![
            // Identity
            "id",
            "uniqueId",
            // Content
            "discipline",
            "difficulty",
            "type",
            "question",
            "options",
            "correct",
            // Metadata
            "status",
            "language",
            "creatorName",
            "timestamp",
            "dateAdded",
            // Source
            "sourceUrl",
            "sourceExcerpt",
            "tags",
            "explanation",
            // Quality
            "qualityScore",
            "critique",
            "critiqueScore",
            "suggestedRewrite",
            "rewriteChanges",
            // Verification
            "sourceVerified",
            "humanVerified",
            "humanVerifiedBy",
            // Validation
            "_validation",
            "answerMismatch",
            "invalidUrl",
            // Rejection (expanded)
            "rejectionReason",
            "rejectionCategory",
            "rejectionNotes",
            "rejectedAt",
            "rejectedBy",
            // Duplicate tracking
            "isDuplicate",
            "duplicateOf",
            "similarityScore",
            "duplicateCheckAt",
            // Quality issues
            "qualityIssues",
            "flaggedForReview",
            "flaggedReason",
            "flaggedAt",
            "flaggedBy",
            // Review
            "reviewStartedAt",
            "reviewDuration",
            "reviewerName",
            "reviewCompletedAt",
            // Generation
            "estimatedCost",
            "generationTime",
            "model",
            "groundingSources",
            // Variations
            "variations",
            "originalMC",
            // Creator
            "creatorId",
            "creatorEmail",
            // Firestore
            "firestoreUpdatedAt",
            // Analytics - Batch/Session
            "batchId",
            "sessionId",
            "generationIndex",
            // Analytics - Edit tracking
            "editCount",
            "lastEditedAt",
            "lastEditedBy",
            "editHistory",
            // Analytics - View tracking
            "viewCount",
            "firstViewedAt",
            "lastViewedAt",
            // Analytics - Acceptance
            "acceptedAt",
            "acceptedBy",
            "kickedBackAt",
            "kickedBackBy",
            "kickedBackReason",
            // Analytics - Rewrite
            "wasRewritten",
            "rewriteAppliedAt",
            "originalQuestionText",
            // Analytics - Export
            "exportedAt",
            "exportedTo",
            "exportCount",
          ].includes(key)
      )
    ),
  };
};

/**
 * Normalizes an array of questions
 * @param {Array} questions - Array of question objects
 * @param {Object} contextDefaults - Optional context-specific defaults
 * @returns {Array} Array of normalized questions
 */
export const normalizeQuestions = (questions, contextDefaults = {}) => {
  if (!Array.isArray(questions)) {
    logger.warn("normalizeQuestions received non-array:", questions);
    return [];
  }

  return questions
    .map((q) => normalizeQuestion(q, contextDefaults))
    .filter((q) => q !== null);
};

/**
 * Starts tracking review time for a question
 * @param {Object} question - The question being reviewed
 * @returns {Object} Question with reviewStartedAt timestamp
 */
export const startReviewTracking = (question) => {
  if (!question) return question;

  // Only set if not already started (prevents restarting on re-renders)
  if (question.reviewStartedAt) {
    return question;
  }

  return {
    ...question,
    reviewStartedAt: new Date().toISOString(),
  };
};

/**
 * Completes review tracking and calculates duration
 * @param {Object} question - The question that was reviewed
 * @param {string} reviewerName - Name of the reviewer
 * @returns {Object} Question with reviewDuration calculated (if possible) and reviewCompletedAt set
 */
export const completeReviewTracking = (question, reviewerName = null) => {
  if (!question) {
    return question;
  }

  // Calculate duration if we have a start time
  let durationSeconds = null;
  if (question.reviewStartedAt) {
    const startTime = new Date(question.reviewStartedAt).getTime();
    const endTime = Date.now();
    durationSeconds = Math.round((endTime - startTime) / 1000);
  }

  // Always set completion timestamp and reviewer name for analytics
  // Duration will be null if reviewStartedAt was missing
  return {
    ...question,
    reviewDuration: durationSeconds,
    reviewerName: reviewerName || question.reviewerName || "Unknown",
    reviewCompletedAt: new Date().toISOString(),
  };
};

/**
 * Formats review duration for display
 * @param {number} seconds - Duration in seconds
 * @returns {string} Human-readable duration string
 */
export const formatReviewDuration = (seconds) => {
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

export default normalizeQuestion;
