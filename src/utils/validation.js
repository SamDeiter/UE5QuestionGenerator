/**
 * Input Validation Utility
 * Provides comprehensive validation for user inputs
 */

/**
 * Validates question data before saving
 * @param {object} question - Question object to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
export const validateQuestion = (question) => {
    const errors = [];
    
    // Required fields
    if (!question.question || typeof question.question !== 'string') {
        errors.push('Question text is required');
    } else {
        // Length validation
        if (question.question.length < 10) {
            errors.push('Question must be at least 10 characters');
        }
        if (question.question.length > 1000) {
            errors.push('Question must be less than 1000 characters');
        }
        
        // Content validation - check for suspicious patterns
        if (/<script|javascript:|on\w+=/i.test(question.question)) {
            errors.push('Question contains invalid content');
        }
    }
    
    // Validate correct answer
    if (!question.correctAnswer || typeof question.correctAnswer !== 'string') {
        errors.push('Correct answer is required');
    } else if (question.correctAnswer.length > 500) {
        errors.push('Correct answer must be less than 500 characters');
    }
    
    // Validate options (if present)
    if (question.options) {
        if (!Array.isArray(question.options)) {
            errors.push('Options must be an array');
        } else {
            if (question.options.length < 2 || question.options.length > 6) {
                errors.push('Must have 2-6 options');
            }
            question.options.forEach((opt, idx) => {
                if (typeof opt !== 'string' || opt.length > 500) {
                    errors.push(`Option ${idx + 1} is invalid`);
                }
            });
        }
    }
    
    // Validate explanation (if present)
    if (question.explanation && question.explanation.length > 2000) {
        errors.push('Explanation must be less than 2000 characters');
    }
    
    // Validate discipline
    const validDisciplines = ['Blueprint', 'Niagara', 'Material', 'PCG', 'MetaHuman', 'UI', 'Lighting', 'Animation'];
    if ( question.discipline && !validDisciplines.includes(question.discipline)) {
        errors.push(`Invalid discipline. Must be one of: ${validDisciplines.join(', ')}`);
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Validates user configuration data
 * @param {object} config - Configuration object to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
export const validateConfig = (config) => {
    const errors = [];
    
    // Creator name
    if (config.creatorName) {
        if (typeof config.creatorName !== 'string') {
            errors.push('Creator name must be a string');
        } else if (config.creatorName.length > 100) {
            errors.push('Creator name too long');
        }
    }
    
    // API key format (basic check)
    if (config.apiKey) {
        if (typeof config.apiKey !== 'string') {
            errors.push('API key must be a string');
        } else if (config.apiKey.length < 20 || config.apiKey.length > 200) {
            errors.push('API key format appears invalid');
        }
    }
    
    // Sheet URL format
    if (config.sheetUrl) {
        try {
            new URL(config.sheetUrl);
            if (!config.sheetUrl.includes('docs.google.com')) {
                errors.push('Sheet URL must be a Google Sheets URL');
            }
        } catch {
            errors.push('Invalid Sheet URL format');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Sanitizes user input by removing potentially dangerous content
 * NOTE: This is a basic sanitizer - use DOMPurify for HTML content
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return '';
    
    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit to reasonable length
    if (sanitized.length > 10000) {
        sanitized = sanitized.slice(0, 10000);
    }
    
    return sanitized;
};

/**
 * Validates and sanitizes a batch of questions
 * @param {array} questions - Array of question objects
 * @returns {object} { validQuestions: [], invalidQuestions: [] }
 */
export const validateQuestionBatch = (questions) => {
    const validQuestions = [];
    const invalidQuestions = [];
    
    questions.forEach((q, index) => {
        const validation = validateQuestion(q);
        if (validation.valid) {
            validQuestions.push(q);
        } else {
            invalidQuestions.push({
                index,
                question: q,
                errors: validation.errors
            });
        }
    });
    
    return { validQuestions, invalidQuestions };
};

export default {
    validateQuestion,
    validateConfig,
    sanitizeInput,
    validateQuestionBatch
};
