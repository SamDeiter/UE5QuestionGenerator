import { useState, useRef, useEffect } from "react";
import {
  signInWithGoogle,
  signInWithEmail,
  resetPassword,
} from "../services/firebase";
import Icon from "./Icon";
import { logger } from "../utils/logger";
import { useAccessibility } from "../contexts/AccessibilityContext";

const SignIn = () => {
  const { colorblindMode } = useAccessibility();
  const cb = colorblindMode;

  const [step, setStep] = useState("initial"); // "initial" | "email-entered"
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  // A1: Synchronous guard to prevent double-submit race conditions
  const isSubmittingRef = useRef(false);
  const passwordRef = useRef(null);

  // A11: Password reset rate-limiting cooldown timer
  useEffect(() => {
    if (resetCooldown > 0) {
      const timer = setTimeout(() => setResetCooldown(resetCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCooldown]);

  // Auto-focus password field when advancing to step 2
  useEffect(() => {
    if (step === "email-entered") {
      passwordRef.current?.focus();
    }
  }, [step]);

  const handleGoogleSignIn = async () => {
    // A1: Synchronous guard prevents multiple rapid clicks
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      logger.error(err);
      if (err.code === "auth/configuration-not-found") {
        setError(
          "Google Sign-In is not enabled. Please enable it in the Firebase Console > Authentication > Sign-in method."
        );
      } else if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled.");
      } else if (err.code === "auth/user-disabled") {
        setError(
          "Your account has been disabled by an administrator. Please contact support if you believe this is an error."
        );
      } else {
        setError("Failed to sign in. Please try again.");
      }
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    // A1: Synchronous guard prevents double-submit
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      logger.error(err);
      const getErrorMessage = (code) => {
        switch (code) {
          // Firebase v9+ collapses wrong-password and user-not-found into
          // auth/invalid-credential to prevent email enumeration — handle all
          // sign-in failures with one message that guides all user types.
          case "auth/wrong-password":
          case "auth/invalid-credential":
          case "auth/user-not-found":
            return "Couldn't sign in. Double-check your password, or use \"Set up or reset password\" to get a link by email. If you're new here, you'll need an invite code from an admin.";
          case "auth/invalid-email":
            return "Invalid email address format.";
          case "auth/user-disabled":
            return "Your account has been disabled. Please contact support.";
          case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";
          default:
            return err.message || "Sign in failed.";
        }
      };
      setError(getErrorMessage(err.code));
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    // A11: Rate-limit password reset requests
    if (resetCooldown > 0) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    setError(null);
    setResetSuccess(false);

    try {
      await resetPassword(email);
      setResetSuccess(true);
      setResetCooldown(60); // A11: 60 second cooldown after success
    } catch (err) {
      logger.error(err);
      let message = err.message || "Failed to send reset email";
      if (err.code === "auth/user-not-found") {
        message =
          "No account found with this email. If you have an invite code, use the invite link your admin sent you.";
      } else if (err.code === "auth/invalid-email") {
        message = "Invalid email address format.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many requests. Please try again later.";
      }
      setError(message);
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };
  const renderContent = () => {
    // Step 2: password entry + recovery options
    if (step === "email-entered") {
      return (
        <div className="space-y-3">
          {/* Email display with change link */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">{email}</span>
            <button
              type="button"
              onClick={() => {
                setStep("initial");
                setPassword("");
                setError(null);
                setResetSuccess(false);
              }}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              ← Change
            </button>
          </div>

          {/* Password sign-in form */}
          <form onSubmit={handleEmailAuth} className="space-y-3 text-left">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                ref={passwordRef}
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Reset / first-time setup */}
          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={isLoading || resetCooldown > 0}
            className="w-full text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {resetCooldown > 0
              ? `Email sent — wait ${resetCooldown}s to resend`
              : "Set up or reset password →"}
          </button>

          {resetSuccess && (
            <p
              className={`text-xs ${cb ? "text-blue-400" : "text-green-400"} text-center`}
            >
              Check your email for a sign-in link. If you&apos;ve only ever
              signed in with Google, clicking the link will let you add a
              password to your account.
            </p>
          )}

          <p className="text-xs text-slate-600 text-center pt-1">
            Need an account? You&apos;ll need an invite code from an admin.
          </p>
        </div>
      );
    }

    // Step 1: email entry + Google sign-in
    return (
      <div className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setResetSuccess(false);
            setStep("email-entered");
          }}
          className="space-y-3 text-left"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
          >
            Continue
          </button>
        </form>

        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="flex-1 h-px bg-slate-700" />
          <span>or</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        <div>
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Icon name="loader" className="animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </button>
          <p className="text-xs text-slate-500 text-center mt-1">
            For Epic (@epicgames.com) accounts
          </p>
        </div>

        <p className="text-xs text-slate-500 pt-1">
          Works best in <strong>Chrome</strong>, <strong>Edge</strong>, or{" "}
          <strong>Firefox</strong>.
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center">
            <Icon name="database" size={40} className="text-blue-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            UE5 Question Generator
          </h1>
          <p className="text-slate-400">
            Sign in to generate, manage, and export your question bank.
          </p>
        </div>

        {error && (
          <div
            className={`${
              cb
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            } border p-3 rounded-lg text-sm`}
          >
            {error}
          </div>
        )}

        {renderContent()}
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

export default SignIn;
