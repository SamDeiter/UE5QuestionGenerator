import JSZip from "jszip";
import { logger } from "../utils/logger";
import { SCORM_DEFAULTS } from "../utils/constants";

/**
 * SCORM 1.2 Exporter Service
 * Converts Firestore questions to SCORM packages
 */

/**
 * Sanitize question text for SCORM display
 * Removes markdown formatting, trailing asterisks, and normalizes whitespace
 * @param {string} text - Raw text to sanitize
 * @returns {string} Cleaned text
 */
export function sanitizeQuestionText(text) {
  if (!text || typeof text !== "string") return "";

  let result = text;

  // Decode common HTML entities to their character equivalents
  const htmlEntities = {
    "&nbsp;": " ",
    "&copy;": "©",
    "&trade;": "™",
    "&reg;": "®",
    "&mdash;": "—",
    "&ndash;": "–",
    "&hellip;": "…",
    "&ldquo;": '"',
    "&rdquo;": '"',
    "&lsquo;": "'",
    "&rsquo;": "'",
    "&bull;": "•",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
  };

  // Replace named HTML entities
  for (const [entity, char] of Object.entries(htmlEntities)) {
    result = result.split(entity).join(char);
  }

  // Remove any remaining unknown named entities (e.g., &unknown;)
  result = result.replace(/&[a-zA-Z]+;/g, "");

  // Decode numeric entities (&#160;)
  result = result.replace(/&#(\d+);/g, (_, code) => {
    const num = parseInt(code, 10);
    return num === 160 ? " " : String.fromCharCode(num);
  });

  // Decode hex entities (&#xA0;)
  result = result.replace(/&#x([\da-fA-F]+);/g, (_, hex) => {
    const num = parseInt(hex, 16);
    return num === 160 ? " " : String.fromCharCode(num);
  });

  // Remove markdown bold (**text**)
  result = result.replace(/\*\*([\s\S]*?)\*\*/g, "$1");
  // Remove markdown bold (__text__)
  result = result.replace(/__([\s\S]*?)__/g, "$1");
  // Remove trailing asterisks (footnote markers like "FLWC*")
  result = result.replace(/\*+\s*$/, ""); // eslint-disable-line sonarjs/slow-regex -- Safe: bounded pattern, no nested quantifiers
  // Normalize multiple spaces to single space
  result = result.replace(/ {2,}/g, " ");

  return result.trim();
}

/**
 * Check if text is primarily English (Latin script)
 * Detects non-Latin scripts: Korean, Chinese, Japanese, Cyrillic, Arabic, Hebrew, Thai, etc.
 * @param {string} text - Text to check
 * @returns {boolean} True if text appears to be English/Latin script
 */
export function isEnglishText(text) {
  if (!text || typeof text !== "string") return true;

  // Regex to match non-Latin scripts (Korean, Chinese, Japanese, Cyrillic, Arabic, Hebrew, Thai)
  const nonLatinRegex =
    /[\u1100-\u11FF\uAC00-\uD7AF\u4E00-\u9FFF\u3040-\u30FF\u0400-\u04FF\u0600-\u06FF\u0590-\u05FF\u0E00-\u0E7F]/;

  return !nonLatinRegex.test(text);
}

/**
 * Filter questions to only include English content
 * @param {Array} questions - Questions to filter
 * @returns {Object} { filtered: Array, skipped: number }
 */
