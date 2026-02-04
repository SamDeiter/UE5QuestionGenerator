/**
 * parseQuestion.js - Parses raw Firestore documents into typed question objects
 *
 * This utility is responsible for converting raw Firestore document data into
 * a consistent internal representation. It handles:
 * - Format conversion (Firestore document formats to app format)
 * - Field name normalization
 * - Explicit handling of undefined vs missing values
 *
 * IMPORTANT: This is the first step in data processing. Normalization
 * (filling defaults, validation) is done separately by normalizeQuestion.js
 *
 * @see src/utils/normalizeQuestion.js - For filling defaults and validation
 */

/**
 * Firestore document field name mappings
 * Maps alternative/legacy field names to canonical field names
 */
const FIELD_ALIASES = {
  // Question text
  questionText: "question",
  text: "question",

  // Note: correctAnswer is NOT aliased because it requires special conversion
  // (text match to letter) which is handled in choices conversion
  answer: "correct",

  // Timestamps
  dateAdded: "timestamp",
  created: "timestamp",
  createdAt: "timestamp",
};

/**
 * Converts choices array format to options object format
 * @param {Array<string>} choices - Array of answer choices
 * @param {string} correctAnswer - The correct answer text
 * @returns {{ options: Object, correct: string }}
 */
const convertChoicesToOptions = (choices, correctAnswer) => {
  const optionKeys = ["A", "B", "C", "D"];
  const options = {};

  if (!Array.isArray(choices)) {
    return { options: { A: "", B: "", C: "", D: "" }, correct: "A" };
  }

  choices.forEach((choice, index) => {
    if (optionKeys[index]) {
      options[optionKeys[index]] = choice || "";
    }
  });

  // Fill remaining options with empty strings
  optionKeys.forEach((key) => {
    if (!options[key]) {
      options[key] = "";
    }
  });

  // Find correct letter from text match
  let correct = "A";
  if (correctAnswer) {
    const correctIndex = choices.findIndex((c) => c === correctAnswer);
    if (correctIndex >= 0 && optionKeys[correctIndex]) {
      correct = optionKeys[correctIndex];
    }
  }

  return { options, correct };
};

/**
 * Parses a raw Firestore document into a typed question object.
 *
 * This function:
 * 1. Handles field name aliases (e.g., questionText -> question)
 * 2. Converts data formats (e.g., choices array -> options object)
 * 3. Extracts Firestore metadata (id from document snapshot)
 *
 * @param {Object} firestoreDoc - Raw Firestore document data
 * @param {string} [docId] - Optional document ID (from docSnapshot.id)
 * @returns {Object} Parsed question object with canonical field names
 *
 * @example
 * // From Firestore query
 * const parsed = parseQuestion(docSnapshot.data(), docSnapshot.id);
 *
 * // Then normalize for app use
 * const normalized = normalizeQuestion(parsed, contextDefaults);
 */
export const parseQuestion = (firestoreDoc, docId = null) => {
  if (!firestoreDoc || typeof firestoreDoc !== "object") {
    return null;
  }

  // Start with a copy
  const result = { ...firestoreDoc };

  // Apply field aliases
  Object.entries(FIELD_ALIASES).forEach(([alias, canonical]) => {
    if (result[alias] !== undefined && result[canonical] === undefined) {
      result[canonical] = result[alias];
      // Don't delete alias to preserve original data shape
    }
  });

  // Handle choices array -> options object conversion
  if (
    firestoreDoc.choices &&
    Array.isArray(firestoreDoc.choices) &&
    !result.options
  ) {
    const { options, correct } = convertChoicesToOptions(
      firestoreDoc.choices,
      firestoreDoc.correctAnswer || firestoreDoc.correct
    );
    result.options = options;
    // Always set correct when doing choices conversion (proper text-to-letter lookup)
    result.correct = correct;
  }

  // Handle Firestore document ID
  if (docId) {
    // Firestore doc ID takes precedence
    result.id = docId;
    // uniqueId should match id for consistency
    if (!result.uniqueId) {
      result.uniqueId = docId;
    }
  }

  // Handle Firestore Timestamp objects
  if (
    result.timestamp &&
    typeof result.timestamp === "object" &&
    result.timestamp.toDate
  ) {
    result.timestamp = result.timestamp.toDate().toISOString();
  }
  if (
    result.firestoreUpdatedAt &&
    typeof result.firestoreUpdatedAt === "object" &&
    result.firestoreUpdatedAt.toDate
  ) {
    result.firestoreUpdatedAt = result.firestoreUpdatedAt
      .toDate()
      .toISOString();
  }

  return result;
};

/**
 * Parses an array of Firestore documents
 * @param {Array} docs - Array of Firestore document data
 * @param {Function} [getDocId] - Optional function to extract doc ID from each item
 * @returns {Array} Array of parsed question objects
 */
export const parseQuestions = (docs, getDocId = null) => {
  if (!Array.isArray(docs)) {
    return [];
  }

  return docs
    .map((doc, index) => {
      const docId = getDocId ? getDocId(doc, index) : doc?.id;
      return parseQuestion(doc, docId);
    })
    .filter((q) => q !== null);
};

/**
 * Type definitions for parsed question shape (JSDoc for IDE support)
 * @typedef {Object} ParsedQuestion
 * @property {string} [id] - Document ID from Firestore
 * @property {string} [uniqueId] - Unique identifier
 * @property {string} [question] - Question text
 * @property {Object} [options] - Answer options {A, B, C, D}
 * @property {string} [correct] - Correct answer letter
 * @property {string} [discipline] - Question discipline/category
 * @property {string} [difficulty] - Difficulty level
 * @property {string} [type] - Question type (Multiple Choice, True/False)
 * @property {string} [status] - Review status
 * @property {string} [language] - Question language
 * @property {string} [timestamp] - Creation timestamp
 * @property {string} [creatorName] - Creator name
 * @property {string} [creatorId] - Creator user ID
 */

export default parseQuestion;
