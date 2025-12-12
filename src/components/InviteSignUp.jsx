/**
 * InviteSignUp Component
 *
 * Handles user registration via invite codes.
 * Shows invite validation status and auth options.
 *
 * Following react-architecture.md: Component under 150 lines
 */

import { useState, useEffect } from "react";
import {
  validateInvite,
  consumeInvite,
  getInviteFromUrl,
  clearInviteFromUrl,
} from "../services/inviteService";
import { signInWithGoogle } from "../services/firebase";
import Icon from "./Icon";

/**
 * InviteSignUp - Registration with invite code validation
 *
 * @param {Object} props
 * @param {Function} props.onSuccess - Called when registration completes
 * @param {Function} props.onCancel - Called when user cancels
 */
const InviteSignUp = ({ onSuccess, onCancel }) => {
  const [inviteCode, setInviteCode] = useState("");
  const [validationStatus, setValidationStatus] = useState(null); // null | 'validating' | 'valid' | 'invalid'
  const [validationError, setValidationError] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");

  // Check for invite code in URL on mount
  useEffect(() => {
    const urlInvite = getInviteFromUrl();
    if (urlInvite) {
      setInviteCode(urlInvite);
      handleValidate(urlInvite);
    }
  }, []);

  const handleValidate = async (code) => {
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
  };

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError("");

    try {
      await signInWithGoogle();
      // After auth, consume the invite
      const result = await consumeInvite(inviteCode.trim());
      clearInviteFromUrl();
      onSuccess?.(result.role);
    } catch (error) {
      setAuthError(error.message || "Authentication failed");
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="key" size={32} className="text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Join UE5 Question Generator
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Enter your invite code to get started
          </p>
        </div>

        {/* Invite Code Input */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="invite-code"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Invite Code
            </label>
            <input
              id="invite-code"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter your invite code"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono tracking-wider"
              disabled={validationStatus === "valid"}
              aria-describedby={validationError ? "invite-error" : undefined}
              aria-invalid={validationStatus === "invalid"}
            />
          </div>

          {/* Validation Status */}
          {validationStatus === "validating" && (
            <div className="flex items-center gap-2 text-blue-400">
              <Icon name="loader" size={16} className="animate-spin" />
              <span>Validating invite code...</span>
            </div>
          )}

          {validationStatus === "valid" && (
            <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-3 rounded-lg">
              <Icon name="check-circle" size={16} />
              <span>
                Valid invite! Role: <strong>{inviteRole}</strong>
              </span>
            </div>
          )}

          {validationError && (
            <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
              <Icon name="x-circle" size={16} />
              <span>{validationError}</span>
            </div>
          )}

          {authError && (
            <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
              <Icon name="alert-triangle" size={16} />
              <span>{authError}</span>
            </div>
          )}

          {/* Actions */}
          {validationStatus !== "valid" ? (
            <button
              onClick={() => handleValidate()}
              disabled={validationStatus === "validating" || !inviteCode.trim()}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
            >
              Validate Invite Code
            </button>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              className="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {isAuthenticating ? (
                <Icon name="loader" size={20} className="animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              {isAuthenticating ? "Signing in..." : "Continue with Google"}
            </button>
          )}

          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Google icon component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default InviteSignUp;
