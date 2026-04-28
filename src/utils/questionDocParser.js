/**
 * Question Document Parser
 *
 * Defensive parsing to prevent malformed Firestore documents from crashing the UI.
 * This validates document structure (not content quality like questionValidator.js).
 *
 * Use this at the query boundary to sanitize Firestore results before they reach
 * React components.
 *
 * @module utils/questionDocParser
 */
import { logger } from "./logger";

/** @constant {Object} QUESTION_DOC_LIMITS - Validation limits for document fields */
const QUESTION_DOC_LIMITS = {
  QUESTION_MAX_LENGTH: 2000,
  ANSWER_MAX_COUNT: 10,
  ANSWER_MAX_LENGTH: 500,
  EXPLANATION_MAX_LENGTH: 5000,
};

/** @constant {string[]} VALID_STATUSES - Valid question status values */
const VALID_STATUSES = ["pending", "accepted", "rejected", "deleted"];

/** @constant {string[]} VALID_DIFFICULTIES - Valid difficulty levels */
const VALID_DIFFICULTIES = ["easy", "medium", "hard"];

/** @constant {string[]} KNOWN_FIELDS - Fields handled by normalization */
const KNOWN_FIELDS = [
  "id",
  "uniqueId",
  "question",
  "creatorId",
  "creatorEmail",
  "creatorName",
  "answers",
  "correctIndex",
  "status",
  "discipline",
  "difficulty",
  "explanation",
  "version",
  "language",
  "firestoreUpdatedAt",
];

/**
 * Normalizes language names to standard values used in constants.js
 * Handles legacy values like "Chinese" -> "Chinese (Simplified)"
 *
 * @param {string} lang - Raw language string
 * @returns {string} - Normalized language name
 */
const normalizeLanguageName = (lang) => {
  if (!lang || typeof lang !== "string") return "English";
  const trimmed = lang.trim();

  // Map legacy/shorthand names to standard keys in LANGUAGE_FLAGS
  if (trimmed === "Chinese") return "Chinese (Simplified)";
  if (trimmed === "Simplified Chinese") return "Chinese (Simplified)";

  return trimmed;
};

/**
 * Validate document structure and normalize with safe defaults.
 * Returns validation result with normalized question or null for invalid docs.
 *
 * @param {Object} raw - Raw document data from Firestore
 * @returns {{ valid: boolean, errors: string[], question: Object|null }}
 */
export const parseQuestionDoc = (raw) => {
  const errors = [];

  // Required fields check
  if (!raw.uniqueId && !raw.id) {
    errors.push("Missing uniqueId/id");
  }
  if (!raw.question || typeof raw.question !== "string") {
    errors.push("Missing or invalid question text");
  }
  // creatorId is strictly required for English base questions,
  // but we allow variants to fallback to 'system' if missing to avoid UI grayscale flags.
  const isTranslation = raw.language && raw.language !== "English";
  if (!raw.creatorId || typeof raw.creatorId !== "string") {
    if (!isTranslation) {
      errors.push("Missing creatorId on base question");
    } else {
      logger.warn(
        `Translation variant ${raw.id} missing creatorId, using fallback.`
      );
    }
  }

  // If critical fields missing, reject entirely
  if (errors.length > 0) {
    const questionId = raw.uniqueId || raw.id || "unknown";
    logger.warn(`Invalid question doc ${questionId}:`, errors);
    return { valid: false, errors, question: null };
  }

  // Normalize with safe defaults
  const normalized = {
    id: raw.id || raw.uniqueId,
    uniqueId: raw.uniqueId || raw.id,
    question: (raw.question || "")
      .trim()
      .slice(0, QUESTION_DOC_LIMITS.QUESTION_MAX_LENGTH),
    creatorId: raw.creatorId || "system-translation",
    creatorEmail: raw.creatorEmail || "",
    creatorName: raw.creatorName || "",
    answers: Array.isArray(raw.answers)
      ? raw.answers.slice(0, QUESTION_DOC_LIMITS.ANSWER_MAX_COUNT)
      : [],
    correctIndex:
      typeof raw.correctIndex === "number" && raw.correctIndex >= 0
        ? raw.correctIndex
        : 0,
    status: VALID_STATUSES.includes(raw.status) ? raw.status : "pending",
    discipline: raw.discipline || "Unknown",
    difficulty: VALID_DIFFICULTIES.includes(raw.difficulty)
      ? raw.difficulty
      : "medium",
    explanation: raw.explanation || null,
    version: raw.version || 1,
    language: normalizeLanguageName(raw.language || "English"),
    firestoreUpdatedAt: raw.firestoreUpdatedAt || null,

    // Pass through other fields not in KNOWN_FIELDS
    ...Object.fromEntries(
      Object.entries(raw).filter(([key]) => !KNOWN_FIELDS.includes(key))
    ),
  };

  return { valid: true, errors: [], question: normalized };
};

/**
 * Safe accessor for question text - never throws.
 *
 * @param {Object} question - Question object
 * @param {number} maxLength - Maximum length before truncation (default 100)
 * @returns {string} - Question text or placeholder
 */
// eslint-disable-next-line no-unused-vars
const getQuestionText = (question, maxLength = 100) => {
  if (!question?.question) return "[No question text]";
  return question.question.length > maxLength
    ? question.question.slice(0, maxLength) + "..."
    : question.question;
};

/**
 * Check if a question has all required fields for display.
 *
 * @param {Object} question - Question object
 * @returns {boolean} - True if displayable
 */
// eslint-disable-next-line no-unused-vars
const isDisplayable = (question) => {
  return Boolean(
    question &&
    (question.id || question.uniqueId) &&
    question.question &&
    question.creatorId
  );
};
