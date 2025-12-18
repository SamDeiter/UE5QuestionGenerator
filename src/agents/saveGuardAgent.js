/**
 * Save Guard Agent
 *
 * Responsibility: Perform version-checked writes using Firestore transactions.
 *
 * Key Operations:
 * 1. Validate lock ownership and expiration
 * 2. Validate version (optimistic concurrency control)
 * 3. Atomic write with version increment
 * 4. Release lock after successful save
 *
 * Error Types:
 * - LOCK_MISSING: No active lock found
 * - LOCK_STOLEN: Lock owned by different session
 * - LOCK_EXPIRED: Lock has expired
 * - VERSION_CONFLICT: Another user has saved changes
 * - QUESTION_DELETED: Question no longer exists
 */

import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

export class SaveGuardAgent {
  /**
   * @param {Firestore} db - Firestore database instance
   * @param {SessionAgent} sessionAgent - Session agent instance
   */
  constructor(db, sessionAgent) {
    this.db = db;
    this.sessionAgent = sessionAgent;
  }

  /**
   * Save a question with version checking
   * @param {string} questionId - Question document ID
   * @param {object} updates - Fields to update
   * @param {number} expectedVersion - Expected current version
   * @param {string} userId - Firebase Auth UID
   * @param {string} userEmail - User's email
   * @returns {Promise<{success: boolean, newVersion?: number, error?: string, errorType?: string}>}
   */
  async saveQuestion(questionId, updates, expectedVersion, userId, userEmail) {
    const sessionId = this.sessionAgent.getSessionId();
    const questionRef = doc(this.db, "questions", questionId);
    const lockRef = doc(this.db, "edit-locks", questionId);

    try {
      const result = await runTransaction(this.db, async (transaction) => {
        // Step 1: Validate lock ownership
        const lockSnap = await transaction.get(lockRef);

        if (!lockSnap.exists()) {
          throw new Error("LOCK_MISSING: No active lock. Cannot save.");
        }

        const lock = lockSnap.data();
        const now = Date.now();

        if (lock.sessionId !== sessionId) {
          throw new Error(
            `LOCK_STOLEN: Question is locked by ${lock.userEmail}`
          );
        }

        if (lock.expiresAt.toMillis() < now) {
          throw new Error(
            "LOCK_EXPIRED: Your edit lock has expired. Please reload."
          );
        }

        // Step 2: Validate version (optimistic concurrency control)
        const questionSnap = await transaction.get(questionRef);

        if (!questionSnap.exists()) {
          throw new Error("QUESTION_DELETED: Question no longer exists.");
        }

        const currentQuestion = questionSnap.data();
        const currentVersion = currentQuestion.version || 1;

        if (currentVersion !== expectedVersion) {
          throw new Error(
            `VERSION_CONFLICT: Expected version ${expectedVersion}, but current is ${currentVersion}. ` +
              `Another user has saved changes.`
          );
        }

        // Step 3: Atomic write with version increment
        const newVersion = currentVersion + 1;
        const savePayload = {
          ...updates,
          version: newVersion,
          updatedAt: serverTimestamp(),
          updatedBy: userId,
          lastEditedBy: {
            uid: userId,
            email: userEmail,
            displayName: userEmail.split("@")[0],
          },
        };

        transaction.update(questionRef, savePayload);

        // Step 4: Delete the lock (save complete)
        transaction.delete(lockRef);

        return { success: true, newVersion };
      });

      console.log(
        `[SaveGuard] Save successful for question ${questionId}. New version: ${result.newVersion}`
      );
      return result;
    } catch (error) {
      console.error("[SaveGuard] Save failed:", error);

      // Parse error type
      const errorMessage = error.message || error.toString();

      if (errorMessage.includes("VERSION_CONFLICT")) {
        return {
          success: false,
          error: errorMessage,
          errorType: "VERSION_CONFLICT",
        };
      }

      if (errorMessage.includes("LOCK_EXPIRED")) {
        return {
          success: false,
          error: errorMessage,
          errorType: "LOCK_EXPIRED",
        };
      }

      if (errorMessage.includes("LOCK_STOLEN")) {
        return {
          success: false,
          error: errorMessage,
          errorType: "LOCK_STOLEN",
        };
      }

      if (errorMessage.includes("LOCK_MISSING")) {
        return {
          success: false,
          error: errorMessage,
          errorType: "LOCK_MISSING",
        };
      }

      if (errorMessage.includes("QUESTION_DELETED")) {
        return {
          success: false,
          error: errorMessage,
          errorType: "QUESTION_DELETED",
        };
      }

      return {
        success: false,
        error: errorMessage,
        errorType: "UNKNOWN",
      };
    }
  }

  /**
   * Save question status change (accept/reject)
   * @param {string} questionId - Question document ID
   * @param {string} status - New status ('accepted' | 'rejected' | 'pending')
   * @param {number} expectedVersion - Expected current version
   * @param {string} userId - Firebase Auth UID
   * @param {string} userEmail - User's email
   * @param {object} additionalData - Additional data (e.g., rejection reason)
   * @returns {Promise<{success: boolean, newVersion?: number, error?: string, errorType?: string}>}
   */
  async saveQuestionStatus(
    questionId,
    status,
    expectedVersion,
    userId,
    userEmail,
    additionalData = {}
  ) {
    const updates = {
      status,
      ...additionalData,
    };

    return this.saveQuestion(
      questionId,
      updates,
      expectedVersion,
      userId,
      userEmail
    );
  }

  /**
   * Save without lock validation (for bulk operations or admin overrides)
   * WARNING: Use sparingly - bypasses concurrency protection
   * @param {string} questionId - Question document ID
   * @param {object} updates - Fields to update
   * @param {number} expectedVersion - Expected current version
   * @param {string} userId - Firebase Auth UID
   * @param {string} userEmail - User's email
   * @returns {Promise<{success: boolean, newVersion?: number, error?: string, errorType?: string}>}
   */
  async saveQuestionUnsafe(
    questionId,
    updates,
    expectedVersion,
    userId,
    userEmail
  ) {
    const questionRef = doc(this.db, "questions", questionId);

    try {
      const result = await runTransaction(this.db, async (transaction) => {
        const questionSnap = await transaction.get(questionRef);

        if (!questionSnap.exists()) {
          throw new Error("QUESTION_DELETED: Question no longer exists.");
        }

        const currentQuestion = questionSnap.data();
        const currentVersion = currentQuestion.version || 1;

        if (currentVersion !== expectedVersion) {
          throw new Error(
            `VERSION_CONFLICT: Expected version ${expectedVersion}, but current is ${currentVersion}.`
          );
        }

        const newVersion = currentVersion + 1;
        const savePayload = {
          ...updates,
          version: newVersion,
          updatedAt: serverTimestamp(),
          updatedBy: userId,
        };

        transaction.update(questionRef, savePayload);

        return { success: true, newVersion };
      });

      console.warn(
        `[SaveGuard] UNSAFE save successful for question ${questionId}. New version: ${result.newVersion}`
      );
      return result;
    } catch (error) {
      console.error("[SaveGuard] Unsafe save failed:", error);
      const errorMessage = error.message || error.toString();

      if (errorMessage.includes("VERSION_CONFLICT")) {
        return {
          success: false,
          error: errorMessage,
          errorType: "VERSION_CONFLICT",
        };
      }

      return {
        success: false,
        error: errorMessage,
        errorType: "UNKNOWN",
      };
    }
  }
}
