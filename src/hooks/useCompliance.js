/**
 * useCompliance Hook
 *
 * Manages compliance state for age verification and terms acceptance.
 * Extracted from useAuth for separation of concerns.
 */
import { useState, useEffect } from "react";

const STORAGE_KEYS = {
  AGE_VERIFIED: "ue5_age_verified",
  TERMS_ACCEPTED: "ue5_terms_accepted",
};

/**
 * Custom hook for managing compliance modals (age gate, terms).
 *
 * @returns {Object} Compliance state and setters
 */
export function useCompliance() {
  const [showTerms, setShowTerms] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Check compliance status on app load
  useEffect(() => {
    const ageVerified = localStorage.getItem(STORAGE_KEYS.AGE_VERIFIED);
    const termsAcceptedStorage = localStorage.getItem(
      STORAGE_KEYS.TERMS_ACCEPTED
    );

    if (!ageVerified) {
      setShowAgeGate(true);
    } else if (!termsAcceptedStorage) {
      setShowTerms(true);
    } else {
      setTermsAccepted(true);
    }
  }, []);

  return {
    showTerms,
    setShowTerms,
    showAgeGate,
    setShowAgeGate,
    termsAccepted,
    setTermsAccepted,
  };
}
