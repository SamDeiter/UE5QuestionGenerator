import { useState } from "react";
import EmailLogin from "./EmailLogin";
import Icon from "./Icon";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { useInviteFlow } from "../hooks/useInviteFlow";

// Sub-components
import InviteHeader from "./InviteSignUp/InviteHeader";
import ValidationStatus from "./InviteSignUp/ValidationStatus";
import InviteCodeInput from "./InviteSignUp/InviteCodeInput";
import AuthOptions from "./InviteSignUp/AuthOptions";
import EmailAuthForm from "./InviteSignUp/EmailAuthForm";

/**
 * InviteSignUp - Registration with invite code validation
 *
 * @param {Object} props
 * @param {Function} props.onSuccess - Called when registration completes
 * @param {Function} props.onCancel - Called when user cancels
 */
const InviteSignUp = ({ onSuccess, onCancel }) => {
  const { colorblindMode } = useAccessibility();
  const [showExistingUserLogin, setShowExistingUserLogin] = useState(false);

  // Use the extracted hook for logic
  const {
    inviteCode,
    setInviteCode,
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
  } = useInviteFlow({ onSuccess });

  // If existing user login is toggled, show EmailLogin component
  if (showExistingUserLogin) {
    return (
      <EmailLogin
        onSuccess={() => onSuccess?.()}
        onBack={() => setShowExistingUserLogin(false)}
      />
    );
  }

  const getAuthButtonText = () => {
    if (isAuthenticating) return "Please wait...";
    return isNewUser ? "Create Account" : "Sign In";
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <InviteHeader />

        <div className="space-y-4">
          <InviteCodeInput
            value={inviteCode}
            onChange={setInviteCode}
            onValidate={() => handleValidate()}
            status={validationStatus}
            validationError={validationError}
          />

          <ValidationStatus
            status={validationStatus}
            error={validationError}
            role={inviteRole}
            colorblindMode={colorblindMode}
          />

          {authError && (
            <div
              className={`flex items-center gap-2 ${colorblindMode ? "text-rose-400 bg-rose-900/20" : "text-red-400 bg-red-900/20"} p-3 rounded-lg`}
            >
              <Icon name="alert-triangle" size={16} />
              <span>{authError}</span>
            </div>
          )}

          {validationStatus === "valid" &&
            (showEmailAuth ? (
              <EmailAuthForm
                onSubmit={handleEmailAuth}
                isAuthenticating={isAuthenticating}
                isNewUser={isNewUser}
                toggleNewUser={() => setIsNewUser(!isNewUser)}
                onBack={() => setShowEmailAuth(false)}
                authButtonText={getAuthButtonText()}
              />
            ) : (
              <AuthOptions
                onGoogle={handleGoogleSignIn}
                onEmail={() => setShowEmailAuth(true)}
                isAuthenticating={isAuthenticating}
              />
            ))}

          {onCancel && !showEmailAuth && (
            <button
              onClick={onCancel}
              className="w-full py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}

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
