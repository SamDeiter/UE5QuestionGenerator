/**
 * useEditLock Hook
 *
 * Manages edit locks for concurrent editing protection.
 *
 * Features:
 * - Acquire lock on edit start (or after 1s viewing)
 * - Automatic heartbeat renewal every 30 seconds
 * - Release lock on save/cancel/unmount
 * - Track lock status and ownership
 * - Re-attempt lock acquisition when tab regains focus (if previously blocked)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getAgents } from "../agents";

// =========================================================================
// GLOBAL LOCK STATE - Persists across component remounts
// =========================================================================
// When components remount (e.g., due to parent re-renders), internal refs reset.
// This module-level state tracks active locks so we don't release on unmount
// and immediately re-acquire on remount.
const globalLockState = {
  activeLocks: new Map(), // questionId -> { userId, timeoutId }
};

// Mark lock as active and cancel any pending release
function markLockActive(questionId, userId) {
  const existing = globalLockState.activeLocks.get(questionId);
  if (existing?.timeoutId) {
    clearTimeout(existing.timeoutId);
  }
  globalLockState.activeLocks.set(questionId, { userId, timeoutId: null });
}

// Schedule delayed release - allows time for remount to cancel it
function scheduleLockRelease(questionId, releaseCallback) {
  const existing = globalLockState.activeLocks.get(questionId);
  if (existing?.timeoutId) {
    clearTimeout(existing.timeoutId);
  }
  
  const timeoutId = setTimeout(() => {
    console.log(`[useEditLock] Executing delayed release for: ${questionId}`);
    globalLockState.activeLocks.delete(questionId);
    releaseCallback();
  }, 2000); // 2 second delay allows component to remount and cancel
  
  globalLockState.activeLocks.set(questionId, { 
    ...existing, 
    timeoutId 
  });
}

// Check if user already has an active lock
function hasActiveLock(questionId, userId) {
  const lock = globalLockState.activeLocks.get(questionId);
  return lock && lock.userId === userId;
}

// Clear lock state (on explicit release or navigation)
function _clearLockState(questionId) {
  const existing = globalLockState.activeLocks.get(questionId);
  if (existing?.timeoutId) {
    clearTimeout(existing.timeoutId);
  }
  globalLockState.activeLocks.delete(questionId);
}

/**
 * Hook for managing edit locks
 * @param {string} questionId - Question document ID
 * @param {string} userId - Firebase Auth UID
 * @param {string} userEmail - User's email
 * @param {boolean} isViewing - Whether user is currently viewing this question
 * @param {Function} onLockExpired - Callback when lock expires
 * @param {boolean} isProcessing - Guard to prevent lock release during active save
 * @returns {object} Lock state and control functions
 */
