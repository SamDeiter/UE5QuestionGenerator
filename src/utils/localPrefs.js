import { logger } from "../utils/logger";
/**
 * Local preference storage — a thin wrapper around `window.localStorage`
 * with JSON encoding.
 *
 * Renamed from `secureStorage.js` (with `setSecureItem` / `getSecureItem`)
 * because the file *was* an encryption wrapper at one point, but the
 * encryption was removed when API keys moved to Cloud Functions. The old
 * names mis-described the contract — anything stored here is in plain
 * text in `localStorage` and a malicious browser extension or XSS payload
 * can read it. Treat it as cache for UI preferences, not as a vault.
 *
 * Callers MUST NOT store credentials, session tokens, or anything that
 * would harm the user if read in plaintext.
 */

/**
 * Store a value in localStorage under `key` (JSON-encoded).
 * Errors are logged and swallowed (storage quota, private-mode browsers).
 */
export const setLocalPref = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    logger.error(`Failed to store ${key}:`, err);
  }
};

/**
 * Read a value from localStorage. Returns null if missing or if the
 * stored JSON is unparseable.
 */
export const getLocalPref = (key) => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    logger.warn(`Could not parse ${key}, returning null`);
    return null;
  }
};
