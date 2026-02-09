/**
 * Answer Helper Utilities
 *
 * Utility functions for handling question answer normalization,
 * validation, and inference.
 *
 * @module utils/answerHelpers
 */

import { logger } from "./logger";

/**
 * Valid answer keys for multiple choice questions.
 */
const VALID_ANSWER_KEYS = ["A", "B", "C", "D"];

/**
 * Check if a question is a True/False type.
 * @param {Object} q - Question object
 * @returns {boolean} True if T/F question
 */
const isTrueFalseQuestion = (q) => q.type === "True/False" || q.type === "T/F";

/**
 * Normalize a correct answer value to a standard key.
 * Handles "TRUE"/"FALSE" → "A"/"B" conversion.
 *
 * @param {string} value - Raw correct answer value
 * @returns {string|null} Normalized answer key or null if invalid
 */
const normalizeAnswerKey = (value) => {
  if (!value || typeof value !== "string") return null;

  const normalized = value.trim().toUpperCase();

  // Handle TRUE/FALSE → A/B conversion
  if (normalized === "TRUE") return "A";
  if (normalized === "FALSE") return "B";

  // Return if valid key
  if (VALID_ANSWER_KEYS.includes(normalized)) return normalized;

  return null;
};

/**
 * Check if options represent a standard T/F layout (A=True, B=False).
 * @param {Object} options - Question options object
 * @returns {boolean} True if standard T/F layout
 */
const isStandardTFLayout = (options) => {
  if (!options) return false;
  const optA = (options.A || "").toLowerCase().trim();
  const optB = (options.B || "").toLowerCase().trim();
  return (
    (optA === "true" || optA === "true.") &&
    (optB === "false" || optB === "false.")
  );
};

/**
 * Try to infer T/F answer from correctAnswerText field.
 * @param {Object} q - Question object
 * @returns {string|null} "A" or "B" if inferable, null otherwise
 */
const inferFromCorrectAnswerText = (q) => {
  if (!q.correctAnswerText || !q.options) return null;

  const txt = q.correctAnswerText.toLowerCase().trim();
  const optA = (q.options.A || "").toLowerCase().trim();
  const optB = (q.options.B || "").toLowerCase().trim();

  if (txt === "true" && optA === "true") return "A";
  if (txt === "false" && optB === "false") return "B";

  return null;
};

/**
 * Log warning and return default answer for missing correct field.
 * @param {Object} q - Question object
 * @param {string} context - Context description for log
 * @returns {string} Default answer "A"
 */
const returnDefaultWithWarning = (q, context) => {
  logger.warn(
    `[inferCorrectAnswer] ${context} - defaulting to 'A'. Question ID: ${q.id || q.uniqueId}`
  );
  return "A";
};

/**
 * Safely infer the correct answer from a question object.
 * Handles cases where 'correct' is missing, empty, or malformed.
 *
 * @param {Object} q - Question object
 * @returns {string|null} The correct answer key (A, B, C, D) or null if unrecoverable
 */
export const inferCorrectAnswer = (q) => {
  // 1. Try to normalize existing correct value
  const normalized = normalizeAnswerKey(q.correct);
  if (normalized) return normalized;

  // 2. For T/F questions, try to infer from options
  if (isTrueFalseQuestion(q) && q.options) {
    // Check explicit marking via correctAnswerText
    const fromText = inferFromCorrectAnswerText(q);
    if (fromText) return fromText;

    // Standard T/F layout - default to A (True) as conservative fallback
    if (isStandardTFLayout(q.options)) {
      return returnDefaultWithWarning(q, "T/F question missing 'correct'");
    }
  }

  // 3. For MC questions with options but missing correct, default to 'A'
  if (q.options && (q.options.A || q.options.B)) {
    return returnDefaultWithWarning(q, "Question missing 'correct'");
  }

  // 4. Truly unrecoverable
  return null;
};

/**
 * Check if a question has a valid correct answer.
 * @param {Object} q - Question object
 * @returns {boolean} True if correct answer is valid or inferable
 */
const hasValidCorrectAnswer = (q) => inferCorrectAnswer(q) !== null;
