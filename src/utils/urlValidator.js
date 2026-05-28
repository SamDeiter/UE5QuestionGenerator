/**
 * URL Validator - Validates Epic Games documentation URLs
 * Checks for known-valid patterns and rejects invalid/generic slugs
 *
 * Data moved to urlValidatorData.js for maintainability
 */
import {
  KNOWN_VALID_SLUGS,
  INVALID_PATTERNS,
  REQUIRES_SUFFIX_PATTERNS,
} from "./urlValidatorData";

/**
 * Validates a documentation URL
 * @param {string} url - The URL to validate
 * @returns {{ isValid: boolean, confidence: number, warning: string | null }}
 */
export function validateURL(url) {
  // No URL provided
  if (!url || url.trim() === "") {
    return {
      isValid: false,
      confidence: 0,
      warning: "Missing documentation URL",
    };
  }

  // Trim whitespace
  url = url.trim();

  // Must start with Epic Games documentation base
  const baseURL =
    "https://dev.epicgames.com/documentation/en-us/unreal-engine/";

  if (!url.startsWith(baseURL)) {
    return {
      isValid: false,
      confidence: 0,
      warning: "Not an Epic Games documentation URL",
    };
  }

  // Extract the slug (path after base URL)
  const slug = url.replace(baseURL, "").split("#")[0].split("?")[0];

  // Check if slug is empty
  if (!slug || slug.trim() === "") {
    return {
      isValid: false,
      confidence: 10,
      warning: "URL has no specific page path",
    };
  }

  // Check against known invalid patterns
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(slug)) {
      return {
        isValid: false,
        confidence: 20,
        warning: `Invalid URL pattern: "${slug}"`,
      };
    }
  }

  // Check for double hyphens (always invalid)
  if (slug.includes("--")) {
    return {
      isValid: false,
      confidence: 30,
      warning: "URL has double hyphens",
    };
  }

  // Check if it's a known valid slug
  if (KNOWN_VALID_SLUGS.has(slug)) {
    return { isValid: true, confidence: 100, warning: null };
  }

  // Check if slug should have "-in-unreal-engine" suffix but doesn't
  for (const term of REQUIRES_SUFFIX_PATTERNS) {
    if (slug.includes(term) && !slug.endsWith("-in-unreal-engine")) {
      // Could be valid, but flagged
      return {
        isValid: true,
        confidence: 60,
        warning: `URL may be missing "-in-unreal-engine" suffix`,
      };
    }
  }

  // Check for reasonable slug structure (lowercase, hyphens, reasonable length)
  if (slug.length < 10) {
    return {
      isValid: true,
      confidence: 40,
      warning: "URL slug seems too short",
    };
  }

  // Looks reasonable but not verified
  return { isValid: true, confidence: 70, warning: null };
}

/**
 * Asserts a URL uses http or https scheme. Returns the trimmed URL string
 * if the protocol is allowed, otherwise null.
 *
 * Used to gate AI-supplied links (grounding sources, doc links) before
 * rendering them in href attributes — blocks javascript:, data:, file:,
 * vbscript:, etc. from reaching the DOM.
 *
 * @param {string} url
 * @returns {string | null}
 */
export function assertHttpUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * Strict hostname-based check for Epic Games domains. Previous substring
 * check matched anywhere in the URL, so "https://evil.com/epicgames.com"
 * passed. This parses the URL and verifies the hostname matches
 * epicgames.com or unrealengine.com (or any sub-domain).
 * @param {string} url
 * @returns {boolean}
 */
export function isEpicLink(url) {
  if (!url || typeof url !== "string") return false;
  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  return (
    host === "epicgames.com" ||
    host.endsWith(".epicgames.com") ||
    host === "unrealengine.com" ||
    host.endsWith(".unrealengine.com")
  );
}

// eslint-disable-next-line no-unused-vars
function validateURLsBatch(questions) {
  return questions.map((q) => ({
    ...q,
    urlValidation: validateURL(q.SourceURL || q.sourceUrl),
  }));
}

export default validateURL;
