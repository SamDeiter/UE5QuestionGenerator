import JSZip from "jszip";

/**
 * SCORM 1.2 Exporter Service
 * Converts Firestore questions to SCORM packages
 */

/**
 * Convert a Firestore question to SCORM quiz format
 * @param {Object} question - Firestore question object
 * @returns {Object} SCORM-formatted question
 */
export function convertQuestionToScormFormat(question) {
  const { questionText, type, choices, correctAnswer, guid, difficulty } =
    question;

  // For Multiple Choice: choices is array of strings, correctAnswer is the correct string
  // For True/False: choices is ["True", "False"], correctAnswer is "True" or "False"

  const scormChoices = choices.map((choiceText) => ({
    text: choiceText,
    correct: choiceText === correctAnswer,
  }));

  return {
    id: guid || `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: questionText,
    type: type,
    difficulty: difficulty || "Medium",
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
    passingScore = 80,
    timeLimit = 30, // minutes
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

  // Replace template variables in manifest
  const processedManifest = manifest
    .replace(/UE5 Scenario Tracker/g, title)
    .replace(
      /com\.example\.ue5scenario\.scorm12/g,
      `com.ue5questiongen.${Date.now()}`
    );

  // Replace template variables in index.html
  const processedIndexHtml = indexHtml.replace(/UE5 Scenario Tracker/g, title);

  // Create questions.js file with our questions
  const questionsJs = `// Generated questions for SCORM package
// Generated: ${new Date().toISOString()}

window.QUIZ_CONFIG = {
  title: "${title}",
  description: "${description}",
  passingScore: ${passingScore},
  timeLimit: ${timeLimit * 60}, // Convert minutes to seconds
  totalQuestions: ${scormQuestions.length}
};

window.QUESTIONS = ${JSON.stringify(scormQuestions, null, 2)};
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
    console.error("SCORM export failed:", error);
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
    if (!q.questionText || q.questionText.trim() === "") {
      errors.push(`Question ${index + 1}: Missing question text`);
    }

    if (!q.choices || q.choices.length < 2) {
      errors.push(`Question ${index + 1}: Must have at least 2 choices`);
    }

    if (!q.correctAnswer) {
      errors.push(`Question ${index + 1}: Missing correct answer`);
    }

    if (q.choices && !q.choices.includes(q.correctAnswer)) {
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
