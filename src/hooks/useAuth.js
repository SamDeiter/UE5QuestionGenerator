/**
 * useAuth Hook
 *
 * Manages authentication state, registration, custom tags, and compliance modals:
 * - Firebase authentication state
 * - User registration status (invite system)
 * - Admin status from Firestore (server-side only - security fix V-002)
 * - Custom tags from Firestore
 * - Token usage tracking
 * - Age verification and terms acceptance modals
 */
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  auth,
  getCustomTags,
  saveCustomTags,
  getDb,
} from "../services/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getTokenUsage } from "../utils/analyticsStore";
import {
  checkUserRegistration,
  setupInitialAdmin,
  logAuthFailure,
} from "../services/inviteService";
import { cleanupQueueForUser } from "../services/firebaseSave";
import { logger } from "../utils/logger";

// SECURITY FIX V-002: Removed client-side FALLBACK_ADMIN_EMAILS
// Admin detection now happens entirely server-side via checkUserRegistration()
// and setupInitialAdmin() Cloud Functions

/**
 * Custom hook for managing authentication and compliance state.
 *
 * @param {Function} showMessage - Function to display toast messages
 * @returns {Object} Auth state, custom tags, compliance state and handlers
 */
export function useAuth(showMessage) {
  // ========================================================================
  // STATE
  // ========================================================================
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState("user");
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(true);
  const [customTags, setCustomTags] = useState({});
  const [tokenUsage, setTokenUsage] = useState(() => getTokenUsage());

  // Compliance modals
  const [showTerms, setShowTerms] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Permission error state (write probe failed)
  const [permissionError, setPermissionError] = useState(false);

  // Blocked by extension state (ad blocker detected)
  const [blockedByExtension, setBlockedByExtension] = useState(false);

  // ========================================================================
  // EFFECTS
  // ========================================================================

  // Listen for auth state changes and check registration
  useEffect(() => {
    // A2/A3: Cancellation flag to prevent stale async updates after user changes
    let isCancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Check if this callback is stale (user changed during async ops)
      if (isCancelled) return;

      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // QUEUE CLEANUP: Clear stale queue items from previous users/sessions
        // This prevents repeated permission errors from old queued saves
        const queueCleanup = cleanupQueueForUser(currentUser.uid);
        if (queueCleanup.cleared) {
          const reason =
            queueCleanup.reason || "removed " + queueCleanup.removed + " items";
          logger.log("[Auth] Queue cleanup:", reason);
        }

        // Check registration status via Cloud Function (server-side admin detection)
        setRegistrationLoading(true);
        try {
          let regStatus = await checkUserRegistration();
          if (isCancelled) return; // A2/A3: Check for stale callback
          logger.log("🔍 [Auth] checkUserRegistration result:", regStatus);
          logger.log("🔍 [Auth] User email:", currentUser.email);

          // If not registered, attempt server-side admin setup
          // Server validates email whitelist - client never sees the whitelist
          if (!regStatus.registered) {
            try {
              const adminResult = await setupInitialAdmin();
              if (isCancelled) return; // A2/A3: Check for stale callback
              logger.log("🔍 [Auth] setupInitialAdmin result:", adminResult);
              if (adminResult.success) {
                logger.log("✅ Server-side admin setup successful");
                regStatus = {
                  registered: true,
                  role: adminResult.role || "admin",
                };
              }
            } catch {
              // setupInitialAdmin throws if email not whitelisted - this is expected
              logger.log("ℹ️ Not a whitelisted admin email");
            }
          }

          logger.log(
            "🔍 [Auth] Final role:",
            regStatus.role,
            "isAdmin:",
            regStatus.role === "admin",
          );
          // CRITICAL FIX: Check cancellation BEFORE any setState to prevent ghost admin
          if (isCancelled) return;
          setIsRegistered(regStatus.registered);
          setUserRole(regStatus.role || "user");
          setIsAdmin(regStatus.role === "admin");

          // WRITE PROBE: Verify actual Firestore write access
          // This catches Ghost Reviewers who appear registered but can't save
          if (regStatus.registered) {
            try {
              const db = getDb();
              await setDoc(
                doc(db, "userSettings", currentUser.uid),
                { lastVerified: serverTimestamp() },
                { merge: true },
              );
              logger.log(
                "✅ Write probe successful - Firestore access verified",
              );
              if (isCancelled) return; // A2/A3: Check for stale callback
              setPermissionError(false);
            } catch (probeError) {
              if (isCancelled) return; // A2/A3: Check for stale callback
              logger.error("❌ Write probe failed:", probeError);
              if (probeError.code === "permission-denied") {
                setPermissionError(true);
                // CRITICAL FIX: Revoke registration if write access denied
                // Prevents "Ghost Reviewer" - appears registered but can't save
                setIsRegistered(false);
                setUserRole("user");
                setIsAdmin(false);
                logger.warn(
                  "⚠️ Write probe failed - revoking registration status",
                );
              }
            }
          }
        } catch (error) {
          logger.error("Failed to check registration:", error);

          // Track if blocked by extension for logging purposes
          let isNetworkBlocked = false;

          // IMPROVED: Check if truly offline first before blaming ad blocker
          if (!navigator.onLine) {
            logger.warn("📵 User is offline - cannot check registration");
            // Don't set blockedByExtension for genuine network issues
            if (!isCancelled) {
              setIsRegistered(false);
              setUserRole("user");
              setIsAdmin(false);
            }
          } else {
            // Detect if request was blocked by browser extension (ad blocker)
            const errorMsg = error?.message?.toLowerCase() || "";
            isNetworkBlocked =
              errorMsg.includes("failed to fetch") ||
              errorMsg.includes("network request failed") ||
              errorMsg.includes("blocked") ||
              error?.code === "unavailable" ||
              error?.code === "resource-exhausted";

            if (isNetworkBlocked) {
              logger.warn(
                "🚫 Request appears to be blocked by browser extension",
              );
              setBlockedByExtension(true);
            }
          }

          // Log auth failure to Firestore for admin monitoring
          try {
            await logAuthFailure({
              errorCode:
                error?.code || (isNetworkBlocked ? "blocked" : "unknown"),
              errorMessage: error?.message || "Registration check failed",
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
            });
          } catch (logError) {
            // Don't fail if logging fails
            logger.warn("Failed to log auth failure:", logError);
          }

          // SECURITY: On error, default to no access (fail closed)
          if (!isCancelled) {
            setIsAdmin(false);
            setIsRegistered(false);
            setUserRole("user");
          }
        } finally {
          if (!isCancelled) setRegistrationLoading(false);
        }

        // Load custom tags from Firestore
        try {
          const tags = await getCustomTags();
          if (isCancelled) return; // A2/A3: Check for stale callback
          setCustomTags(tags);
        } catch (error) {
          logger.error("Failed to load custom tags:", error);
        }
      } else {
        setIsAdmin(false);
        setIsRegistered(false);
        setUserRole("user");
        setRegistrationLoading(false);
      }
    });
    return () => {
      isCancelled = true; // A2/A3: Mark all pending async ops as stale
      unsubscribe();
    };
  }, []);

  // Refresh token usage periodically
  useEffect(() => {
    const interval = setInterval(() => setTokenUsage(getTokenUsage()), 5000);
    return () => clearInterval(interval);
  }, []);

  // Check compliance status on app load
  useEffect(() => {
    const ageVerified = localStorage.getItem("ue5_age_verified");
    const termsAcceptedStorage = localStorage.getItem("ue5_terms_accepted");

    if (!ageVerified) {
      setShowAgeGate(true);
    } else if (!termsAcceptedStorage) {
      setShowTerms(true);
    } else {
      setTermsAccepted(true);
    }
  }, []);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  /**
   * Save custom tags to Firestore.
   *
   * @param {Object} newCustomTags - New custom tags object
   */
  const handleSaveCustomTags = async (newCustomTags) => {
    try {
      await saveCustomTags(newCustomTags);
      setCustomTags(newCustomTags);
      showMessage("Custom tags saved!", 2000);
    } catch (error) {
      logger.error("Failed to save custom tags:", error);
      showMessage("Failed to save tags", 3000);
    }
  };

  /**
   * Mark user as registered (called after successful invite consumption)
   */
  const markAsRegistered = (role = "user") => {
    setIsRegistered(true);
    setUserRole(role);
    if (role === "admin") {
      setIsAdmin(true);
    }
  };

  // ========================================================================
  // RETURN
  // ========================================================================
  return {
    // Auth state
    user,
    authLoading,
    isAdmin,
    userRole,

    // Registration state (invite system)
    isRegistered,
    registrationLoading,
    markAsRegistered,

    // Custom tags
    customTags,
    setCustomTags,
    handleSaveCustomTags,

    // Token usage
    tokenUsage,

    // Compliance
    showTerms,
    setShowTerms,
    showAgeGate,
    setShowAgeGate,
    termsAccepted,
    setTermsAccepted,

    // Permission error (write probe failed)
    permissionError,

    // Blocked by browser extension (ad blocker)
    blockedByExtension,
  };
}
