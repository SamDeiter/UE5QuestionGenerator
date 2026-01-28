/**
 * useAuth Hook
 *
 * Manages authentication state, registration, custom tags, and compliance modals:
 * - Firebase authentication state
 * - User registration status (invite system)
 * - Admin status from Firestore (server-side only - security fix V-002)
 * - Custom tags from Firestore
 * - Token usage tracking
 * - Age verification and terms acceptance modals (extracted to useCompliance)
 */
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, getCustomTags, saveCustomTags } from "../services/firebase";
import { logger } from "../utils/logger";

// Extracted focus hooks
import { useCompliance } from "./useCompliance";
import { useLocalTokenUsage } from "./useLocalTokenUsage";
import { useUserRegistration } from "./useUserRegistration";

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

  // Registration & Roles (extracted)
  const {
    isAdmin,
    userRole,
    isRegistered,
    registrationLoading,
    permissionError,
    blockedByExtension,
    setIsRegistered,
    setUserRole,
    setIsAdmin,
  } = useUserRegistration(user);

  const [customTags, setCustomTags] = useState({});
  const tokenUsage = useLocalTokenUsage();

  // Compliance state (extracted)
  const {
    showTerms,
    setShowTerms,
    showAgeGate,
    setShowAgeGate,
    termsAccepted,
    setTermsAccepted,
  } = useCompliance();

  // ========================================================================
  // EFFECTS
  // ========================================================================

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Load custom tags
        getCustomTags()
          .then(setCustomTags)
          .catch((err) => {
            logger.error("Failed to load custom tags:", err);
          });
      }
    });

    return unsubscribe;
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
