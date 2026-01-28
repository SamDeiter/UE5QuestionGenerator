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
      let message = error.message || "Authentication failed";
      if (error.code === "auth/user-disabled") {
        message = "Your account has been disabled. Please contact support.";
      }
      setAuthError(message);
      setIsAuthenticating(false);
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
      let message = error.message || "Authentication failed";
      if (error.code === "auth/email-already-in-use") {
        message = "Email already registered. Try signing in instead.";
        setIsNewUser(false);
      } else if (error.code === "auth/weak-password") {
        message = "Password should be at least 6 characters.";
      } else if (error.code === "auth/wrong-password") {
        message = "Incorrect password. Try again.";
      } else if (error.code === "auth/user-disabled") {
        message = "Your account has been disabled. Please contact support.";
      }
      setAuthError(message);
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
