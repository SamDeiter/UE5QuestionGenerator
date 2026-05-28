import { logger } from "../utils/logger";
import { stripHtmlTags } from "./stringHelpers";
import { assertHttpUrl } from "./urlValidator";
/**
 * Security utility functions for file uploads and data processing.
 *
 * NOTE: Regex patterns are for validating uploaded CSV files.
 * Input is file content - controlled environment, no DoS risk.
 */

// Maximum file size in bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types for CSV
const ALLOWED_MIME_TYPES = [
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain", // Fallback for some systems
];

/**
 * Validates a file before processing.
 * Checks for size, extension, and MIME type.
 * @param {File} file - The file object to validate.
 * @returns {Object} - { isValid: boolean, error: string | null }
 */
export const validateFile = (file) => {
  // 1. Check File Size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File "${file.name}" exceeds the 5MB size limit.`,
    };
  }

  // 2. Check Extension
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".csv")) {
    return { isValid: false, error: `File "${file.name}" is not a .csv file.` };
  }

  // 3. Check MIME Type (Advisory only, as browsers can be spoofed or inconsistent)
  // We rely more on content parsing, but this is a good first gate.
  if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== "") {
    // Note: file.type can be empty string on Windows sometimes
    logger.warn(`Warning: Unusual MIME type for CSV: ${file.type}`);
  }

  return { isValid: true, error: null };
};

/**
 * Sanitizes a string to prevent CSV Injection (Formula Injection).
 * Prepends a single quote if the value's first non-whitespace character is
 * one of =, +, -, @, tab, or CR — any of which Excel / Google Sheets will
 * interpret as a formula. Mirrors OWASP CSV-injection guidance.
 */
export const sanitizeCSVField = (text) => {
  if (text === null || text === undefined || text === "") return "";
  const str = String(text);
  if (/^\s*[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
};

/**
 * Sanitizes a string read from an imported CSV row.
 *
 * The import path used to trust raw cell content. A poisoned CSV (either
 * hand-crafted or a re-import of a tampered export) could deliver:
 *   - <script>, <iframe>, or layout-clobbering tags
 *   - formula payloads (=HYPERLINK, =cmd, etc.) that would survive a
 *     subsequent re-export
 *   - oversized strings used as a denial-of-service vector
 *
 * This helper strips HTML, normalizes whitespace, caps length, and (by
 * default) re-applies the OWASP formula-injection guard so a re-export
 * is still safe.
 *
 * @param {unknown} value - The raw cell value from the CSV parser.
 * @param {object} [opts]
 * @param {number} [opts.maxLength] - Truncate after this many code points.
 * @param {boolean} [opts.applyCsvGuard=true] - Re-apply sanitizeCSVField.
 * @returns {string} A safe string. Returns "" for null/undefined/non-string.
 */
export const sanitizeImportedField = (value, opts = {}) => {
  const { maxLength, applyCsvGuard = true } = opts;
  if (value === null || value === undefined) return "";
  let str = String(value);
  // Strip all HTML — imported question content is plain text. renderMarkdown
  // re-strips at render time anyway, but stripping here keeps the stored
  // value clean so a re-export doesn't ship attacker HTML.
  str = stripHtmlTags(str) || "";
  // Collapse whitespace and trim. CSV cells often have stray \r\n that the
  // formula guard would otherwise treat as a prefix character.
  str = str.replace(/\s+/g, " ").trim();
  if (typeof maxLength === "number" && str.length > maxLength) {
    str = str.slice(0, maxLength);
  }
  if (applyCsvGuard) {
    str = sanitizeCSVField(str);
  }
  return str;
};

/**
 * Sanitizes a URL read from an imported CSV row.
 * Returns the URL if it parses to http: or https:, otherwise empty string.
 * Other schemes (javascript:, data:, file:, vbscript:, ...) are stripped.
 * @param {unknown} value
 * @returns {string}
 */
export const sanitizeImportedUrl = (value) => {
  if (value === null || value === undefined) return "";
  const safe = assertHttpUrl(String(value));
  return safe || "";
};

/**
 * Validates the content of a CSV file.
 * Checks for empty content, malformed lines, and potential malicious patterns.
 * @param {string} content - The raw CSV content string.
 * @returns {Object} - { isValid: boolean, error: string | null, sanitizedContent: string }
 */
export const validateCSVContent = (content) => {
  if (!content || content.trim().length === 0) {
    return { isValid: false, error: "File is empty." };
  }

  const lines = content.split(/\r\n|\n|\r/);
  if (lines.length < 2) {
    // Expect at least header + 1 row
    return {
      isValid: false,
      error: "CSV file must contain a header and at least one data row.",
    };
  }

  // Basic Header Validation (Optional: Check for required columns)
  const header = lines[0].toLowerCase();
  if (!header.includes("question") && !header.includes("id")) {
    return {
      isValid: false,
      error: "Invalid CSV format: Missing 'Question' or 'ID' columns.",
    };
  }

  // Scan for obvious malicious patterns (very basic heuristic)
  // Note: True virus scanning requires a backend.
  // We can check for excessive length or binary characters which might indicate a non-text file.
  const nullByteIndex = content.indexOf("\0");
  if (nullByteIndex !== -1) {
    return {
      isValid: false,
      error:
        "File contains binary data (null bytes). It may not be a valid text/CSV file.",
    };
  }

  return { isValid: true, error: null };
};
