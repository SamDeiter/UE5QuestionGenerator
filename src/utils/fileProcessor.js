import { FIELD_DELIMITER, LANGUAGE_FLAGS, LANGUAGE_CODES } from './constants';
import { parseCSVLine } from './helpers';
import { validateFile, validateCSVContent } from './security';

/**
 * Detects the language of a file based on its filename.
 * Checks for full language names (e.g., "Chinese_(Simplified)") and codes (e.g., "_CN_").
 * @param {string} fileName - The name of the file.
 * @returns {string|null} - The detected language name or null if not found.
 */
export const detectLanguageFromFilename = (fileName) => {
    let fileLanguage = null;

    // 1. Check for full language names
    Object.keys(LANGUAGE_FLAGS).forEach(lang => {
        const safeLang = lang.replace(/ /g, '_');
        if (fileName.toLowerCase().includes(safeLang.toLowerCase()) || fileName.toLowerCase().includes(lang.toLowerCase())) {
            fileLanguage = lang;
        }
    });

    // 2. Fallback: Check for language codes
    if (!fileLanguage) {
        Object.entries(LANGUAGE_CODES).forEach(([lang, code]) => {
            const regex = new RegExp(`(^|[._-])${code}([._-] |$)`, 'i');
            console.log(`Checking ${lang} code ${code} against ${fileName}: ${regex.test(fileName)}`);
            if (regex.test(fileName)) {
                fileLanguage = lang;
            }
        });
    }

    return fileLanguage;
};

/**
 * Parses raw CSV content into question objects.
 * Supports v1.6 and v1.7 formats.
 * @param {string} content - The raw CSV content.
 * @param {string} fileName - The filename (used for language detection).
 * @param {string} defaultCreatorName - Fallback creator name.
 * @returns {Array} - Array of parsed question objects.
 */
export const parseCSVQuestions = (content, fileName, defaultCreatorName) => {
    const lines = content.split('\n');
    const header = lines[0] ? lines[0].split(FIELD_DELIMITER) : [];
    const importedQuestions = [];

    // Check for v1.7 Format (Discipline at index 3) or v1.6 Format (Discipline at index 2)
    const isV17 = header[3] && header[3].includes('Discipline');
    const isV16 = header[2] && header[2].includes('Discipline');

    // Basic validation that it looks like our CSV format
    if (!(header.length > 5 && header[0].includes('ID') && (isV17 || isV16))) {
        return [];
    }

    const fileLanguage = detectLanguageFromFilename(fileName);

    lines.slice(1).forEach((line, idx) => {
        if (!line.trim()) return;
        const cols = parseCSVLine(line);
        if (cols.length < 10) return;

        let qObj = {};
        if (isV17) {
            // v1.7 Mapping: 0:ID, 1:Unique, 2:Status, 3:Disc, 4:Diff, 5:Type, 6:Q, 7-10:Opts, 11:Ans, 12:Expl, 13:Lang, 14:Src, 15:Date
            qObj = {
                id: Date.now() + idx + Math.random(),
                uniqueId: cols[1] && cols[1].length > 5 ? cols[1] : crypto.randomUUID(),
                discipline: cols[3] || "Imported",
                difficulty: cols[4] || "Easy",
                type: cols[5] || "Multiple Choice",
                question: cols[6] || "",
                options: { A: cols[7] || "", B: cols[8] || "", C: cols[9] || "", D: cols[10] || "" },
                correct: cols[11] || "",
                explanation: cols[12] || "",
                language: cols[13] || fileLanguage || "English",
                sourceUrl: cols[14] || "",
                status: 'accepted',
                creatorName: defaultCreatorName || "",
                reviewerName: ""
            };
        } else {
            // v1.6 Mapping: 0:ID, 1:Unique, 2:Disc, 3:Type, 4:Diff, 5:Q, 6-9:Opts, 10:Ans, 11:Date, 12:Src, 13:Exc, 14:Cr, 15:Rev, 16:Lang
            qObj = {
                id: Date.now() + idx + Math.random(),
                uniqueId: cols[1] && cols[1].length > 5 ? cols[1] : crypto.randomUUID(),
                discipline: cols[2] || "Imported",
                type: cols[3] || "Multiple Choice",
                difficulty: cols[4] || "Easy",
                question: cols[5] || "",
                options: { A: cols[6] || "", B: cols[7] || "", C: cols[8] || "", D: cols[9] || "" },
                correct: cols[10] || "",
                sourceUrl: cols[12] || "",
                sourceExcerpt: cols[13] || "",
                creatorName: cols[14] || defaultCreatorName || "",
                reviewerName: cols[15] || "",
                status: 'accepted',
                language: cols[16] || fileLanguage || "English"
            };
        }
        importedQuestions.push(qObj);
    });

    return importedQuestions;
};

/**
 * Reads a file and returns its content as a promise.
 * @param {File} file - The file to read.
 * @returns {Promise<string>} - The file content.
 */
export const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    });
};

/**
 * Processes a single uploaded file.
 * Validates, reads, and parses the file based on its type.
 * @param {File} file - The file to process.
 * @param {string} creatorName - The current creator name from config.
 * @returns {Promise<Object>} - Result object { type: 'questions'|'reference', data: ..., error: ... }
 */
export const processUploadedFile = async (file, creatorName) => {
    // 1. Basic File Validation
    const fileValidation = validateFile(file);
    if (!fileValidation.isValid) {
        return { error: fileValidation.error };
    }

    try {
        const content = await readFileContent(file);

        // 2. CSV Specific Processing
        if (file.name.toLowerCase().endsWith('.csv')) {
            const contentValidation = validateCSVContent(content);
            if (!contentValidation.isValid) {
                return { error: `Invalid CSV content: ${contentValidation.error}` };
            }

            const questions = parseCSVQuestions(content, file.name, creatorName);
            if (questions.length === 0) {
                // If it was a CSV but returned no questions, it might be a reference file or invalid format
                // For now, let's treat it as a reference file if it failed parsing as questions but is valid text
                return { type: 'reference', data: { name: file.name, content, size: file.size } };
            }

            return { type: 'questions', data: questions, language: questions[0].language };
        }

        // 3. Other Text Files (Reference)
        return { type: 'reference', data: { name: file.name, content, size: file.size } };

    } catch (err) {
        return { error: `Failed to read file: ${err.message}` };
    }
};
