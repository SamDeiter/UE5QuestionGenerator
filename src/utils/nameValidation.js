/**
 * Name Validation Utility
 *
 * Industry-standard validation for display names and usernames.
 * Implements common patterns used by major platforms (Google, Microsoft, Slack).
 *
 * Features:
 * - Must start with a letter (ASCII or Unicode)
 * - Allows letters, spaces, hyphens, apostrophes (O'Brien, Mary-Jane)
 * - Supports international characters (José, François, 日本語)
 * - Blocks names starting with numbers or special characters
 * - Basic profanity filter
 * - Length limits (2-50 characters)
 * - Whitespace normalization
 */

// Industry-standard limits
const NAME_LIMITS = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 50,
  MAX_CONSECUTIVE_SPACES: 1,
  DEFAULT_MAX_INITIALS: 2,
};

/**
 * Common profanity list - curated for false-positive safety.
 * Uses whole-word matching to avoid blocking legitimate names.
 * This is a minimal list; expand as needed for your context.
 */
const PROFANITY_LIST = [
  "ass",
  "asshole",
  "bastard",
  "bitch",
  "bullshit",
  "cock",
  "crap",
  "cunt",
  "damn",
  "dick",
  "douche",
  "dumbass",
  "fag",
  "faggot",
  "fuck",
  "fucking",
  "goddamn",
  "hell",
  "jackass",
  "motherfucker",
  "nigger",
  "piss",
  "prick",
  "pussy",
  "shit",
  "slut",
  "whore",
];

/**
 * Patterns that indicate spam or bot names
 */
const SPAM_PATTERNS = [
  /^test\d*$/i,
  /^user\d*$/i,
  /^admin\d*$/i,
  /^guest\d*$/i,
  /^[a-z]{1,2}\d{4,}$/i, // e.g., "ab12345"
  /^\d+$/, // All numbers
];

/**
 * Validates a display name according to industry standards.
 *
 * @param {string} name - The name to validate
 * @returns {{valid: boolean, error: string|null, sanitized: string|null}}
 */
export const validateDisplayName = (name) => {
  // Handle null/undefined
  if (name === null || name === undefined) {
    return {
      valid: false,
      error: "Name is required",
      sanitized: null,
    };
  }

  // Convert to string and trim
  const rawName = String(name).trim();

  // Check if empty
  if (!rawName) {
    return {
      valid: false,
      error: "Name cannot be empty",
      sanitized: null,
    };
  }

  // Normalize whitespace (collapse multiple spaces to single)
  const sanitized = rawName.replace(/\s+/g, " ");

  // Check minimum length
  if (sanitized.length < NAME_LIMITS.MIN_LENGTH) {
    return {
      valid: false,
      error: `Name must be at least ${NAME_LIMITS.MIN_LENGTH} characters`,
      sanitized: null,
    };
  }

  // Check maximum length
  if (sanitized.length > NAME_LIMITS.MAX_LENGTH) {
    return {
      valid: false,
      error: `Name cannot exceed ${NAME_LIMITS.MAX_LENGTH} characters`,
      sanitized: null,
    };
  }

  // Must start with a letter (Unicode-aware)
  // This regex matches any Unicode letter at the start
  const startsWithLetterRegex = /^\p{L}/u;
  if (!startsWithLetterRegex.test(sanitized)) {
    return {
      valid: false,
      error: "Name must start with a letter",
      sanitized: null,
    };
  }

  // Allowed characters: letters (Unicode), spaces, hyphens, apostrophes, periods
  // This allows: John O'Brien, Mary-Jane, José García, 日本語の名前
  const allowedCharsRegex = /^[\p{L}\s'.-]+$/u;
  if (!allowedCharsRegex.test(sanitized)) {
    return {
      valid: false,
      error: "Name can only contain letters, spaces, hyphens, and apostrophes",
      sanitized: null,
    };
  }

  // No consecutive special characters
  const consecutiveSpecialRegex = /['.-]{2,}/;
  if (consecutiveSpecialRegex.test(sanitized)) {
    return {
      valid: false,
      error: "Name cannot have consecutive special characters",
      sanitized: null,
    };
  }

  // Cannot end with special character
  const endsWithSpecialRegex = /['.-]$/;
  if (endsWithSpecialRegex.test(sanitized)) {
    return {
      valid: false,
      error: "Name cannot end with a special character",
      sanitized: null,
    };
  }

  // Check for profanity (whole word matching, case-insensitive)
  const lowerName = sanitized.toLowerCase();
  const words = lowerName.split(/[\s'.-]+/);
  const foundProfanity = words.find((word) => PROFANITY_LIST.includes(word));
  if (foundProfanity) {
    return {
      valid: false,
      error: "Name contains inappropriate language",
      sanitized: null,
    };
  }

  // Check for spam patterns
  const isSpam = SPAM_PATTERNS.some((pattern) => pattern.test(sanitized));
  if (isSpam) {
    return {
      valid: false,
      error: "This name is not allowed",
      sanitized: null,
    };
  }

  // All checks passed
  return {
    valid: true,
    error: null,
    sanitized,
  };
};
