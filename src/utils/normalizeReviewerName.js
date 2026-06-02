/**
 * normalizeReviewerName.js - Shared reviewer name normalization utility
 *
 * Consolidates reviewer identification across the app by:
 * 1. Mapping known emails to display names (map is injected at runtime —
 *    no PII baked into the bundle)
 * 2. Fixing duplicated names like "Sam DeiterSam Deiter"
 * 3. Filtering out invalid values
 *
 * Previously, a hardcoded EMAIL_TO_NAME_MAP shipped real reviewer emails
 * and names in the client bundle. That data is gone. The default lookup
 * map is empty; callers that want curated display names should hydrate
 * it at app startup by calling `setReviewerNameMap()` with data fetched
 * from a server (e.g., a Firestore /config/reviewerNames document).
 *
 * Without a hydrated map, the function still works — emails fall through
 * to a derived-from-local-part display name (e.g., "sam.deiter@..." →
 * "Sam Deiter").
 */

// Runtime-injectable email→display-name map. Initially empty.
let EMAIL_TO_NAME_MAP = Object.create(null);

/**
 * Replaces the runtime email-to-name lookup with the supplied object.
 * Call this once at app startup with data fetched from a trusted server
 * if you want curated display names.
 *
 * @param {Record<string, string>} mapping - { lowercased-email: "Display Name" }
 */
export const setReviewerNameMap = (mapping) => {
  if (!mapping || typeof mapping !== "object") return;
  const next = Object.create(null);
  for (const [k, v] of Object.entries(mapping)) {
    if (typeof k === "string" && typeof v === "string" && v.trim()) {
      next[k.toLowerCase()] = v.trim();
    }
  }
  EMAIL_TO_NAME_MAP = next;
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

export default normalizeReviewerName;
