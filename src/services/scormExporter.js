import JSZip from "jszip";
import logger from "../utils/logger";
import { SCORM_DEFAULTS, QUESTION_LIMITS } from "../utils/constants";
import normalizeQuestion from "../utils/normalizeQuestion";

const SECONDS_IN_MINUTE = 60;
const JSON_INDENTATION = 2;

/**
 * Escape XML special characters
 * @param {string} unsafe - String with potentially unsafe characters
 * @returns {string} XML-safe string
 */
const escapeXml = (unsafe) => {
  if (!unsafe) return "";
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

/**
 * SCORM 1.2 Exporter Service
 * Converts Firestore questions to SCORM packages
 *
 * Uses centralized normalizeQuestion for consistent field handling.
 */

/**
 * Convert a Firestore question to SCORM quiz format
 * @param {Object} question - Firestore question object (any format)
 * @returns {Object} SCORM-formatted question
 */
export function convertQuestionToScormFormat(question) {
  // Use centralized normalizer for consistent field handling
  const normalized = normalizeQuestion(question);

  if (!normalized) {
    return null;
  }

  // Convert options object {A, B, C, D} to choices array for SCORM
  const optionKeys = ["A", "B", "C", "D"];
  const choicesArray = optionKeys
    .map((key) => normalized.options[key])
    .filter((opt) => opt && opt.trim());

  const correctAnswerText = normalized.options[normalized.correct] || "";

  const scormChoices = choicesArray.map((choiceText) => ({
    text: choiceText,
    correct: choiceText === correctAnswerText,
  }));

  return {
    id: normalized.id || `q-${Date.now()}-${crypto.randomUUID().split("-")[0]}`,
    text: normalized.question,
    type: normalized.type,
    difficulty: normalized.difficulty,
    choices: scormChoices,
  };
}

/**
 * Generate SCORM package configuration
 * @param {Array} questions - Array of Firestore questions
 * @param {Object} config - Package configuration
 * @returns {Object} Package files ready for zipping
 */
export async function generateScormPackageFiles(questions, config = {}) {
  const {
    title = "UE5 Knowledge Assessment",
    description = "Test your Unreal Engine 5 knowledge",
    passingScore = SCORM_DEFAULTS.PASSING_SCORE,
    timeLimit = SCORM_DEFAULTS.TIME_LIMIT_MINUTES, // minutes
  } = config;

  // Convert questions to SCORM format
  const scormQuestions = questions.map(convertQuestionToScormFormat);

  // Load template files from public directory
  const templatePath = "/scorm-template/";

  // Fetch template files
  const [scormJs, indexHtml, styleCSS, gameJs, manifest] = await Promise.all([
    fetch(`${templatePath}scorm.js`).then((r) => r.text()),
    fetch(`${templatePath}index.html`).then((r) => r.text()),
    fetch(`${templatePath}style.css`).then((r) => r.text()),
    fetch(`${templatePath}game.js`).then((r) => r.text()),
    fetch(`${templatePath}imsmanifest.xml`).then((r) => r.text()),
  ]);

  // Replace template variables
  const processedManifest = manifest
    .replace(/{{TITLE}}/g, escapeXml(title))
    .replace(/{{ID}}/g, `com.ue5questiongen.${Date.now()}`);

  const processedIndexHtml = indexHtml.replace(/{{TITLE}}/g, escapeXml(title));

  // Create questions.js file with our questions
  const questionsJs = `// Generated questions for SCORM package
// Generated: ${new Date().toISOString()}

window.QUIZ_CONFIG = {
  title: ${JSON.stringify(title)},
  description: ${JSON.stringify(description)},
  passingScore: ${passingScore},
  timeLimit: ${timeLimit * SECONDS_IN_MINUTE}, // Convert minutes to seconds
  totalQuestions: ${scormQuestions.length}
};

window.QUESTIONS = ${JSON.stringify(scormQuestions, null, JSON_INDENTATION)};
`;

  return {
    "scorm.js": scormJs,
    "index.html": processedIndexHtml,
    "style.css": styleCSS,
    "game.js": gameJs,
    "questions.js": questionsJs,
    "imsmanifest.xml": processedManifest,
  };
}

/**
 * Generate and download SCORM package as .zip file
 * @param {Array} questions - Array of Firestore questions
 * @param {Object} config - Package configuration
 */
export async function exportToScorm(questions, config = {}) {
  if (!questions || questions.length === 0) {
    throw new Error("No questions provided for SCORM export");
  }

  try {
    // Generate package files
    const files = await generateScormPackageFiles(questions, config);

    // Create ZIP file
    const zip = new JSZip();

    // Add all files to ZIP
    Object.entries(files).forEach(([filename, content]) => {
      zip.file(filename, content);
    });

    // Generate ZIP blob
    const blob = await zip.generateAsync({ type: "blob" });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const sanitizedTitle = (config.title || "UE5_Quiz")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    link.download = `${sanitizedTitle}_${timestamp}_scorm12.zip`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);

    return {
      success: true,
      filename: link.download,
      questionCount: questions.length,
    };
  } catch (error) {
    logger.error("SCORM export failed:", error);
    throw new Error(`Failed to generate SCORM package: ${error.message}`);
  }
}

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

  if (questions.length < QUESTION_LIMITS.MIN_EXPORT_QUESTIONS) {
    warnings.push(
      `Less than ${QUESTION_LIMITS.MIN_EXPORT_QUESTIONS} questions selected. Consider adding more for a comprehensive assessment.`,
    );
  }

  if (questions.length > QUESTION_LIMITS.MAX_EXPORT_QUESTIONS) {
    warnings.push(
      `More than ${QUESTION_LIMITS.MAX_EXPORT_QUESTIONS} questions selected. Large packages may take longer to load in the LMS.`,
    );
  }

  // Use centralized normalizer for validation
  questions.forEach((q, index) => {
    const normalized = normalizeQuestion(q);

    if (!normalized) {
      errors.push(`Question ${index + 1}: Invalid question format`);
      return;
    }

    if (!normalized.question || normalized.question.trim() === "") {
      errors.push(`Question ${index + 1}: Missing question text`);
    }

    // Count valid options (options is {A, B, C, D})
    const optionKeys = ["A", "B", "C", "D"];
    const validChoices = optionKeys
      .map((key) => normalized.options[key])
      .filter((opt) => opt && opt.trim());

    if (validChoices.length < QUESTION_LIMITS.MIN_CHOICES) {
      errors.push(
        `Question ${index + 1}: Must have at least ${QUESTION_LIMITS.MIN_CHOICES} choices`,
      );
    }

    // Check correct answer exists
    const correctAnswer = normalized.options[normalized.correct];
    if (!correctAnswer) {
      errors.push(`Question ${index + 1}: Missing correct answer`);
    }

    // Check correct answer is in valid choices
    if (correctAnswer && !validChoices.includes(correctAnswer)) {
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
