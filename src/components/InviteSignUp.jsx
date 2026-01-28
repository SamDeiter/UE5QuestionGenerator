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
import Icon from "./Icon";
import EmailLogin from "./EmailLogin";
import { useAccessibility } from "../contexts/AccessibilityContext";

/**
 * InviteSignUp - Registration with invite code validation
 *
 * @param {Object} props
 * @param {Function} props.onSuccess - Called when registration completes
 * @param {Function} props.onCancel - Called when user cancels
 */
const InviteSignUp = ({ onSuccess, onCancel }) => {
  const { colorblindMode } = useAccessibility();
  const cb = colorblindMode;

  // Colorblind-safe colors
  const successClasses = cb
    ? "text-blue-400 bg-blue-900/20"
    : "text-green-400 bg-green-900/20";
  const errorClasses = cb
    ? "text-rose-400 bg-rose-900/20"
    : "text-red-400 bg-red-900/20";

  const [inviteCode, setInviteCode] = useState("");
  const [validationStatus, setValidationStatus] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");

  // Email auth state
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isNewUser, setIsNewUser] = useState(true);

  // NEW: Toggle for existing user login (no invite needed)
  const [showExistingUserLogin, setShowExistingUserLogin] = useState(false);

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
    [inviteCode],
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
        message =
          "Your account has been disabled by an administrator. Please contact support if you believe this is an error.";
      }
      setAuthError(message);
      setIsAuthenticating(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError("");
    try {
      if (isNewUser) {
        // signUpWithEmail now returns {user, verificationSent}
        const { verificationSent } = await signUpWithEmail(email, password);
        if (verificationSent) {
          // Note: User can continue even without verification for now
          // Future: Could require verification before full access
        }
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
        message =
          "Your account has been disabled by an administrator. Please contact support if you believe this is an error.";
      }
      setAuthError(message);
      setIsAuthenticating(false);
    }
  };

  const getAuthButtonText = () => {
    if (isAuthenticating) return "Please wait...";
    return isNewUser ? "Create Account" : "Sign In";
  };

  // If existing user login is toggled, show EmailLogin component
  if (showExistingUserLogin) {
    return (
      <EmailLogin
        onSuccess={() => onSuccess?.()}
        onBack={() => setShowExistingUserLogin(false)}
      />
    );
  }

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

        <div className="space-y-4">
          {/* Invite Code Input */}
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
              aria-invalid={validationStatus === "invalid"}
            />
          </div>

          {/* Status Messages */}
          {validationStatus === "validating" && (
            <div className="flex items-center gap-2 text-blue-400">
              <Icon name="loader" size={16} className="animate-spin" />
              <span>Validating invite code...</span>
            </div>
          )}
          {validationStatus === "valid" && (
            <div
              className={`flex items-center gap-2 ${successClasses} p-3 rounded-lg`}
            >
              <Icon name="check-circle" size={16} />
              <span>
                Valid invite! Role: <strong>{inviteRole}</strong>
              </span>
            </div>
          )}
          {validationError && (
            <div
              className={`flex items-center gap-2 ${errorClasses} p-3 rounded-lg`}
            >
              <Icon name="x-circle" size={16} />
              <span>{validationError}</span>
            </div>
          )}
          {authError && (
            <div
              className={`flex items-center gap-2 ${errorClasses} p-3 rounded-lg`}
            >
              <Icon name="alert-triangle" size={16} />
              <span>{authError}</span>
            </div>
          )}

          {/* Actions - Refactored to avoid nested ternaries for linting */}
          {validationStatus !== "valid" && (
            <button
              onClick={() => handleValidate()}
              disabled={validationStatus === "validating" || !inviteCode.trim()}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
            >
              Validate Invite Code
            </button>
          )}

          {validationStatus === "valid" && showEmailAuth && (
            /* Email/Password Form */
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                required
              />
              <input
                type="password"
                placeholder="Password (6+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                required
                minLength={6}
              />
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
              >
                {getAuthButtonText()}
              </button>
              <button
                type="button"
                onClick={() => setIsNewUser(!isNewUser)}
                className="w-full text-sm text-slate-400 hover:text-white"
              >
                {isNewUser
                  ? "Already have an account? Sign in"
                  : "New user? Create account"}
              </button>
              <button
                type="button"
                onClick={() => setShowEmailAuth(false)}
                className="w-full text-sm text-slate-500 hover:text-slate-300"
              >
                ← Back to sign-in options
              </button>
            </form>
          )}

          {validationStatus === "valid" && !showEmailAuth && (
            /* Auth Options */
            <div className="space-y-3">
              <button
                onClick={handleGoogleSignIn}
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <Icon name="loader" size={20} className="animate-spin" />
                ) : (
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-5 h-5"
                  />
                )}
                <span>Continue with Google</span>
              </button>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-slate-500">Or</span>
                </div>
              </div>
              <button
                onClick={() => setShowEmailAuth(true)}
                disabled={isAuthenticating}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
              >
                Continue with Email
              </button>
              <p className="text-xs text-slate-500 text-center">
                Any Google or email account works. No Epic Games login required.
              </p>
            </div>
          )}

          {onCancel && !showEmailAuth && (
            <button
              onClick={onCancel}
              className="w-full py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}

          {/* Existing User Login Link */}
          {!showEmailAuth && (
            <div className="mt-4 pt-4 border-t border-slate-800 text-center">
              <p className="text-slate-500 text-sm mb-2">
                Already have an account?
              </p>
              <button
                onClick={() => setShowExistingUserLogin(true)}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Already registered? Sign in →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteSignUp;