export function useEditLock(
  questionId,
  userId,
  userEmail,
  isViewing,
  onLockExpired,
  isProcessing = false
) {
  const [lockStatus, setLockStatus] = useState("none"); // 'none' | 'acquiring' | 'acquired' | 'locked_by_other' | 'expired'
  const [lockInfo, setLockInfo] = useState(null);
  const [lockedBy, setLockedBy] = useState(null);

  // Refs for interval/timer management
  const heartbeatRef = useRef(null);
  const lockAttemptedRef = useRef(false);
  const viewTimerRef = useRef(null);
  const consecutiveFailuresRef = useRef(0);

  // Refs ONLY for cleanup/unmount logic (closures can be stale)
  const lockStatusRef = useRef(lockStatus);
  const isProcessingRef = useRef(isProcessing);

  // Keep cleanup refs updated
  useEffect(() => {
    lockStatusRef.current = lockStatus;
    isProcessingRef.current = isProcessing;
  }, [lockStatus, isProcessing]);

  const agents = getAgents();

  /**
   * Acquire an edit lock
   */
  const acquireLock = useCallback(async () => {
    // Use ref to check current status (avoids stale closure)
    if (lockStatusRef.current === "acquired") {
      return { success: true };
    }

    if (!agents) {
      console.warn("[useEditLock] Agents not initialized yet");
      return { success: false, error: "Agents not initialized" };
    }

    if (!questionId || !userId || !userEmail) {
      console.warn("[useEditLock] Missing required parameters");
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
        
        // Mark lock active in global state to survive remounts
        markLockActive(questionId, userId);

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
        // LockAgent.acquireLock returns { lockedBy: existingLock } on rejection
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
   */
  const renewLock = useCallback(async () => {
    if (!agents || !questionId) return { success: false };

    const { lockAgent } = agents;

    try {
      const result = await lockAgent.renewLock(String(questionId));

      if (!result.success) {
        if (result.isNetworkError) {
          consecutiveFailuresRef.current++;
          console.warn(`[useEditLock] Lock renewal network failure (${consecutiveFailuresRef.current}):`, result.error);
          
          // Allow up to 3 consecutive network failures (approx 1.5 mins) before expiring
          if (consecutiveFailuresRef.current >= 3) {
            console.error("[useEditLock] Persistent network failure (3 attempts). Expiring lock.");
            setLockStatus("expired");
            if (onLockExpired) onLockExpired();
            return result;
          }
          
          // Return special success-like state for network retry
          return { success: true, isRetrying: true };
        }

        console.warn("[useEditLock] Lock renewal failed (logic error):", result.error);
        setLockStatus("expired");
        if (onLockExpired) onLockExpired();
      } else {
        // Reset failure counter on success
        consecutiveFailuresRef.current = 0;
      }

      return result;
    } catch (error) {
      // Uncaught errors still expire
      console.error("[useEditLock] Lock renewal unexpected error:", error);
      setLockStatus("expired");
      if (onLockExpired) onLockExpired();
      return { success: false, error: error.message };
    }
  }, [agents, questionId, onLockExpired]);

  // Keep renewLock in a ref so heartbeat effect doesn't restart when callback changes
  const renewLockRef = useRef(renewLock);
  useEffect(() => {
    renewLockRef.current = renewLock;
  }, [renewLock]);

  /**
   * Release the lock
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
        await auditAgent.logLockReleased(String(questionId), userId, userEmail);
        console.log(`[useEditLock] Lock released for question ${questionId}`);
      }

      return result;
    } catch (error) {
      console.error("[useEditLock] Lock release error:", error);
      return { success: false, error: error.message };
    }
  }, [agents, questionId, userId, userEmail]);

  /**
   * Check current lock status
   */
  const checkLockStatus = useCallback(async () => {
    if (!agents || !questionId) return { locked: false };

    const { lockAgent } = agents;

    try {
      const result = await lockAgent.checkLockStatus(String(questionId));
      if (result.locked) {
        // LockAgent.checkLockStatus returns { lock: lockData } - this IS the lockedBy info
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
  }, [agents, questionId]);

  // Heartbeat Effect - Renew lock every 30s when acquired
  // Uses ref to avoid restarting when renewLock changes
  useEffect(() => {
    if (lockStatus !== "acquired") return;

    console.log("[useEditLock] Starting heartbeat for", questionId);
    heartbeatRef.current = setInterval(async () => {
      const result = await renewLockRef.current();
      if (!result.success) {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      }
    }, 30000);

    return () => {
      if (heartbeatRef.current) {
        console.log("[useEditLock] Stopping heartbeat for", questionId);
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [lockStatus, questionId]);

  // Keep releaseLock in a ref so cleanup effect doesn't restart when callback changes
  const releaseLockRef = useRef(releaseLock);
  useEffect(() => {
    releaseLockRef.current = releaseLock;
  }, [releaseLock]);

  // Keep acquireLock in a ref so auto-acquire effect doesn't restart
  const acquireLockRef = useRef(acquireLock);
  useEffect(() => {
    acquireLockRef.current = acquireLock;
  }, [acquireLock]);

  // Release lock on unmount OR when questionId changes
  // Uses delayed release to allow remounts to cancel and keep the lock
  useEffect(() => {
    const qId = String(questionId);
    
    // On mount/update: cancel any pending release for this question
    markLockActive(qId, userId);

    return () => {
      // Use refs to check latest values in cleanup (closures can be stale)
      if (lockStatusRef.current === "acquired" && !isProcessingRef.current) {
        console.log(`[useEditLock] Scheduling delayed release for: ${qId}`);
        // Use delayed release - if component remounts quickly, it will be cancelled
        scheduleLockRelease(qId, () => {
          console.log(`[useEditLock] Releasing lock on exit for: ${qId}`);
          releaseLockRef.current();
        });
      } else if (isProcessingRef.current) {
        console.log(
          `[useEditLock] Delaying lock release for ${qId} - save in progress`
        );
      }
    };
  }, [questionId, userId]); // Removed releaseLock dependency

  // Auto-acquire lock after 1s view
  // Uses ref to avoid effect restart when callback identity changes
  useEffect(() => {
    // Skip if already have active lock in global state (survived remount)
    if (hasActiveLock(questionId, userId)) {
      console.log("[useEditLock] Reusing existing lock from global state");
      setLockStatus("acquired");
      lockAttemptedRef.current = true;
      return;
    }
    
    if (
      !isViewing ||
      lockAttemptedRef.current ||
      !questionId ||
      !userId ||
      !userEmail
    ) {
      if (!isViewing && viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
      return;
    }

    console.log("[useEditLock] Starting 1s view timer");
    viewTimerRef.current = setTimeout(() => {
      console.log("[useEditLock] Auto-acquiring lock");
      acquireLockRef.current();
    }, 1000);

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
    };
  }, [isViewing, questionId, userId, userEmail]); // Removed acquireLock dependency

  // Reset lock attempt flag when questionId changes
  useEffect(() => {
    lockAttemptedRef.current = false;
  }, [questionId]);

  // Visibility-based retry: Re-attempt when tab regains focus if locked by other
  useEffect(() => {
    if (lockStatus !== "locked_by_other" || !isViewing) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[useEditLock] Tab visible - retrying lock acquisition");
        lockAttemptedRef.current = false; // Allow retry
        acquireLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [lockStatus, isViewing, acquireLock]);

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
