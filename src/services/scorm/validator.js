import { logger } from "../../utils/logger";

/**
 * Validate questions before export
 * @param {Array} questions - Questions to validate
 * @returns {Object} Validation result
 */
export function validateQuestionsForExport(questions) {
  const errors = [];
  const warnings = [];

  if (!questions || questions.length === 0) {
    errors.push("No questions selected for export");
    return { valid: false, errors, warnings };
  }

  // Debug: Log first question structure to help diagnose field naming issues
  if (questions.length > 0) {
    const sample = questions[0];
    logger.info("Sample question structure for validation:", {
      hasQuestion: !!sample.question,
      hasQuestionText: !!sample.questionText,
      hasOptions: !!sample.options,
      optionsType: typeof sample.options,
      optionsKeys: sample.options ? Object.keys(sample.options) : null,
      hasCorrect: !!sample.correct,
      hasCorrectAnswer: !!sample.correctAnswer,
      correct: sample.correct,
      questionPreview: (sample.question || sample.questionText || "").substring(
        0,
        50
      ),
    });
  }

  if (questions.length < 5) {
    warnings.push(
      "Less than 5 questions selected. Consider adding more for a comprehensive assessment."
    );
  }

  if (questions.length > 100) {
    warnings.push(
      "More than 100 questions selected. Large packages may take longer to load in the LMS."
    );
  }

  questions.forEach((q, index) => {
    // Handle both field name conventions
    const questionText = q.questionText || q.question || "";
    const hasOptions = q.options && typeof q.options === "object";
    const hasChoices = Array.isArray(q.choices) && q.choices.length >= 2;
    const hasCorrect = q.correct || q.correctAnswer;

    if (!questionText || questionText.trim() === "") {
      errors.push(`Question ${index + 1}: Missing question text`);
    }

    if (!hasOptions && !hasChoices) {
      errors.push(`Question ${index + 1}: Must have at least 2 choices`);
    }

    if (!hasCorrect) {
      errors.push(`Question ${index + 1}: Missing correct answer`);
    }

    // For legacy format, verify correctAnswer is in choices
    if (q.choices && q.correctAnswer && !q.choices.includes(q.correctAnswer)) {
      errors.push(`Question ${index + 1}: Correct answer not found in choices`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    questionCount: questions.length,
  };
}

/**
 * Filter to questions that are exportable. Logs a warning for each rejection.
 * Mirrors the validity rules in validateQuestionsForExport but produces
 * a usable subset instead of an errors array, so callers can skip-and-ship
 * rather than block the entire export on one bad row.
 * @param {Array} questions
 * @param {string} [label] - Optional label used in skip log lines
 * @returns {{ valid: Array, skipped: Array }}
 */
export function filterExportableQuestions(questions, label = "export") {
  const valid = [];
  const skipped = [];

  if (!Array.isArray(questions)) return { valid, skipped };

  questions.forEach((q) => {
    const questionText = q.questionText || q.question || "";
    const hasOptions = q.options && typeof q.options === "object";
    const hasChoices = Array.isArray(q.choices) && q.choices.length >= 2;
    const hasCorrect = q.correct || q.correctAnswer;
    const choicesContainAnswer =
      !q.choices || !q.correctAnswer || q.choices.includes(q.correctAnswer);
    const isValid =
      Boolean(questionText.trim()) &&
      (hasOptions || hasChoices) &&
      Boolean(hasCorrect) &&
      choicesContainAnswer;

    if (isValid) {
      valid.push(q);
    } else {
      skipped.push(q);
      logger.warn(
        `Skipping invalid question in ${label}: ${questionText.substring(0, 40)}...`
      );
    }
  });

  return { valid, skipped };
}
