/**
 * Audit Agent
 *
 * Responsibility: Log all lock and save events for debugging and compliance.
 *
 * Event Types:
 * - lock_acquired
 * - lock_renewed
 * - lock_expired
 * - lock_released
 * - save_success
 * - save_conflict
 * - save_error
 *
 * Severity Levels:
 * - info: Normal operations
 * - warning: Non-critical issues
 * - error: Critical failures
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export class AuditAgent {
  /**
   * @param {Firestore} db - Firestore database instance
   * @param {SessionAgent} sessionAgent - Session agent instance
   */
  constructor(db, sessionAgent) {
    this.db = db;
    this.sessionAgent = sessionAgent;
  }

  /**
   * Log an event to the audit log
   * @param {string} eventType - Type of event
   * @param {string} questionId - Question document ID
   * @param {string} userId - Firebase Auth UID
   * @param {string} userEmail - User's email
   * @param {object} details - Additional event details
   * @returns {Promise<void>}
   */
  async logEvent(eventType, questionId, userId, userEmail, details = {}) {
    const sessionId = this.sessionAgent.getSessionId();

    try {
      await addDoc(collection(this.db, "audit-log"), {
        eventType,
        questionId,
        sessionId,
        userId,
        userEmail,
        timestamp: serverTimestamp(),
        details,
        severity: this._getSeverity(eventType),
        userAgent: navigator.userAgent,
      });

      console.log(
        `[AuditAgent] Logged event: ${eventType} for question ${questionId}`
      );
    } catch (error) {
      // Don't block operations if audit logging fails
      console.error("[AuditAgent] Failed to log event:", error);
    }
  }

  /**
   * Get severity level for an event type
   * @private
   * @param {string} eventType - Type of event
   * @returns {string} Severity level
   */
  _getSeverity(eventType) {
    const severityMap = {
      lock_acquired: "info",
      lock_renewed: "info",
      lock_expired: "warning",
      lock_released: "info",
      lock_stolen: "warning",
      save_success: "info",
      save_conflict: "warning",
      save_error: "error",
      lock_error: "error",
    };

    return severityMap[eventType] || "info";
  }

  /**
   * Log a lock acquisition event
   * @param {string} questionId - Question document ID
   * @param {string} userId - Firebase Auth UID
   * @param {string} userEmail - User's email
   * @param {boolean} wasStolen - Whether lock was stolen from expired session
   * @returns {Promise<void>}
   */
  async logLockAcquired(questionId, userId, userEmail, wasStolen = false) {
    await this.logEvent(
      wasStolen ? "lock_stolen" : "lock_acquired",
      questionId,
      userId,
      userEmail,
      { wasStolen }
    );
  }

  /**
   * Log a lock renewal event
   * @param {string} questionId - Question document ID
   * @param {string} userId - Firebase Auth UID
   * @param {string} userEmail - User's email
   * @param {number} lockVersion - Current lock version
   * @returns {Promise<void>}
   */
  async logLockRenewed(questionId, userId, userEmail, lockVersion) {
    await this.logEvent("lock_renewed", questionId, userId, userEmail, {
      lockVersion,
    });
  }

  /**
   * Log a lock release event
   * @param {string} questionId - Question document ID
   * @param {string} userId - Firebase Auth UID
   * @param {string} userEmail - User's email
   * @returns {Promise<void>}
   */
  async logLockReleased(questionId, userId, userEmail) {
    await this.logEvent("lock_released", questionId, userId, userEmail);
  }

  /**
   * Log a successful save event
   * @param {string} questionId - Question document ID
   * @param {string} userId - Firebase Auth UID
   * @param {string} userEmail - User's email
   * @param {number} oldVersion - Previous version
   * @param {number} newVersion - New version
   * @returns {Promise<void>}
   */
  async logSaveSuccess(questionId, userId, userEmail, oldVersion, newVersion) {
    await this.logEvent("save_success", questionId, userId, userEmail, {
      oldVersion,
      newVersion,
    });
  }

  /**
   * Log a version conflict event
   * @param {string} questionId - Question document ID
   * @param {string} userId - Firebase Auth UID
   * @param {string} userEmail - User's email
   * @param {number} expectedVersion - Expected version
   * @param {number} actualVersion - Actual current version
   * @returns {Promise<void>}
   */
  async logSaveConflict(
    questionId,
    userId,
    userEmail,
    expectedVersion,
    actualVersion
  ) {
    await this.logEvent("save_conflict", questionId, userId, userEmail, {
      expectedVersion,
      actualVersion,
    });
  }

  /**
   * Log a save error event
   * @param {string} questionId - Question document ID
   * @param {string} userId - Firebase Auth UID
   * @param {string} userEmail - User's email
   * @param {string} errorType - Type of error
   * @param {string} errorMessage - Error message
   * @returns {Promise<void>}
   */
  async logSaveError(questionId, userId, userEmail, errorType, errorMessage) {
    await this.logEvent("save_error", questionId, userId, userEmail, {
      errorType,
      errorMessage,
    });
  }

  /**
   * Log a lock error event
   * @param {string} questionId - Question document ID
   * @param {string} userId - Firebase Auth UID
   * @param {string} userEmail - User's email
   * @param {string} errorMessage - Error message
   * @returns {Promise<void>}
   */
  async logLockError(questionId, userId, userEmail, errorMessage) {
    await this.logEvent("lock_error", questionId, userId, userEmail, {
      errorMessage,
    });
  }
}
