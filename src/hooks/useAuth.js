/**
 * useAuth Hook
 *
 * Manages authentication state, registration, custom tags, and compliance modals:
 * - Firebase authentication state
 * - User registration status (invite system)
 * - Admin status from Firestore
 * - Custom tags from Firestore
 * - Token usage tracking
 * - Age verification and terms acceptance modals
 */
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, getCustomTags, saveCustomTags } from "../services/firebase";
import { getTokenUsage } from "../utils/analyticsStore";
import {
  checkUserRegistration,
  setupInitialAdmin,
} from "../services/inviteService";

// Fallback admin emails - these get auto-promoted to admin on first sign-in
const FALLBACK_ADMIN_EMAILS = [
  "sam.deiter@epicgames.com",
  "samdeiter@gmail.com",
];

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
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(true);
  const [customTags, setCustomTags] = useState({});
  const [tokenUsage, setTokenUsage] = useState(() => getTokenUsage());

  // Compliance modals
  const [showTerms, setShowTerms] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // ========================================================================
  // EFFECTS
  // ========================================================================

  // Listen for auth state changes and check registration
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Check registration status via Cloud Function
        setRegistrationLoading(true);
        try {
          let regStatus = await checkUserRegistration();

          // Auto-promote whitelisted emails to admin if not yet registered
          if (
            !regStatus.registered &&
            FALLBACK_ADMIN_EMAILS.includes(currentUser.email?.toLowerCase())
          ) {
            console.log("Auto-promoting whitelisted admin:", currentUser.email);
            try {
              const adminResult = await setupInitialAdmin();
              console.log("Admin setup result:", adminResult);
              // Re-check registration after setup
              regStatus = { registered: true, role: "admin" };
            } catch (setupError) {
              console.error("Auto-admin setup failed:", setupError);
              // Still treat as registered admin via fallback
              regStatus = { registered: true, role: "admin" };
            }
          }

          setIsRegistered(regStatus.registered);

          // Admin status comes from the registration check
          if (regStatus.role === "admin") {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Failed to check registration:", error);
          // Fallback to email whitelist
          const isWhitelisted = FALLBACK_ADMIN_EMAILS.includes(
            currentUser.email?.toLowerCase()
          );
          setIsAdmin(isWhitelisted);
          setIsRegistered(isWhitelisted); // Whitelisted admins are registered
        } finally {
          setRegistrationLoading(false);
        }

        // Load custom tags from Firestore
        try {
          const tags = await getCustomTags();
          setCustomTags(tags);
        } catch (error) {
          console.error("Failed to load custom tags:", error);
        }
      } else {
        setIsAdmin(false);
        setIsRegistered(false);
        setRegistrationLoading(false);
      }
    });
    return () => unsubscribe();
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
      console.error("Failed to save custom tags:", error);
      showMessage("Failed to save tags", 3000);
    }
  };

  /**
   * Mark user as registered (called after successful invite consumption)
   */
  const markAsRegistered = (role = "user") => {
    setIsRegistered(true);
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
  };
}
