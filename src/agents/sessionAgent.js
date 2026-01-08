import { logger } from "../utils/logger";
/**
 * Session Agent
 *
 * Responsibility: Identify and manage the unique session ID for the current browser tab.
 *
 * Key Behavior:
 * - Session ID is stored in sessionStorage (dies with tab close)
 * - Each browser tab gets a unique UUID
 * - Survives page refreshes within the same tab
 */

/**
 * Generate a UUID v4
 * NOTE: Using Math.random for session ID generation - acceptable for unique IDs, not security.
 * @returns {string} UUID string
 */
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    // eslint-disable-next-line sonarjs/pseudo-random
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class SessionAgent {
  constructor() {
    this.SESSION_KEY = "EDIT_SESSION_ID";
    this.sessionId = this._initSession();
  }

  /**
   * Initialize or restore session ID from sessionStorage
   * @private
   * @returns {string} Session ID
   */
  _initSession() {
    let sessionId = sessionStorage.getItem(this.SESSION_KEY);

    if (!sessionId) {
      sessionId = generateUUID();
      sessionStorage.setItem(this.SESSION_KEY, sessionId);
      logger.log("[SessionAgent] New session created:", sessionId);
    } else {
      logger.log("[SessionAgent] Existing session restored:", sessionId);
    }

    return sessionId;
  }

  /**
   * Get the current session ID
   * @returns {string} Session ID
   */
  getSessionId() {
    return this.sessionId;
  }

  /**
   * Clear the session (for logout or testing)
   */
  clearSession() {
    sessionStorage.removeItem(this.SESSION_KEY);
    logger.log("[SessionAgent] Session cleared");
  }
}

// Create a singleton instance
let sessionAgentInstance = null;

/**
 * Get the singleton SessionAgent instance
 * @returns {SessionAgent}
 */
export function getSessionAgent() {
  if (!sessionAgentInstance) {
    sessionAgentInstance = new SessionAgent();
  }
  return sessionAgentInstance;
}
