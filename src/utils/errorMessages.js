/**
 * Error Messages Utility
 * Centralizes error categorization and user messaging logic.
 */

const ERROR_TYPES = {
  PERMISSION_DENIED: "permission-denied",
  UNAUTHENTICATED: "unauthenticated",
  NETWORK_ERROR: "network-error",
  SESSION_EXPIRED: "session-expired",
  RATE_LIMITED: "rate-limited",
  FIREBASE_AUTH_BLOCKED: "firebase-auth-blocked",
  ACCOUNT_EXISTS: "account-exists",
  EMAIL_IN_USE: "email-in-use",
  INVALID_CREDENTIAL: "invalid-credential",
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- This is an error type constant, not a password
  WEAK_PASSWORD: "weak-password",
  UNKNOWN: "unknown",
};

const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium")
  );
};

const getBrowserName = () => {
  const ua = navigator.userAgent;
  if (ua.includes("Brave")) return "Brave";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  return "your browser";
};

/**
 * Categorizes errors based on code or message patterns.
 */
// Helper to match code or message
const matchError = (error, patterns) => {
  const code = error?.code || "";
  const message = error?.message || "";
  return patterns.some((p) => code === p || message.includes(p));
};

const categorizeError = (error) => {
  const code = error?.code || "";
  const message = error?.message || "";

  if (
    message.includes("securetoken.googleapis.com") &&
    message.includes("403")
  ) {
    return ERROR_TYPES.FIREBASE_AUTH_BLOCKED;
  }

  // Auth Specific Errors
  if (code === "auth/account-exists-with-different-credential")
    return ERROR_TYPES.ACCOUNT_EXISTS;
  if (code === "auth/email-already-in-use") return ERROR_TYPES.EMAIL_IN_USE;
  if (code === "auth/weak-password") return ERROR_TYPES.WEAK_PASSWORD;
  if (
    [
      "auth/wrong-password",
      "auth/invalid-credential",
      "auth/user-not-found",
    ].includes(code)
  ) {
    return ERROR_TYPES.INVALID_CREDENTIAL;
  }

  // Broad Categories
  if (
    matchError(error, [
      "permission-denied",
      "403",
      "PERMISSION_DENIED",
      "insufficient permissions",
    ])
  ) {
    return ERROR_TYPES.PERMISSION_DENIED;
  }
  if (
    matchError(error, ["unauthenticated", "auth/user-token-expired", "token"])
  ) {
    return ERROR_TYPES.UNAUTHENTICATED;
  }
  if (matchError(error, ["resource-exhausted", "429", "quota"])) {
    return ERROR_TYPES.RATE_LIMITED;
  }

  const networkPatterns = [
    "unavailable",
    "network-request-failed",
    "network",
    "Failed to fetch",
    "ERR_INTERNET_DISCONNECTED",
    "ERR_BLOCKED_BY_CLIENT",
  ];
  if (matchError(error, networkPatterns)) return ERROR_TYPES.NETWORK_ERROR;

  return ERROR_TYPES.UNKNOWN;
};

const getMessageConfig = (context, browser, usingSafari) => ({
  [ERROR_TYPES.FIREBASE_AUTH_BLOCKED]: {
    title: "🔒 Authentication Blocked",
    message:
      "Your browser is having trouble refreshing your session with Google's authentication servers.",
    actions: [
      "1. Sign out completely",
      "2. Clear browser data",
      "3. Restart browser",
      "4. Sign in again",
    ],
    severity: "error",
    canRetry: false,
  },
  [ERROR_TYPES.ACCOUNT_EXISTS]: {
    title: "⚠️ Account Exists",
    message:
      "An account with this email already exists. Please sign in using your existing method (Email/Password).",
    actions: [
      "1. Sign in with Email/Password",
      "2. Use Forgot Password if needed",
    ],
    severity: "warning",
    canRetry: true,
  },
  [ERROR_TYPES.EMAIL_IN_USE]: {
    title: "📧 Email Registered",
    message: "This email is already registered. Try signing in instead.",
    actions: ["1. Switch to 'Sign In' tab", "2. Reset password if needed"],
    severity: "warning",
    canRetry: true,
  },
  [ERROR_TYPES.INVALID_CREDENTIAL]: {
    title: "❌ Invalid Credentials",
    message: "Incorrect email or password. Please try again.",
    actions: ["1. Check email spelling", "2. Reset password"],
    severity: "warning",
    canRetry: true,
  },
  [ERROR_TYPES.WEAK_PASSWORD]: {
    title: "⚠️ Weak Password",
    message: "Password should be at least 6 characters.",
    actions: ["1. Use a longer password"],
    severity: "warning",
    canRetry: true,
  },
  [ERROR_TYPES.PERMISSION_DENIED]: {
    title: "🔐 Permission Issue",
    message: "Your session may have become stale after extended use.",
    actions: [
      "1. Refresh Session",
      "2. Sign out and back in",
      "3. Work is saved locally",
      usingSafari ? "4. Try Chrome or Firefox" : null,
    ].filter(Boolean),
    severity: "warning",
    canRetry: true,
  },
  [ERROR_TYPES.UNAUTHENTICATED]: {
    title: "🔑 Session Expired",
    message: "Your session has expired. Please sign in again.",
    actions: ['1. Click "Sign Out"', "2. Sign back in"],
    severity: "warning",
    canRetry: false,
  },
  [ERROR_TYPES.NETWORK_ERROR]: {
    title: "📡 Connection Issue",
    message: "Unable to connect. Changes will sync automatically.",
    actions: [
      "1. Check internet connection",
      browser === "Brave" ? "2. Disable Brave Shields" : null,
      "2. Changes are queued",
    ].filter(Boolean),
    severity: "info",
    canRetry: true,
  },
  [ERROR_TYPES.RATE_LIMITED]: {
    title: "⏳ Too Many Requests",
    message: "The server is temporarily limiting requests.",
    actions: ["1. Wait 30 seconds", "2. Try again"],
    severity: "warning",
    canRetry: true,
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: "❌ Unexpected Error",
    message: `An error occurred while ${context}.`,
    actions: ["1. Refresh page", "2. Try again", "3. Contact support"],
    severity: "error",
    canRetry: true,
  },
});

export const getErrorMessage = (error, context = "saving") => {
  const type = categorizeError(error);
  const cfg = getMessageConfig(context, getBrowserName(), isSafari());
  return cfg[type] || cfg[ERROR_TYPES.UNKNOWN];
};

export const getToastMessage = (error, context = "saving") => {
  const type = categorizeError(error);
  const toasts = {
    [ERROR_TYPES.FIREBASE_AUTH_BLOCKED]: "🔒 Auth blocked - refresh session",
    [ERROR_TYPES.PERMISSION_DENIED]: "🔐 Session stale - refresh session",
    [ERROR_TYPES.UNAUTHENTICATED]: "🔑 Session expired",
    [ERROR_TYPES.NETWORK_ERROR]: "📡 Connection issue - queued",
    [ERROR_TYPES.RATE_LIMITED]: "⏳ Too many requests",
    [ERROR_TYPES.UNKNOWN]: `❌ Error ${context}`,
  };
  return toasts[type] || toasts[ERROR_TYPES.UNKNOWN];
};
