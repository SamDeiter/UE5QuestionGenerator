import { useState, useEffect, useCallback } from "react";
import {
  validateInvite,
  consumeInvite,
  getInviteFromUrl,
  clearInviteFromUrl,
} from "../services/inviteService";
import {
  signInWithGoogle,
  signUpWithEmail,
  signInWithEmail,
} from "../services/firebase";
import { logger } from "../utils/logger";
import { getErrorMessage } from "../utils/errorMessages";

/**
 * useInviteFlow Hook
 *
 * Encapsulates logic for invite validation and social/email registration.
 */
export function useInviteFlow({ onSuccess }) {
  const [inviteCode, setInviteCode] = useState("");
  const [validationStatus, setValidationStatus] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");

  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);

  const handleValidate = useCallback(
    async (code) => {
      const codeToValidate = code || inviteCode;
      if (!codeToValidate.trim()) {
        setValidationError("Please enter an invite code");
        return;
      }

      setValidationStatus("validating");
      setValidationError("");

      try {
        const result = await validateInvite(codeToValidate.trim());
        if (result.valid) {
          setValidationStatus("valid");
          setInviteRole(result.role);
        }
      } catch (error) {
        setValidationStatus("invalid");
        setValidationError(error.message || "Invalid invite code");
      }
    },
    [inviteCode]
  );

  useEffect(() => {
    const urlInvite = getInviteFromUrl();
    if (urlInvite) {
      setInviteCode(urlInvite);
      handleValidate(urlInvite);
    }
  }, [handleValidate]);

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError("");
    try {
      await signInWithGoogle();
      const result = await consumeInvite(inviteCode.trim());
      clearInviteFromUrl();
      onSuccess?.(result.role);
    } catch (error) {
      // Use centralized error handling
      const errorConfig = getErrorMessage(error);
      setAuthError(errorConfig.message);
      setIsAuthenticating(false);
      logger.error("Failed to sign in with Google:", error);
    }
  };

  const handleEmailAuth = async (email, password) => {
    setIsAuthenticating(true);
    setAuthError("");
    try {
      if (isNewUser) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      const result = await consumeInvite(inviteCode.trim());
      clearInviteFromUrl();
      onSuccess?.(result.role);
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setIsNewUser(false);
      }
      setAuthError(getErrorMessage(error).message);
      setIsAuthenticating(false);
    }
  };

  return {
    inviteCode,
    setInviteCode: (code) => setInviteCode(code.toUpperCase()),
    validationStatus,
    validationError,
    inviteRole,
    isAuthenticating,
    authError,
    showEmailAuth,
    setShowEmailAuth,
    isNewUser,
    setIsNewUser,
    handleValidate,
    handleGoogleSignIn,
    handleEmailAuth,
  };
}
