/**
 * Question Schema Normalizer
 *
 * SINGLE SOURCE OF TRUTH for question data normalization.
 * All components should use this to ensure consistent field names.
 *
 * Handles multiple Firestore formats:
 * - Old format: { question, options: {A,B,C,D}, correct: "A" }
 * - New format: { question, choices: [...], correctAnswer: "text" }
 * - Legacy format: { questionText, choices: [...], correctAnswer: "text" }
 *
 * Output format (standardized):
 * {
 *   id: string,
 *   question: string,
 *   type: string,
 *   difficulty: string,
 *   discipline: string,
 *   choices: string[],
 *   correctAnswer: string,
 *   status: string,
 *   language: string,
 *   // ...other fields preserved
 * }
 */

/**
 * Normalize a single question to the standard format
 * @param {Object} rawQuestion - Question in any supported format
 * @returns {Object} Normalized question with consistent field names
 */
export function normalizeQuestion(rawQuestion) {
  if (!rawQuestion || typeof rawQuestion !== "object") {
    return null;
  }

  // Extract question text (handles both field names)
  const questionText = rawQuestion.question || rawQuestion.questionText || "";

  // Extract choices and correct answer (handles both formats)
  let choices = [];
  let correctAnswer = "";

  if (rawQuestion.choices && Array.isArray(rawQuestion.choices)) {
    // New format: choices is already an array
    choices = rawQuestion.choices.filter((c) => c && c.trim());
    correctAnswer = rawQuestion.correctAnswer || "";
  } else if (rawQuestion.options && typeof rawQuestion.options === "object") {
    // Old format: options is {A: "...", B: "...", C: "...", D: "..."}
    const optionKeys = ["A", "B", "C", "D"];
    choices = optionKeys
      .map((key) => rawQuestion.options[key])
      .filter((opt) => opt && opt.trim());

    // Convert letter to actual text
    if (rawQuestion.correct && rawQuestion.options[rawQuestion.correct]) {
      correctAnswer = rawQuestion.options[rawQuestion.correct];
    }
  }

  // Build normalized question
  return {
    // Identity
    id: rawQuestion.id || rawQuestion.guid || rawQuestion.uniqueId || null,
    guid: rawQuestion.guid || rawQuestion.id || null,

    // Content (standardized field names)
    question: questionText,
    type: rawQuestion.type || "Multiple Choice",
    difficulty: rawQuestion.difficulty || "Medium",
    discipline: rawQuestion.discipline || "",
    choices: choices,
    correctAnswer: correctAnswer,

    // Metadata
    status: rawQuestion.status || "pending",
    language: rawQuestion.language || "English",

    // Reviewer fields (if present)
    reviewerNotes: rawQuestion.reviewerNotes || null,
    reviewedAt: rawQuestion.reviewedAt || null,
    reviewedBy: rawQuestion.reviewedBy || null,

    // Preserve original for debugging
    _originalFormat: rawQuestion.options ? "options" : "choices",
    _raw: rawQuestion,
  };
}

/**
 * Normalize an array of questions
 * @param {Array} rawQuestions - Array of questions in any format
 * @returns {Array} Array of normalized questions
 */
export function normalizeQuestions(rawQuestions) {
  if (!Array.isArray(rawQuestions)) {
    return [];
  }

  return rawQuestions.map(normalizeQuestion).filter((q) => q !== null);
}

/**
 * Validate a normalized question has required fields
 * @param {Object} question - Normalized question
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateNormalizedQuestion(question) {
  const errors = [];

  if (!question) {
    return { valid: false, errors: ["Question is null or undefined"] };
  }

  if (!question.question || question.question.trim() === "") {
    errors.push("Missing question text");
  }

  if (!question.choices || question.choices.length < 2) {
    errors.push("Must have at least 2 choices");
  }

  if (!question.correctAnswer) {
    errors.push("Missing correct answer");
  }

  if (
    question.choices &&
    question.correctAnswer &&
    !question.choices.includes(question.correctAnswer)
  ) {
    errors.push("Correct answer not found in choices");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate an array of normalized questions
 * @param {Array} questions - Array of normalized questions
 * @returns {Object} { valid: boolean, errors: string[], validCount: number, invalidCount: number }
 */
export function validateNormalizedQuestions(questions) {
  const allErrors = [];
  let validCount = 0;
  let invalidCount = 0;

  questions.forEach((q, index) => {
    const result = validateNormalizedQuestion(q);
    if (result.valid) {
      validCount++;
    } else {
      invalidCount++;
      result.errors.forEach((err) => {
        allErrors.push(`Question ${index + 1}: ${err}`);
      });
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    validCount,
    invalidCount,
    total: questions.length,
  };
}

/**
 * Check if a raw question uses the old format
 * @param {Object} rawQuestion - Raw question from Firestore
 * @returns {boolean} True if using old format (options/correct)
 */
export function isOldFormat(rawQuestion) {
  return (
    rawQuestion &&
    rawQuestion.options &&
    typeof rawQuestion.options === "object" &&
    !Array.isArray(rawQuestion.options)
  );
}

/**
 * Check if a raw question uses the new format
 * @param {Object} rawQuestion - Raw question from Firestore
 * @returns {boolean} True if using new format (choices/correctAnswer)
 */
export function isNewFormat(rawQuestion) {
  return (
    rawQuestion && rawQuestion.choices && Array.isArray(rawQuestion.choices)
  );
}
