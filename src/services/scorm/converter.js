import { logger } from "../../utils/logger";
import { sanitizeQuestionText } from "./sanitize";

/**
 * Convert a Firestore question to SCORM quiz format
 * Handles both field naming conventions:
 * - Legacy: questionText, choices (array), correctAnswer (text)
 * - Current: question, options (object), correct (key)
 * @param {Object} question - Firestore question object
 * @returns {Object} SCORM-formatted question
 */
export function convertQuestionToScormFormat(question) {
  // Handle both field name conventions - prefer 'question' over 'questionText'
  const questionText = question.question || question.questionText || "";
  const type = question.type || "Multiple Choice";
  const difficulty = question.difficulty || "Medium";
  // Prefer 'id' over 'guid' to match test expectations
  const questionId = question.id || question.guid || question.uniqueId;

  let scormChoices = [];

  // Check if we have options object (current format) or choices array (legacy)
  if (question.options && typeof question.options === "object") {
    // Current format: options is an object like {a: "...", b: "...", c: "...", d: "..."}
    // correct is the key like "a" or "b"
    const correctKey = question.correct || question.correctAnswer;
    scormChoices = Object.entries(question.options)
      .map(([key, text]) => ({
        text: sanitizeQuestionText(text),
        correct: key === correctKey,
      }))
      .filter((choice) => choice.text && choice.text.trim() !== ""); // Filter out empty choices
  } else if (Array.isArray(question.choices)) {
    // Legacy format: choices is an array, correctAnswer is the text value
    const correctAnswer = question.correctAnswer;
    scormChoices = question.choices.map((choiceText) => ({
      text: sanitizeQuestionText(choiceText),
      correct: choiceText === correctAnswer,
    }));
  } else {
    // No valid choices - return empty array, let caller handle
    // Don't log warning for every question, just return empty
    scormChoices = [];
  }

  // CRITICAL FIX: For True/False questions, filter to ONLY True and False choices
  // This prevents malformed exports where T/F questions have 4+ choices all labeled "F"
  const isTrueFalseType = type === "True/False" || type === "T/F";
  if (isTrueFalseType && scormChoices.length > 2) {
    const originalCount = scormChoices.length; // Capture before filtering
    // Filter to only keep choices with text "True" or "False" (case-insensitive)
    const tfChoices = scormChoices.filter(
      (choice) =>
        choice.text.toLowerCase() === "true" ||
        choice.text.toLowerCase() === "false"
    );

    // If we found valid True/False choices, use them
    if (tfChoices.length === 2) {
      scormChoices = tfChoices;
      logger.info(
        `Fixed T/F question "${questionText.substring(0, 40)}..." - filtered from ${originalCount} to 2 choices`
      );
    } else if (tfChoices.length > 0) {
      // We found some but not both - log warning but use what we have
      scormChoices = tfChoices;
      logger.warn(
        `T/F question "${questionText.substring(0, 40)}..." only has ${tfChoices.length} valid T/F choice(s)`
      );
    }
    // If no True/False choices found, keep original (validation will catch this later)
  }

  // CRITICAL: Always sort True/False choices so True is first, False second.
  // This is belt-and-suspenders with game.js shuffleChoices() sorting.
  // Use trimmed, period-stripped comparison for robust matching
  const normTF = (t) => (t || "").trim().replace(/\.$/, "").toLowerCase();
  if (
    scormChoices.length === 2 &&
    scormChoices.some((c) => normTF(c.text) === "true") &&
    scormChoices.some((c) => normTF(c.text) === "false")
  ) {
    scormChoices.sort((a, b) => {
      if (normTF(a.text) === "true") return -1;
      if (normTF(b.text) === "true") return 1;
      return 0;
    });
  }

  return {
    id:
      questionId ||
      `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // eslint-disable-line sonarjs/pseudo-random -- ID is for display, not security
    text: sanitizeQuestionText(questionText),
    type: type,
    difficulty: difficulty,
    choices: scormChoices,
  };
}
