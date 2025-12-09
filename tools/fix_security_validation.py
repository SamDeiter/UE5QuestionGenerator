# -*- coding: utf-8 -*-
"""
Security Fix #5: Input Validation
- Creates comprehensive input validation utility
- Adds validation to question generation
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from security_editor import SecurityFixEditor

def create_validation_utility(editor):
    """Create src/utils/validation.js"""
    validation_content = """/**
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
        if (/<script|javascript:|on\\w+=/i.test(question.question)) {
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
    let sanitized = input.replace(/\\0/g, '');
    
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
"""
    
    validation_path = editor.project_root / 'src' / 'utils' / 'validation.js'
    if editor.write_file(validation_path, validation_content):
        print("[OK] Created validation.js utility")
        return True
    return False

def main():
    print("=" * 60)
    print("Security Fix #5: Input Validation")
    print("=" * 60)
    
    project_root = Path(__file__).parent.parent
    editor = SecurityFixEditor(project_root)
    
    # Create validation utility
    print("\n[1/1] Creating validation.js utility...")
    if not create_validation_utility(editor):
        print("[ERROR] Failed to create validation utility")
        return False
    
    print("\n" + "=" * 60)
    print("[SUCCESS] Input Validation Utility Created!")
    print("=" * 60)
    print(f"Backups saved to: {editor.backup_dir}")
    print("\n[!] MANUAL INTEGRATION REQUIRED:")
    print("1. Import validation in useGeneration.js:")
    print("   import { validateQuestion } from '../utils/validation';")
    print("\n2. Validate before saving:")
    print("   const validation = validateQuestion(newQuestion);")
    print("   if (!validation.valid) {")
    print("       alert('Validation failed: ' + validation.errors.join(', '));")
    print("       return;")
    print("   }")
    print("\n3. Update Firebase Firestore Rules (in Firebase Console):")
    print("   - Add length constraints for question fields")
    print("   - Validate creatorId matches auth.uid")
    print("   - Restrict deletion to question owners")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n[ERROR] Script failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
