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
export const VALID_ANSWER_KEYS = ["A", "B", "C", "D"];

/**
 * Check if a question is a True/False type.
 * @param {Object} q - Question object
 * @returns {boolean} True if T/F question
 */
export const isTrueFalseQuestion = (q) =>
  q.type === "True/False" || q.type === "T/F";

/**
 * Normalize a correct answer value to a standard key.
 * Handles "TRUE"/"FALSE" → "A"/"B" conversion.
 *
 * @param {string} value - Raw correct answer value
 * @returns {string|null} Normalized answer key or null if invalid
 */
export const normalizeAnswerKey = (value) => {
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
    const optA = (q.options.A || "").toLowerCase().trim();
    const optB = (q.options.B || "").toLowerCase().trim();

    // Check explicit marking via correctAnswerText
    if (q.correctAnswerText) {
      const txt = q.correctAnswerText.toLowerCase().trim();
      if (txt === "true" && optA === "true") return "A";
      if (txt === "false" && optB === "false") return "B";
    }

    // Standard T/F layout - default to A (True) as conservative fallback
    if (
      (optA === "true" || optA === "true.") &&
      (optB === "false" || optB === "false.")
    ) {
      logger.warn(
        `[inferCorrectAnswer] T/F question missing 'correct' - defaulting to 'A' (True). Question ID: ${q.id || q.uniqueId}`
      );
      return "A";
    }
  }

  // 3. For MC questions with options but missing correct, default to 'A'
  if (q.options && (q.options.A || q.options.B)) {
    logger.warn(
      `[inferCorrectAnswer] Question missing 'correct' - defaulting to 'A'. Question ID: ${q.id || q.uniqueId}`
    );
    return "A";
  }

  // 4. Truly unrecoverable
  return null;
};

/**
 * Check if a question has a valid correct answer.
 * @param {Object} q - Question object
 * @returns {boolean} True if correct answer is valid or inferable
 */
export const hasValidCorrectAnswer = (q) => inferCorrectAnswer(q) !== null;
