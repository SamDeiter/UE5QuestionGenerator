/**
 * EmailLogin - Login for existing registered users
 *
 * Features:
 * - Email/password sign-in (no account creation)
 * - Google sign-in for existing users
 * - Password reset via email
 * - For users who previously registered
 */

import { useState, useRef } from "react";
import {
  signInWithEmail,
  resetPassword,
  signInWithGoogle,
} from "../services/firebase";
import Icon from "./Icon";

const EmailLogin = ({ onSuccess, onBack }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // A1b: Synchronous guard to prevent double-submit race conditions
  const isSubmittingRef = useRef(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    // A1b: Synchronous guard prevents double-submit
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    setError("");

    try {
      await signInWithEmail(email, password);
      onSuccess?.();
    } catch (err) {
      const getLoginErrorMessage = (code) => {
        switch (code) {
          case "auth/invalid-credential":
          case "auth/wrong-password":
            return "Invalid email or password.";
          case "auth/user-not-found":
            return "No account found with this email. Please contact an admin for an invite.";
          case "auth/user-disabled":
            return "This account has been disabled. Please contact support.";
          case "auth/too-many-requests":
            return "Too many failed attempts. Please try again later.";
          default:
            return "Login failed. Please try again.";
        }
      };

      setError(err.message || getLoginErrorMessage(err.code));
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address first.");
      return;
    }

    // A1b: Synchronous guard prevents double-submit
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    setError("");

    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      let message = "Failed to send reset email.";

      if (err.code === "auth/user-not-found") {
        message = "No account found with this email.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      }

      setError(message);
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleGoogleLogin = async () => {
    // A1b: Synchronous guard prevents double-submit
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    setError("");

    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err) {
      let message = "Google sign-in failed.";

      if (err.code === "auth/user-disabled") {
        message = "This account has been disabled. Please contact support.";
      } else if (err.code === "auth/popup-closed-by-user") {
        message = "Sign-in cancelled.";
      }

      setError(message);
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  if (resetSent) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
          <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="mail" size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Check Your Email
          </h1>
          <p className="text-slate-400 mb-6">
            We sent a password reset link to{" "}
            <strong className="text-white">{email}</strong>
          </p>
          <button
            onClick={() => {
              setShowResetForm(false);
              setResetSent(false);
            }}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="mail" size={32} className="text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {showResetForm ? "Reset Password" : "Sign In"}
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {showResetForm
              ? "Enter your email to receive a reset link"
              : "Sign in with your registered account"}
          </p>
        </div>

        {/* Google Sign-In Button - Only show when not resetting password */}
        {!showResetForm && (
          <>
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-lg transition-colors disabled:opacity-50 mb-4"
            >
              {isLoading ? (
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

            <div className="relative py-2 mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500">
                  Or use email
                </span>
              </div>
            </div>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg mb-4">
            <Icon name="alert-triangle" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={showResetForm ? handleResetPassword : handleLogin}
          className="space-y-4"
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
              autoComplete="email"
            />
          </div>

          {!showResetForm && (
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
                autoComplete="current-password"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Icon name="loader" size={16} className="animate-spin" />
                {showResetForm ? "Sending..." : "Signing in..."}
              </>
            ) : (
              <>
                <Icon name={showResetForm ? "mail" : "log-in"} size={16} />
                {showResetForm ? "Send Reset Link" : "Sign In"}
              </>
            )}
          </button>
        </form>

        {/* Toggle Reset/Login */}
        <div className="mt-4 text-center">
          {!showResetForm ? (
            <button
              onClick={() => {
                setShowResetForm(true);
                setError("");
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Forgot your password?
            </button>
          ) : (
            <button
              onClick={() => {
                setShowResetForm(false);
                setError("");
              }}
              className="text-sm text-slate-400 hover:text-white"
            >
              ← Back to login
            </button>
          )}
        </div>

        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="w-full mt-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            ← Back to sign-in options
          </button>
        )}
      </div>
    </div>
  );
};

export default EmailLogin;
