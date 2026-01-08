import { logger } from "../utils/logger";
/**
 * localStorage wrapper (encryption removed - API key now server-side)
 *
 * Simple JSON storage - no encryption needed since all sensitive operations
 * (Gemini API calls) go through Cloud Functions.
 */

/**
 * Store item in localStorage
 */
export const setSecureItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    logger.error(`Failed to store ${key}:`, err);
  }
};

/**
 * Retrieve item from localStorage
 */
export const getSecureItem = (key) => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    logger.warn(`Could not parse ${key}, returning null`);
    return null;
  }
};
