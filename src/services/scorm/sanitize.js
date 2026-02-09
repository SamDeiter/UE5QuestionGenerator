import { logger } from "../../utils/logger";

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
    "&copy;": "\u00a9",
    "&trade;": "\u2122",
    "&reg;": "\u00ae",
    "&mdash;": "\u2014",
    "&ndash;": "\u2013",
    "&hellip;": "\u2026",
    "&ldquo;": '"',
    "&rdquo;": '"',
    "&lsquo;": "'",
    "&rsquo;": "'",
    "&bull;": "\u2022",
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
