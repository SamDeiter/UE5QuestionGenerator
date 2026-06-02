import { logger } from "../../utils/logger";
import { SCORM_DEFAULTS } from "../../utils/constants";
import packageJson from "../../../package.json";
import { convertQuestionToScormFormat } from "./converter";
import { filterExportableQuestions } from "./validator";

// Dynamic version from package.json - no more manual updates
const SCORM_VERSION = `v${packageJson.version}`;

// jszip is ~95 KB (raw) / ~26 KB (gzip). The static `import JSZip from
// "jszip"` previously pulled it into whichever chunk first transitively
// referenced this file, which was the initial authenticated bundle via
// GlobalModals → BulkExportModal. Switching to a lazy module-level loader
// keeps it out of that path entirely — the first call to one of the
// export functions below resolves it; subsequent calls reuse the cached
// constructor.
let _JSZip = null;
const loadJSZip = async () => {
  if (_JSZip) return _JSZip;
  const mod = await import("jszip");
  _JSZip = mod.default;
  return _JSZip;
};

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
    language = "English",
  } = config;

  // Convert questions to SCORM format
  const scormQuestions = questions.map(convertQuestionToScormFormat);

  // UTF-8 safe base64: btoa() only handles Latin1, so non-ASCII translations
  // (CJK, accented Latin, etc.) need to be UTF-8 encoded into bytes first.
  // Decoded by the mirrored helper in scorm-template/game.js.
  const encodeUtf8Base64 = (str) => {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(i, i + chunkSize)
      );
    }
    return btoa(binary);
  };

  // Escape a string for safe interpolation into HTML/XML (manifest, index.html).
  // Prevents a crafted title/description from injecting markup or breaking the
  // XML structure of imsmanifest.xml.
  const escapeMarkup = (value) =>
    String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // Safely embed an arbitrary string as a JS string literal in generated
  // questions.js. JSON.stringify handles quotes/backslashes/newlines; the extra
  // </ and < escapes neutralize any "</script>"-style breakout for defense in
  // depth (questions.js is loaded as an external script, but this keeps the
  // value safe regardless of how it is consumed).
  const toJsLiteral = (value) =>
    JSON.stringify(String(value == null ? "" : value))
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e");

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

  // Replace template variables in manifest (both {{TITLE}}/{{ID}} placeholders and legacy strings).
  // Function replacers are used so a title containing "$" (e.g. "$&", "$1") is
  // inserted literally rather than interpreted as a replacement pattern, and the
  // title is markup-escaped to keep the XML well-formed and injection-safe.
  const safeTitle = escapeMarkup(title);
  const processedManifest = manifest
    .replace(/\{\{TITLE\}\}/g, () => safeTitle)
    .replace(/\{\{ID\}\}/g, () => packageId)
    .replace(/UE5 Scenario Tracker/g, () => safeTitle)
    .replace(/com\.example\.ue5scenario\.scorm12/g, () => packageId);

  // Replace template variables in index.html (both {{TITLE}} placeholders and legacy strings)
  const processedIndexHtml = indexHtml
    .replace(/\{\{TITLE\}\}/g, () => safeTitle)
    .replace(/UE5 Scenario Tracker/g, () => safeTitle);

  // Create questions.js file with our questions
  const questionsJs = `// Generated questions for SCORM package
// Generated: ${new Date().toISOString()}

window.QUIZ_CONFIG = {
  title: ${toJsLiteral(title)},
  description: ${toJsLiteral(description)},
  language: ${toJsLiteral(language)},
  passingScore: ${passingScore},
  timeLimit: ${timeLimit * 60}, // Convert minutes to seconds
  totalQuestions: ${scormQuestions.length},
  questionsPerAttempt: ${questionsPerAttempt}, // Random selection per attempt
  shuffleQuestions: true
};

// Base64 encode questions to prevent casual view-source cheating
// Decoded at runtime by game.js - no performance impact (one-time decode)
window.QUESTIONS_ENCODED = "${encodeUtf8Base64(JSON.stringify(scormQuestions))}";
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
    // Caller is responsible for passing the correct language-specific
    // question set. ScormExportModal partitions by language before calling
    // this; BatchScormExportModal groups by language + discipline upstream.
    const files = await generateScormPackageFiles(questions, config);

    // Create ZIP file
    const JSZipCtor = await loadJSZip();
    const zip = new JSZipCtor();

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
    const sanitizedLanguage = (config.language || "english")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    link.download = `${sanitizedTitle}_${sanitizedLanguage}_${version}_${timestamp}_scorm12.zip`;

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
      language: config.language || "English",
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
      filterExportableQuestions(groupQuestions, label).valid;

    if (downloadAsSingleZip) {
      // Create master zip containing all language+discipline packages
      const JSZipCtor = await loadJSZip();
      const masterZip = new JSZipCtor();

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

        const JSZipCtor = await loadJSZip();
        const disciplineZip = new JSZipCtor();
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
          const JSZipCtor = await loadJSZip();
          const zip = new JSZipCtor();
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
