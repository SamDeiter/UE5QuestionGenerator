/**
 * Type definitions for UE5 Question Generator
 *
 * These types define the core data structures used throughout the application.
 * All agents should reference these types for consistency.
 */

/**
 * @typedef {Object} Question
 * @property {string} id - Unique identifier (Firestore document ID)
 * @property {string} uniqueId - Unique identifier for linking translations
 * @property {string} question - Question text
 * @property {Object} options - Answer options {A, B, C, D}
 * @property {string} options.A - Option A text
 * @property {string} options.B - Option B text
 * @property {string} options.C - Option C text
 * @property {string} options.D - Option D text
 * @property {string} correct - Correct answer letter (A, B, C, or D)
 * @property {string} discipline - Question discipline (Worldbuilding, Game Dev, etc.)
 * @property {string} difficulty - Difficulty level (Easy, Medium, Hard)
 * @property {string} language - Language code (English, Spanish, etc.)
 * @property {string[]} tags - Associated tags
 * @property {string} creator - Creator name
 * @property {string} status - Question status (pending, accepted, rejected)
 * @property {number} [createdAt] - Creation timestamp
 * @property {number} [critiqueScore] - AI critique score (0-100)
 * @property {string} [critiqueText] - AI critique feedback
 * @property {number} [critiqueScoreOriginal] - Original critique score before improvements
 * @property {string} [explanation] - AI-generated explanation
 * @property {SuggestedRewrite} [suggestedRewrite] - AI improvement suggestion
 * @property {boolean} [humanVerified] - Whether human has verified the question
 * @property {string} [humanVerifiedBy] - Email of user who verified
 * @property {string} [rejectionReason] - Reason for rejection
 * @property {number} [rejectedAt] - Rejection timestamp
 * @property {string} [sourceContext] - Source material context
 */

/**
 * @typedef {Object} SuggestedRewrite
 * @property {string} question - Improved question text
 * @property {Object} options - Improved answer options
 * @property {string} options.A - Improved option A text
 * @property {string} options.B - Improved option B text
 * @property {string} options.C - Improved option C text
 * @property {string} options.D - Improved option D text
 * @property {string} correct - Correct answer letter
 * @property {string[]} improvements - List of improvements made
 * @property {number} critiqueScore - Estimated score after improvements (0-100)
 * @property {string} critiqueText - Critique reasoning
 * @property {string[]} tags - Updated tags
 * @property {string} changesExplanation - Why changes were made
 */

/**
 * @typedef {Object} CritiqueResult
 * @property {number} score - Quality score (0-100)
 * @property {string} text - Critique feedback
 * @property {string[]} tags - Suggested tags
 * @property {string[]} [improvements] - Improvement suggestions
 * @property {string} [explanation] - Explanation of improvements
 * @property {Object} [improvedQuestion] - Improved question object
 * @property {string} [improvedQuestion.question] - Improved question text
 * @property {Object} [improvedQuestion.options] - Improved options
 * @property {string} [improvedQuestion.correct] - Correct answer
 */

/**
 * @typedef {Object} AppConfig
 * @property {string} discipline - Selected discipline
 * @property {string} difficulty - Selected difficulty
 * @property {string} language - Selected language
 * @property {number} questionCount - Number of questions to generate
 * @property {string} creatorName - Name of the creator
 * @property {string} sheetUrl - Google Sheets URL
 * @property {string} [geminiApiKey] - Gemini API key (dev-only, stored in localStorage)
 * @property {number} temperature - AI temperature setting
 * @property {string} model - AI model to use
 */

/**
 * @typedef {Object} ToastMessage
 * @property {string} id - Unique toast ID
 * @property {string} message - Toast message text
 * @property {number} duration - Display duration in milliseconds
 * @property {string} type - Toast type (success, error, warning, info)
 */

// Export empty object to make this a module
export {};
