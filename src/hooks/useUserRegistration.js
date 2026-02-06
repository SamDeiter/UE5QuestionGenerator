/**
 * useUserRegistration Hook
 *
 * Manages user registration status, roles (admin), and write probes.
 * Extracted from useAuth to handle the complex registration lifecycle.
 */
import { useState, useEffect } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "../services/firebase";
import {
  checkUserRegistration,
  setupInitialAdmin,
  logAuthFailure,
} from "../services/inviteService";
import { cleanupQueueForUser } from "../services/firebaseSave";
import { TIMING } from "../utils/constants";
import { logger } from "../utils/logger";

/**
 * Handles error categorization and state updates for registration failures.
 */
function handleRegistrationState(error, isCancelled, stateSetters) {
  const { setIsRegistered, setIsAdmin, setBlockedByExtension } = stateSetters;
  logger.error("Failed to check registration:", error);

  if (!navigator.onLine) {
    if (!isCancelled) {
      setIsRegistered(false);
      setIsAdmin(false);
    }
  } else {
    const errorMsg = error?.message?.toLowerCase() || "";
    const isBlocked =
      errorMsg.includes("failed to fetch") ||
      errorMsg.includes("blocked") ||
      error?.code === "unavailable";

    if (isBlocked && !isCancelled) setBlockedByExtension(true);
  }

  logAuthFailure({
    errorCode: error?.code || "unknown",
    errorMessage: error?.message || "Registration check failed",
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  if (!isCancelled) {
    setIsAdmin(false);
    setIsRegistered(false);
  }
}

/**
 * Custom hook for user registration and role management.
 * @param {Object} currentUser - The Firebase user object
 */
export function useUserRegistration(currentUser) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState("user");
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [blockedByExtension, setBlockedByExtension] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const performCheck = async () => {
      if (!currentUser) {
        setIsAdmin(false);
        setIsRegistered(false);
        setUserRole("user");
        setRegistrationLoading(false);
        return;
      }
      cleanupQueueForUser(currentUser.uid);
      setRegistrationLoading(true);
      try {
        let regStatus = await checkUserRegistration();
        if (isCancelled) return;
        if (!regStatus.registered) {
          try {
            const adminResult = await setupInitialAdmin();
            if (!isCancelled && adminResult.success) {
              regStatus = {
                registered: true,
                role: adminResult.role || "admin",
              };
            }
          } catch {
            /* Expected fallback */
          }
        }
        if (isCancelled) return;
        setIsRegistered(regStatus.registered);
        setUserRole(regStatus.role || "user");
        setIsAdmin(
          regStatus.role === "admin" || regStatus.role === "super_admin"
        );
        if (regStatus.registered) {
          try {
            await setDoc(
              doc(getDb(), "userSettings", currentUser.uid),
              { lastVerified: serverTimestamp() },
              { merge: true }
            );
            setPermissionError(false);
          } catch (probeError) {
            if (!isCancelled && probeError.code === "permission-denied") {
              setPermissionError(true);
              setIsRegistered(false);
            }
          }
        }
      } catch (error) {
        handleRegistrationState(error, isCancelled, {
          setIsRegistered,
          setIsAdmin,
          setBlockedByExtension,
        });
      } finally {
        if (!isCancelled) setRegistrationLoading(false);
      }
    };
    performCheck();
    return () => {
      isCancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !isRegistered) return;
    const interval = setInterval(async () => {
      try {
        await setDoc(
          doc(getDb(), "userSettings", currentUser.uid),
          { lastVerified: serverTimestamp() },
          { merge: true }
        );
        setPermissionError(false);
      } catch (error) {
        if (error.code === "permission-denied") setPermissionError(true);
      }
    }, TIMING.WRITE_PROBE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [currentUser, isRegistered]);

  return {
    isAdmin,
    userRole,
    isRegistered,
    registrationLoading,
    permissionError,
    blockedByExtension,
    setIsRegistered,
    setUserRole,
    setIsAdmin,
  };
}
