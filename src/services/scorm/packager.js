import JSZip from "jszip";
import { logger } from "../../utils/logger";
import { SCORM_DEFAULTS } from "../../utils/constants";
import packageJson from "../../../package.json";
import { filterEnglishQuestions } from "./sanitize";
import { convertQuestionToScormFormat } from "./converter";

// Dynamic version from package.json - no more manual updates
const SCORM_VERSION = `v${packageJson.version}`;

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
  shuffleQuestions: true
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
    const version = SCORM_VERSION;
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
 * Group questions by language + discipline. Each group becomes its own SCORM package.
 * @param {Array} questions
 * @returns {Object} Map of "Language__Discipline" -> { language, discipline, questions }
 */
export function groupQuestionsByLanguageAndDiscipline(questions) {
  const groups = {};

  questions.forEach((q) => {
    const language = q.language || "English";
    const discipline = q.discipline || q.category || "General";
    const key = `${language}__${discipline}`;
    if (!groups[key]) {
      groups[key] = { language, discipline, questions: [] };
    }
    groups[key].questions.push(q);
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

  // Group by language + discipline so each language gets its own package
  const groups = groupQuestionsByLanguageAndDiscipline(questions);
  const groupKeys = Object.keys(groups);

  if (groupKeys.length === 0) {
    throw new Error("No questions to export");
  }

  const results = [];
  const version = SCORM_VERSION;
  // Generate timestamp with time for unique exports (YYYY-MM-DD_HH-MM)
  const now = new Date();
  const timestamp = `${now.toISOString().split("T")[0]}_${now.getHours().toString().padStart(2, "0")}-${now.getMinutes().toString().padStart(2, "0")}`;

  try {
    const sanitize = (s) => s.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    const filterValidQuestions = (groupQuestions, label) =>
      groupQuestions.filter((q) => {
        const questionText = q.questionText || q.question || "";
        const hasOptions = q.options && typeof q.options === "object";
        const hasChoices = Array.isArray(q.choices) && q.choices.length >= 2;
        const hasCorrect = q.correct || q.correctAnswer;
        const isValid =
          questionText.trim() && (hasOptions || hasChoices) && hasCorrect;
        if (!isValid) {
          logger.warn(
            `Skipping invalid question in ${label}: ${questionText.substring(0, 40)}...`
          );
        }
        return isValid;
      });

    if (downloadAsSingleZip) {
      // Create master zip containing all language+discipline packages
      const masterZip = new JSZip();

      for (let i = 0; i < groupKeys.length; i++) {
        const key = groupKeys[i];
        const { language, discipline, questions: groupQuestions } = groups[key];
        const label = `${language} - ${discipline}`;

        if (onProgress) {
          onProgress({
            current: i + 1,
            total: groupKeys.length,
            discipline: label,
            questionCount: groupQuestions.length,
          });
        }

        const validQuestions = filterValidQuestions(groupQuestions, label);

        if (validQuestions.length === 0) {
          logger.warn(`Skipping ${label}: No valid questions found`);
          results.push({
            language,
            discipline,
            success: false,
            error: "No valid questions found",
          });
          continue;
        }

        logger.info(
          `${label}: Exporting ${validQuestions.length} of ${groupQuestions.length} questions`
        );

        const config = {
          ...baseConfig,
          title: `${baseConfig.title || "UE5 Assessment"} - ${language} - ${discipline}`,
          description: `${baseConfig.description || "Assessment"} for ${discipline} (${language})`,
        };

        const files = await generateScormPackageFiles(validQuestions, config);

        const disciplineZip = new JSZip();
        Object.entries(files).forEach(([filename, content]) => {
          disciplineZip.file(filename, content);
        });

        const disciplineBlob = await disciplineZip.generateAsync({
          type: "blob",
        });
        const filename = `${sanitize(language)}_${sanitize(discipline)}_${version}_${timestamp}_scorm12.zip`;

        masterZip.file(filename, disciplineBlob);

        results.push({
          language,
          discipline,
          success: true,
          filename,
          questionCount: groupQuestions.length,
        });
      }

      const masterBlob = await masterZip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(masterBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `all_languages_disciplines_${version}_${timestamp}_scorm_packages.zip`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        method: "single_zip",
        masterFilename: link.download,
        packages: results,
        totalDisciplines: groupKeys.length,
        successfulExports: results.filter((r) => r.success).length,
      };
    } else {
      // Download each language+discipline as a separate file with small delay
      for (let i = 0; i < groupKeys.length; i++) {
        const key = groupKeys[i];
        const { language, discipline, questions: groupQuestions } = groups[key];
        const label = `${language} - ${discipline}`;

        if (onProgress) {
          onProgress({
            current: i + 1,
            total: groupKeys.length,
            discipline: label,
            questionCount: groupQuestions.length,
          });
        }

        try {
          const validQuestions = filterValidQuestions(groupQuestions, label);
          if (validQuestions.length === 0) {
            results.push({
              language,
              discipline,
              success: false,
              error: "No valid questions found",
            });
            continue;
          }

          const config = {
            ...baseConfig,
            title: `${baseConfig.title || "UE5 Assessment"} - ${language} - ${discipline}`,
          };

          const files = await generateScormPackageFiles(validQuestions, config);
          const zip = new JSZip();
          Object.entries(files).forEach(([filename, content]) => {
            zip.file(filename, content);
          });
          const blob = await zip.generateAsync({ type: "blob" });
          const filename = `${sanitize(language)}_${sanitize(discipline)}_${version}_${timestamp}_scorm12.zip`;
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          results.push({
            language,
            discipline,
            success: true,
            filename,
            questionCount: validQuestions.length,
          });

          if (i < groupKeys.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (err) {
          results.push({
            language,
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
        totalDisciplines: groupKeys.length,
        successfulExports: results.filter((r) => r.success).length,
      };
    }
  } catch (error) {
    logger.error("Batch SCORM export failed:", error);
    throw new Error(`Batch export failed: ${error.message}`);
  }
}