export function filterEnglishQuestions(questions) {
  // Handle null/undefined input gracefully
  if (!questions || !Array.isArray(questions)) {
    return { filtered: [], skipped: 0 };
  }

  const filtered = [];
  let skipped = 0;

  questions.forEach((q) => {
    const questionText = q.questionText || q.question || "";
    const optionsText = q.options ? Object.values(q.options).join(" ") : "";
    const choicesText = Array.isArray(q.choices) ? q.choices.join(" ") : "";
    const allText = `${questionText} ${optionsText} ${choicesText}`;

    if (isEnglishText(allText)) {
      filtered.push(q);
    } else {
      skipped++;
      logger.info(
        `Skipping non-English question: ${questionText.substring(0, 50)}...`
      );
    }
  });

  if (skipped > 0) {
    logger.info(`Filtered out ${skipped} non-English question(s)`);
  }

  return { filtered, skipped };
}

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
    scormChoices = Object.entries(question.options).map(([key, text]) => ({
      text: sanitizeQuestionText(text),
      correct: key === correctKey,
    }));
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
    // Filter to only keep choices with text "True" or "False" (case-sensitive)
    const tfChoices = scormChoices.filter(
      (choice) => choice.text === "True" || choice.text === "False"
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
    questionsPerAttempt = 60, // Random selection per attempt
  } = config;

  // Convert questions to SCORM format
  const scormQuestions = questions.map(convertQuestionToScormFormat);

  // Load template files from public directory
  // Use Vite's BASE_URL to handle GitHub Pages deployment path
  const basePath = import.meta.env.BASE_URL || "/";
  const templatePath = `${basePath}scorm-template/`;

  // Fetch template files
  const [scormJs, indexHtml, styleCSS, gameJs, manifest] = await Promise.all([
    fetch(`${templatePath}scorm.js`).then((r) => r.text()),
    fetch(`${templatePath}index.html`).then((r) => r.text()),
    fetch(`${templatePath}style.css`).then((r) => r.text()),
    fetch(`${templatePath}game.js`).then((r) => r.text()),
    fetch(`${templatePath}imsmanifest.xml`).then((r) => r.text()),
  ]);

  // Generate unique ID for the SCORM package
  const packageId = `com.ue5questiongen.${Date.now()}`;

  // Replace template variables in manifest (both {{TITLE}}/{{ID}} placeholders and legacy strings)
  const processedManifest = manifest
    .replace(/\{\{TITLE\}\}/g, title)
    .replace(/\{\{ID\}\}/g, packageId)
    .replace(/UE5 Scenario Tracker/g, title)
    .replace(/com\.example\.ue5scenario\.scorm12/g, packageId);

  // Replace template variables in index.html (both {{TITLE}} placeholders and legacy strings)
  const processedIndexHtml = indexHtml
    .replace(/\{\{TITLE\}\}/g, title)
    .replace(/UE5 Scenario Tracker/g, title);

  // Create questions.js file with our questions
  const questionsJs = `// Generated questions for SCORM package
// Generated: ${new Date().toISOString()}

window.QUIZ_CONFIG = {
  title: "${title}",
  description: "${description}",
  passingScore: ${passingScore},
  timeLimit: ${timeLimit * 60}, // Convert minutes to seconds
  totalQuestions: ${scormQuestions.length},
  questionsPerAttempt: ${questionsPerAttempt}, // Random selection per attempt
  shuffleQuestions: true,
  adaptiveDifficulty: true
};

// Base64 encode questions to prevent casual view-source cheating
// Decoded at runtime by game.js - no performance impact (one-time decode)
window.QUESTIONS_ENCODED = "${btoa(JSON.stringify(scormQuestions))}";
window.QUESTIONS = null; // Decoded at runtime by game.js
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
    // Filter to English-only questions
    const { filtered: englishQuestions, skipped } =
      filterEnglishQuestions(questions);

    if (englishQuestions.length === 0) {
      throw new Error("No English questions found after filtering");
    }

    if (skipped > 0) {
      logger.info(
        `SCORM Export: Filtered out ${skipped} non-English question(s), exporting ${englishQuestions.length} questions`
      );
    }

    // Generate package files with filtered questions
    const files = await generateScormPackageFiles(englishQuestions, config);

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

    // Generate filename with version and timestamp (helps distinguish between exports)
    const version = "v2.4.20"; // SCORM export version
    // Generate timestamp with time for unique exports (YYYY-MM-DD_HH-MM)
    const now = new Date();
    const timestamp = `${now.toISOString().split("T")[0]}_${now.getHours().toString().padStart(2, "0")}-${now.getMinutes().toString().padStart(2, "0")}`;
    const sanitizedTitle = (config.title || "UE5_Quiz")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    link.download = `${sanitizedTitle}_${version}_${timestamp}_scorm12.zip`;

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
 * Group questions by discipline
 * @param {Array} questions - Questions to group
 * @returns {Object} Questions grouped by discipline
 */
export function groupQuestionsByDiscipline(questions) {
  const groups = {};

  questions.forEach((q) => {
    const discipline = q.discipline || q.category || "General";
    if (!groups[discipline]) {
      groups[discipline] = [];
    }
    groups[discipline].push(q);
  });

  return groups;
}

/**
 * Batch export multiple SCORM packages grouped by discipline
 * Downloads individual zips or a single master zip containing all packages
 * @param {Array} questions - All questions to export
 * @param {Object} baseConfig - Base configuration for all packages
 * @param {Object} options - Batch options
 * @returns {Object} Export results
 */
export async function batchExportByDiscipline(
  questions,
  baseConfig = {},
  options = {}
) {
  const {
    downloadAsSingleZip = true, // If true, creates one master zip containing all packages
    onProgress = null, // Callback for progress updates
  } = options;

  if (!questions || questions.length === 0) {
    throw new Error("No questions provided for batch export");
  }

  // Group by discipline
  const groups = groupQuestionsByDiscipline(questions);
  const disciplines = Object.keys(groups);

  if (disciplines.length === 0) {
    throw new Error("No disciplines found in questions");
  }

  const results = [];
  const version = "v2.4.20"; // SCORM export version
  // Generate timestamp with time for unique exports (YYYY-MM-DD_HH-MM)
  const now = new Date();
  const timestamp = `${now.toISOString().split("T")[0]}_${now.getHours().toString().padStart(2, "0")}-${now.getMinutes().toString().padStart(2, "0")}`;

  try {
    if (downloadAsSingleZip) {
      // Create master zip containing all discipline packages
      const masterZip = new JSZip();

      for (let i = 0; i < disciplines.length; i++) {
        const discipline = disciplines[i];
        const disciplineQuestions = groups[discipline];

        if (onProgress) {
          onProgress({
            current: i + 1,
            total: disciplines.length,
            discipline,
            questionCount: disciplineQuestions.length,
          });
        }

        // Filter to only valid AND English questions
        const validQuestions = disciplineQuestions.filter((q) => {
          const questionText = q.questionText || q.question || "";
          const hasOptions = q.options && typeof q.options === "object";
          const hasChoices = Array.isArray(q.choices) && q.choices.length >= 2;
          const hasCorrect = q.correct || q.correctAnswer;
          const optionsText = q.options
            ? Object.values(q.options).join(" ")
            : "";
          const choicesText = Array.isArray(q.choices)
            ? q.choices.join(" ")
            : "";
          const allText = `${questionText} ${optionsText} ${choicesText}`;

          const isValid =
            questionText.trim() &&
            (hasOptions || hasChoices) &&
            hasCorrect &&
            isEnglishText(allText);
          if (!isValid && !isEnglishText(allText)) {
            logger.info(
              `Skipping non-English question in ${discipline}: ${questionText.substring(0, 40)}...`
            );
          } else if (!isValid) {
            logger.warn(
              `Skipping invalid question in ${discipline}: ${questionText.substring(0, 40)}...`
            );
          }
          return isValid;
        });

        if (validQuestions.length === 0) {
          logger.warn(`Skipping ${discipline}: No valid questions found`);
          results.push({
            discipline,
            success: false,
            error: "No valid questions found",
          });
          continue;
        }

        logger.info(
          `${discipline}: Exporting ${validQuestions.length} of ${disciplineQuestions.length} questions`
        );

        // Generate package files using valid questions only
        const config = {
          ...baseConfig,
          title: `${baseConfig.title || "UE5 Assessment"} - ${discipline}`,
          description: `${baseConfig.description || "Assessment"} for ${discipline}`,
        };

        const files = await generateScormPackageFiles(validQuestions, config);

        // Create discipline zip
        const disciplineZip = new JSZip();
        Object.entries(files).forEach(([filename, content]) => {
          disciplineZip.file(filename, content);
        });

        const disciplineBlob = await disciplineZip.generateAsync({
          type: "blob",
        });
        const sanitizedDiscipline = discipline
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase();
        const filename = `${sanitizedDiscipline}_${version}_${timestamp}_scorm12.zip`;

        // Add to master zip
        masterZip.file(filename, disciplineBlob);

        results.push({
          discipline,
          success: true,
          filename,
          questionCount: disciplineQuestions.length,
        });
      }

      // Generate and download master zip
      const masterBlob = await masterZip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(masterBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `all_disciplines_${version}_${timestamp}_scorm_packages.zip`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        method: "single_zip",
        masterFilename: link.download,
        packages: results,
        totalDisciplines: disciplines.length,
        successfulExports: results.filter((r) => r.success).length,
      };
    } else {
      // Download each discipline as separate file with small delay
      for (let i = 0; i < disciplines.length; i++) {
        const discipline = disciplines[i];
        const disciplineQuestions = groups[discipline];

        if (onProgress) {
          onProgress({
            current: i + 1,
            total: disciplines.length,
            discipline,
            questionCount: disciplineQuestions.length,
          });
        }

        try {
          const config = {
            ...baseConfig,
            title: `${baseConfig.title || "UE5 Assessment"} - ${discipline}`,
          };

          const result = await exportToScorm(disciplineQuestions, config);
          results.push({
            discipline,
            ...result,
          });

          // Small delay between downloads to prevent browser issues
          if (i < disciplines.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (err) {
          results.push({
            discipline,
            success: false,
            error: err.message,
          });
        }
      }

      return {
        success: true,
        method: "separate_files",
        packages: results,
        totalDisciplines: disciplines.length,
        successfulExports: results.filter((r) => r.success).length,
      };
    }
  } catch (error) {
    logger.error("Batch SCORM export failed:", error);
    throw new Error(`Batch export failed: ${error.message}`);
  }
}
