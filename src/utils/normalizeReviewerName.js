/**
 * normalizeReviewerName.js - Shared reviewer name normalization utility
 *
 * Consolidates reviewer identification across the app by:
 * 1. Mapping known emails to display names
 * 2. Fixing duplicated names like "Sam DeiterSam Deiter"
 * 3. Filtering out invalid values
 */

// ============================================================================
// EMAIL TO DISPLAY NAME MAPPING
// ============================================================================
// Add new team members here as needed

const EMAIL_TO_NAME_MAP = {
  // Epic Games team members
  "sam.deiter@epicgames.com": "Sam Deiter",
  "sean.spitzer@epicgames.com": "Sean Spitzer",
  "stephan.rueb.dcc@gmail.com": "Stephan Rüb",
  "edward.bennett@epicgames.com": "Edward Bennett",
  "luis.cataldi@ea.epicgames.com": "Luis Cataldi",
  "luis.cataldi@epicgames.com": "Luis Cataldi",
  "james.hill@epicgames.com": "James Hill",
  "emanuele.salvucci@epicgames.com": "Emanuele Salvucci",
  "stephane.blanc@epicgames.com": "Stephane Blanc",
  "mahmoud.alkawadri@epicgames.com": "Mahmoud Alkawadri",
  // Gmail users (extracted from chart data)
  "samdeiter@gmail.com": "Sam Deiter",
  "gregbert77@gmail.com": "Greg Berridge",
  // Name variations that should be normalized
  Gregbert77: "Greg Berridge",
  gregbert77: "Greg Berridge",
};

// Names that should be filtered out entirely
const INVALID_NAMES = ["unknown", "user", "undefined", "null", "", "anonymous"];

/**
 * Normalizes a reviewer identifier (name or email) to a consistent display name
 * @param {string} rawName - The raw name or email from the question data
 * @returns {string|null} Normalized display name, or null if invalid
 */
export const normalizeReviewerName = (rawName) => {
  if (!rawName || typeof rawName !== "string") return null;

  const trimmed = rawName.trim();

  // Filter out invalid names
  if (INVALID_NAMES.includes(trimmed.toLowerCase())) return null;

  // Check if it's an email we have a mapping for
  const lowerTrimmed = trimmed.toLowerCase();
  if (EMAIL_TO_NAME_MAP[lowerTrimmed]) {
    return EMAIL_TO_NAME_MAP[lowerTrimmed];
  }

  // If it looks like an email but we don't have a mapping, extract a readable name
  if (trimmed.includes("@")) {
    // Try to create a readable name from email (e.g., "john.doe@example.com" -> "John Doe")
    const localPart = trimmed.split("@")[0];
    // Split on dots, underscores, or hyphens
    const parts = localPart.split(/[._-]/);
    // Capitalize each part
    const name = parts
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
    return name;
  }

  // Detect and fix duplicated names: "NameName" pattern
  // Minimum length of 2 to avoid false positives on short strings
  const MIN_HALF_NAME_LENGTH = 2;
  const halfLen = Math.floor(trimmed.length / MIN_HALF_NAME_LENGTH);
  const firstHalf = trimmed.substring(0, halfLen);
  const secondHalf = trimmed.substring(halfLen);

  if (firstHalf === secondHalf && firstHalf.length > MIN_HALF_NAME_LENGTH) {
    return firstHalf;
  }

  return trimmed;
};

/**
 * Gets a reviewer identifier from a question object
 * Checks multiple fields in priority order
 * @param {Object} question - The question object
 * @returns {string|null} Normalized reviewer name, or null if none found
 */
const getReviewerFromQuestion = (question) => {
  if (!question) return null;

  // Check fields in priority order for review actions
  const rawReviewer =
    question.humanVerifiedBy || question.acceptedBy || question.reviewerName;

  return normalizeReviewerName(rawReviewer);
};

/**
 * Adds a new email-to-name mapping at runtime
 * (Useful for dynamically discovered team members)
 * @param {string} email - The email address
 * @param {string} displayName - The display name to use
 */
const addEmailMapping = (email, displayName) => {
  if (email && displayName) {
    EMAIL_TO_NAME_MAP[email.toLowerCase()] = displayName;
  }
};

export default normalizeReviewerName;
