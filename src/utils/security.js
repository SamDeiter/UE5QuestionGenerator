/**
 * Security utility functions for file uploads and data processing.
 */

// Maximum file size in bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types for CSV
const ALLOWED_MIME_TYPES = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'text/plain' // Fallback for some systems
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
        return { isValid: false, error: `File "${file.name}" exceeds the 5MB size limit.` };
    }

    // 2. Check Extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
        return { isValid: false, error: `File "${file.name}" is not a .csv file.` };
    }

    // 3. Check MIME Type (Advisory only, as browsers can be spoofed or inconsistent)
    // We rely more on content parsing, but this is a good first gate.
    if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== '') {
        // Note: file.type can be empty string on Windows sometimes
        console.warn(`Warning: Unusual MIME type for CSV: ${file.type}`);
    }

    return { isValid: true, error: null };
};

/**
 * Sanitizes a string to prevent CSV Injection (Formula Injection).
 * Removes leading characters that could trigger formula execution in Excel/Sheets.
 * @param {string} text - The text to sanitize.
 * @returns {string} - The sanitized text.
 */
export const sanitizeCSVField = (text) => {
    if (!text) return '';
    const str = String(text);
    // If the field starts with =, +, -, or @, prepend a single quote to force it as text
    if (/^[=+\-@]/.test(str)) {
        return "'" + str;
    }
    return str;
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
    if (lines.length < 2) { // Expect at least header + 1 row
        return { isValid: false, error: "CSV file must contain a header and at least one data row." };
    }

    // Basic Header Validation (Optional: Check for required columns)
    const header = lines[0].toLowerCase();
    if (!header.includes('question') && !header.includes('id')) {
        return { isValid: false, error: "Invalid CSV format: Missing 'Question' or 'ID' columns." };
    }

    // Scan for obvious malicious patterns (very basic heuristic)
    // Note: True virus scanning requires a backend.
    // We can check for excessive length or binary characters which might indicate a non-text file.
    const nullByteIndex = content.indexOf('\0');
    if (nullByteIndex !== -1) {
        return { isValid: false, error: "File contains binary data (null bytes). It may not be a valid text/CSV file." };
    }

    return { isValid: true, error: null };
};
