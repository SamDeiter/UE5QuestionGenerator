/**
 * Lock Agent
 *
 * Responsibility: Acquire, renew, and release edit locks for questions.
 *
 * Key Operations:
 * - acquireLock: Try to acquire a lock (create or steal expired lock)
 * - renewLock: Extend lock expiration (heartbeat)
 * - releaseLock: Delete lock when done editing
 *
 * Lock TTL: 60 seconds (configurable)
 * Heartbeat Interval: 20 seconds (recommended)
 */

import {
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { logger } from "../utils/logger";

export class LockAgent {
  /**
   * @param {Firestore} db - Firestore database instance
   * @param {SessionAgent} sessionAgent - Session agent instance
   */
  constructor(db, sessionAgent) {
    this.db = db;
    this.sessionAgent = sessionAgent;
    this.LOCK_TTL_MS = 60000; // 60 seconds
  }

  /**
   * Acquire an edit lock for a question
   * @param {string} questionId - Question document ID
   * @param {string} userId - Firebase Auth UID
   * @param {string} userEmail - User's email
   * @returns {Promise<{success: boolean, lock?: object, error?: string, lockedBy?: object}>}
   */
  async acquireLock(questionId, userId, userEmail) {
    const sessionId = this.sessionAgent.getSessionId();
    const lockRef = doc(this.db, "edit-locks", questionId);

    try {
      const result = await runTransaction(this.db, async (transaction) => {
        const lockSnap = await transaction.get(lockRef);
        const now = Date.now();
        const expiresAt = now + this.LOCK_TTL_MS;

        // Case 1: No lock exists - create new lock
        if (!lockSnap.exists()) {
          const newLock = {
            sessionId,
            userId,
            userEmail,
            acquiredAt: serverTimestamp(),
            expiresAt: new Date(expiresAt),
            lastHeartbeat: serverTimestamp(),
            lockVersion: 1,
            isActive: true,
          };
          transaction.set(lockRef, newLock);
          return { success: true, lock: newLock, action: "created" };
        }

        // Case 2: Lock exists
        const existingLock = lockSnap.data();
        const lockExpired = existingLock.expiresAt.toMillis() < now;

        // Case 2a: Lock expired - steal it
        if (lockExpired) {
          const newLock = {
            sessionId,
            userId,
            userEmail,
            acquiredAt: serverTimestamp(),
            expiresAt: new Date(expiresAt),
            lastHeartbeat: serverTimestamp(),
            lockVersion: 1,
            isActive: true,
          };
          transaction.set(lockRef, newLock);
          return {
            success: true,
            lock: newLock,
            action: "stolen",
            previousOwner: existingLock.userEmail,
          };
        }

        // Case 2b: Lock active and owned by this session - renew it
        if (existingLock.sessionId === sessionId) {
          const renewedLock = {
            ...existingLock,
            expiresAt: new Date(expiresAt),
            lastHeartbeat: serverTimestamp(),
            lockVersion: (existingLock.lockVersion || 0) + 1,
          };
          transaction.update(lockRef, renewedLock);
          return { success: true, lock: renewedLock, action: "renewed" };
        }

        // Case 2c: Lock active and owned by different session - reject
        return {
          success: false,
          error: `Question is being edited by ${existingLock.userEmail}`,
          lockedBy: existingLock,
          action: "rejected",
        };
      });

      if (result.success) {
        logger.log(
          `[LockAgent] Lock ${result.action} for question ${questionId}`
        );
      } else {
        logger.warn(
          `[LockAgent] Lock acquisition ${result.action}:`,
          result.error
        );
      }

      return result;
    } catch (error) {
      const isNetwork = this._isNetworkError(error);
      if (isNetwork) {
        logger.warn("[LockAgent] acquireLock network failure:", error.message);
      } else {
        logger.error("[LockAgent] acquireLock failed:", error);
      }
      return {
        success: false,
        error: error.message,
        isNetworkError: isNetwork,
      };
    }
  }

  /**
   * Renew an existing lock (heartbeat)
   * @param {string} questionId - Question document ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async renewLock(questionId) {
    const sessionId = this.sessionAgent.getSessionId();
    const lockRef = doc(this.db, "edit-locks", questionId);

    try {
      const result = await runTransaction(this.db, async (transaction) => {
        const lockSnap = await transaction.get(lockRef);

        if (!lockSnap.exists()) {
          return { success: false, error: "Lock does not exist" };
        }

        const lock = lockSnap.data();

        // Only renew if we own the lock
        if (lock.sessionId !== sessionId) {
          return { success: false, error: "Lock owned by different session" };
        }

        // Check if lock is still valid
        const now = Date.now();
        if (lock.expiresAt.toMillis() < now) {
          return { success: false, error: "Lock has expired" };
        }

        // Renew the lock
        const expiresAt = now + this.LOCK_TTL_MS;
        const renewedLock = {
          ...lock,
          expiresAt: new Date(expiresAt),
          lastHeartbeat: serverTimestamp(),
          lockVersion: (lock.lockVersion || 0) + 1,
        };

        transaction.update(lockRef, renewedLock);
        return { success: true };
      });

      if (result.success) {
        logger.log(`[LockAgent] Lock renewed for question ${questionId}`);
      } else {
        logger.warn(`[LockAgent] Lock renewal failed:`, result.error);
      }

      return result;
    } catch (error) {
      const isNetwork = this._isNetworkError(error);
      // Suppress full error for network issues to avoid console spam during heartbeat
      if (isNetwork) {
        logger.warn("[LockAgent] renewLock network failure:", error.message);
      } else {
        logger.error("[LockAgent] renewLock failed:", error);
      }
      return {
        success: false,
        error: error.message,
        isNetworkError: isNetwork,
      };
    }
  }

  /**
   * Release a lock (delete it)
   * @param {string} questionId - Question document ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async releaseLock(questionId) {
    const sessionId = this.sessionAgent.getSessionId();
    const lockRef = doc(this.db, "edit-locks", questionId);

    try {
      await runTransaction(this.db, async (transaction) => {
        const lockSnap = await transaction.get(lockRef);

        if (!lockSnap.exists()) {
          return; // Already released
        }

        const lock = lockSnap.data();

        // Only release if we own it
        if (lock.sessionId === sessionId) {
          transaction.delete(lockRef);
        }
      });

      logger.log(`[LockAgent] Lock released for question ${questionId}`);
      return { success: true };
    } catch (error) {
      logger.error("[LockAgent] releaseLock failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a lock exists and is active
   * @param {string} questionId - Question document ID
   * @returns {Promise<{locked: boolean, lock?: object}>}
   */
  async checkLockStatus(questionId) {
    const lockRef = doc(this.db, "edit-locks", questionId);

    try {
      const lockSnap = await getDoc(lockRef);

      if (!lockSnap.exists()) {
        return { locked: false };
      }

      const lock = lockSnap.data();
      const now = Date.now();
      const isExpired = lock.expiresAt.toMillis() < now;

      if (isExpired) {
        return { locked: false, expiredLock: lock };
      }

      return { locked: true, lock };
    } catch (error) {
      logger.error("[LockAgent] checkLockStatus failed:", error);
      return { locked: false, error: error.message };
    }
  }

  _isNetworkError(error) {
    const networkCodes = [
      "unavailable",
      "deadline-exceeded",
      "resource-exhausted",
      "internal",
      "unknown",
    ];
    return (
      (error.code && networkCodes.includes(error.code)) ||
      error.message?.includes("net::ERR_CONNECTION_CLOSED") ||
      error.message?.includes("network")
    );
  }
}
