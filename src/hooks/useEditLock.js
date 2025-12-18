/**
 * useEditLock Hook
 *
 * Manages edit locks for concurrent editing protection.
 *
 * Features:
 * - Acquire lock on edit start
 * - Automatic heartbeat renewal every 20 seconds
 * - Release lock on save/cancel/unmount
 * - Track lock status and ownership
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getAgents } from "../agents";

/**
 * Hook for managing edit locks
 * @param {string} questionId - Question document ID
 * @param {string} userId - Firebase Auth UID
 * @param {string} userEmail - User's email
 * @param {boolean} isViewing - Whether user is currently viewing this question
 * @param {boolean} wasModified - Whether the question was modified (prevents auto-unlock)
 * @param {Function} onLockExpired - Callback when lock expires
 * @returns {object} Lock state and control functions
 */
export function useEditLock(
  questionId,
  userId,
  userEmail,
  isViewing,
  wasModified,
  onLockExpired
) {
  const [lockStatus, setLockStatus] = useState("none"); // 'none' | 'acquiring' | 'acquired' | 'locked_by_other' | 'expired'
  const [lockInfo, setLockInfo] = useState(null);
  const [lockedBy, setLockedBy] = useState(null);
  const heartbeatRef = useRef(null);
  const lockAttemptedRef = useRef(false);
  const viewTimerRef = useRef(null);

  const agents = getAgents();

  /**
   * Acquire an edit lock
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const acquireLock = useCallback(async () => {
    // Check if agents are initialized
    if (!agents) {
      console.warn("[useEditLock] Agents not initialized yet");
      return { success: false, error: "Agents not initialized" };
    }

    if (!questionId || !userId || !userEmail) {
      console.warn(
        "[useEditLock] Missing required parameters for lock acquisition"
      );
      return { success: false, error: "Missing required parameters" };
    }

    setLockStatus("acquiring");
    lockAttemptedRef.current = true;

    const { lockAgent, auditAgent } = agents;

    try {
      const result = await lockAgent.acquireLock(
        String(questionId),
        userId,
        userEmail
      );

      if (result.success) {
        setLockStatus("acquired");
        setLockInfo(result.lock);
        setLockedBy(null);

        // Log acquisition
        await auditAgent.logLockAcquired(
          String(questionId),
          userId,
          userEmail,
          result.action === "stolen"
        );

        console.log(`[useEditLock] Lock acquired for question ${questionId}`);
        return { success: true };
      } else {
        setLockStatus("locked_by_other");
        setLockedBy(result.lockedBy);

        console.warn(`[useEditLock] Lock acquisition failed:`, result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("[useEditLock] Lock acquisition error:", error);
      setLockStatus("none");
      return { success: false, error: error.message };
    }
  }, [questionId, userId, userEmail, agents]);

  /**
   * Renew the lock (heartbeat)
   * @returns {Promise<{success: boolean}>}
   */
  const renewLock = useCallback(async () => {
    if (!agents || !questionId) return { success: false };

    const { lockAgent } = agents;

    try {
      const result = await lockAgent.renewLock(String(questionId));

      if (!result.success) {
        console.warn("[useEditLock] Lock renewal failed:", result.error);
        setLockStatus("expired");

        if (onLockExpired) {
          onLockExpired();
        }
      }

      return result;
    } catch (error) {
      console.error("[useEditLock] Lock renewal error:", error);
      return { success: false, error: error.message };
    }
  }, [questionId, agents, onLockExpired]);

  /**
   * Release the lock
   * @returns {Promise<{success: boolean}>}
   */
  const releaseLock = useCallback(async () => {
    if (!agents || !questionId) return { success: false };

    const { lockAgent, auditAgent } = agents;

    try {
      const result = await lockAgent.releaseLock(String(questionId));

      if (result.success) {
        setLockStatus("none");
        setLockInfo(null);
        setLockedBy(null);

        // Log release
        await auditAgent.logLockReleased(String(questionId), userId, userEmail);

        console.log(`[useEditLock] Lock released for question ${questionId}`);
      }

      return result;
    } catch (error) {
      console.error("[useEditLock] Lock release error:", error);
      return { success: false, error: error.message };
    }
  }, [questionId, userId, userEmail, agents]);

  /**
   * Check current lock status
   * @returns {Promise<{locked: boolean, lock?: object}>}
   */
  const checkLockStatus = useCallback(async () => {
    if (!agents || !questionId) return { locked: false };

    const { lockAgent } = agents;

    try {
      const result = await lockAgent.checkLockStatus(String(questionId));

      if (result.locked) {
        setLockedBy(result.lock);
        setLockStatus("locked_by_other");
      } else {
        setLockStatus("none");
        setLockedBy(null);
      }

      return result;
    } catch (error) {
      console.error("[useEditLock] Lock status check error:", error);
      return { locked: false, error: error.message };
    }
  }, [questionId, agents]);

  // Start heartbeat when lock acquired
  useEffect(() => {
    if (lockStatus !== "acquired") {
      return;
    }

    console.log("[useEditLock] Starting heartbeat for question", questionId);

    // Renew lock every 20 seconds
    heartbeatRef.current = setInterval(async () => {
      const result = await renewLock();

      if (!result.success) {
        console.warn("[useEditLock] Heartbeat failed - clearing interval");
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      }
    }, 20000); // 20 seconds

    return () => {
      if (heartbeatRef.current) {
        console.log(
          "[useEditLock] Stopping heartbeat for question",
          questionId
        );
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [lockStatus, questionId, renewLock]);

  // Release lock on unmount ONLY if question wasn't modified
  useEffect(() => {
    return () => {
      if (lockStatus === "acquired" && !wasModified) {
        console.log("[useEditLock] Releasing lock on unmount (no changes)");
        releaseLock();
      } else if (wasModified) {
        console.log("[useEditLock] Keeping lock - question was modified");
      }
    };
  }, [lockStatus, wasModified, releaseLock]);

  // Auto-acquire lock after 1 second of viewing
  useEffect(() => {
    if (!isViewing || lockAttemptedRef.current) {
      // Clear any pending timer if we stop viewing
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
      return;
    }

    // Start a 1-second timer to acquire lock
    console.log("[useEditLock] User viewing question - starting 1s timer");
    viewTimerRef.current = setTimeout(() => {
      console.log("[useEditLock] Auto-acquiring lock after 1s view");
      acquireLock();
    }, 1000);

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
    };
  }, [isViewing, acquireLock]);

  // Reset attempt flag when no longer viewing
  useEffect(() => {
    if (!isViewing) {
      lockAttemptedRef.current = false;
    }
  }, [isViewing]);

  return {
    lockStatus,
    lockInfo,
    lockedBy,
    isLocked: lockStatus === "locked_by_other",
    hasLock: lockStatus === "acquired",
    isAcquiring: lockStatus === "acquiring",
    isExpired: lockStatus === "expired",
    acquireLock,
    renewLock,
    releaseLock,
    checkLockStatus,
  };
}
