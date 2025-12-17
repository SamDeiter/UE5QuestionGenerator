import { useState } from "react";
import {
  signInWithGoogle,
  signUpWithEmail,
  signInWithEmail,
  resetPassword,
} from "../services/firebase";
import Icon from "./Icon";

const SignIn = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isNewUser, setIsNewUser] = useState(true);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
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
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (isNewUser) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      console.error(err);
      let message = err.message || "Authentication failed";
      if (err.code === "auth/email-already-in-use") {
        message = "Email already registered. Try signing in instead.";
        setIsNewUser(false);
      } else if (err.code === "auth/weak-password") {
        message = "Password should be at least 6 characters.";
      } else if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        message = "Incorrect email or password.";
      } else if (err.code === "auth/user-not-found") {
        message = "No account found with this email. Try creating an account.";
        setIsNewUser(true);
      } else if (err.code === "auth/invalid-email") {
        message = "Invalid email address format.";
      } else if (err.code === "auth/user-disabled") {
        message =
          "Your account has been disabled by an administrator. Please contact support if you believe this is an error.";
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResetSuccess(false);

    try {
      await resetPassword(email);
      setResetSuccess(true);
    } catch (err) {
      console.error(err);
      let message = err.message || "Failed to send reset email";
      if (err.code === "auth/user-not-found") {
        message = "No account found with this email address.";
      } else if (err.code === "auth/invalid-email") {
        message = "Invalid email address format.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many requests. Please try again later.";
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
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
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {resetSuccess && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-sm">
            Password reset email sent! Check your inbox and spam folder.
          </div>
        )}

        {showPasswordReset ? (
          // Password Reset Form
          <form onSubmit={handlePasswordReset} className="space-y-3 text-left">
            <div>
              <label
                htmlFor="reset-email"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
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
              {isLoading ? "Sending..." : "Send Reset Email"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPasswordReset(false);
                setResetSuccess(false);
                setError(null);
              }}
              className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← Back to sign in
            </button>
          </form>
        ) : !showEmailAuth ? (
          // Auth Options
          <div className="space-y-3">
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

            <div className="flex items-center gap-3 text-slate-500 text-sm">
              <div className="flex-1 h-px bg-slate-700" />
              <span>or</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            <button
              onClick={() => setShowEmailAuth(true)}
              className="w-full flex items-center justify-center gap-3 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all border border-slate-700"
            >
              <Icon name="mail" size={20} />
              Continue with Email
            </button>

            <p className="text-xs text-slate-600">
              Sign in with any Google or email account.
            </p>
          </div>
        ) : (
          // Email/Password Form
          <form onSubmit={handleEmailAuth} className="space-y-3 text-left">
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
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
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
                placeholder="6+ characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
            >
              {isLoading
                ? "Please wait..."
                : isNewUser
                ? "Create Account"
                : "Sign In"}
            </button>
            <button
              type="button"
              onClick={() => setIsNewUser(!isNewUser)}
              className="w-full text-sm text-slate-400 hover:text-white transition-colors"
            >
              {isNewUser
                ? "Already have an account? Sign in"
                : "New user? Create account"}
            </button>
            {!isNewUser && (
              <button
                type="button"
                onClick={() => {
                  setShowPasswordReset(true);
                  setShowEmailAuth(false);
                }}
                className="w-full text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Forgot password?
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowEmailAuth(false)}
              className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← Back to sign-in options
            </button>
          </form>
        )}
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
