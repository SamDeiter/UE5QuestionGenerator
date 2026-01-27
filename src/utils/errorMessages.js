/**
 * Error Messages Utility
 *
 * Provides user-friendly, actionable error messages for common error scenarios.
 * Centralizes error message logic for consistent UX across the application.
 */

/**
 * Error types for categorization
 */
export const ERROR_TYPES = {
  PERMISSION_DENIED: "permission-denied",
  UNAUTHENTICATED: "unauthenticated",
  NETWORK_ERROR: "network-error",
  SESSION_EXPIRED: "session-expired",
  RATE_LIMITED: "rate-limited",
  UNKNOWN: "unknown",
};

/**
 * Detect Safari browser
 */
export const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium")
  );
};

/**
 * Detect browser type for error messages
 */
export const getBrowserName = () => {
  const ua = navigator.userAgent;
  if (ua.includes("Brave")) return "Brave";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  return "your browser";
};

/**
 * Parse Firebase error and return categorized error type
 */
export const categorizeError = (error) => {
  const code = error?.code || "";
  const message = error?.message || "";

  // Permission errors
  if (
    code === "permission-denied" ||
    message.includes("403") ||
    message.includes("PERMISSION_DENIED") ||
    message.includes("Missing or insufficient permissions")
  ) {
    return ERROR_TYPES.PERMISSION_DENIED;
  }

  // Authentication errors
  if (
    code === "unauthenticated" ||
    code === "auth/user-token-expired" ||
    message.includes("unauthenticated") ||
    message.includes("token")
  ) {
    return ERROR_TYPES.UNAUTHENTICATED;
  }

  // Network errors
  if (
    code === "unavailable" ||
    code === "network-request-failed" ||
    message.includes("network") ||
    message.includes("Failed to fetch") ||
    message.includes("ERR_INTERNET_DISCONNECTED") ||
    message.includes("ERR_BLOCKED_BY_CLIENT")
  ) {
    return ERROR_TYPES.NETWORK_ERROR;
  }

  // Rate limiting
  if (
    code === "resource-exhausted" ||
    message.includes("429") ||
    message.includes("quota")
  ) {
    return ERROR_TYPES.RATE_LIMITED;
  }

  return ERROR_TYPES.UNKNOWN;
};

/**
 * Get user-friendly error message with recovery steps
 */
export const getErrorMessage = (error, context = "saving") => {
  const errorType = categorizeError(error);
  const browser = getBrowserName();
  const usingSafari = isSafari();

  const messages = {
    [ERROR_TYPES.PERMISSION_DENIED]: {
      title: "🔐 Permission Issue",
      message: `Unable to save your changes. Your session may have expired.`,
      actions: [
        "1. Click the refresh button below",
        "2. If that doesn't work, sign out and sign back in",
        usingSafari
          ? "3. Consider using Chrome or Firefox for better compatibility"
          : null,
      ].filter(Boolean),
      severity: "warning",
      canRetry: true,
    },
    [ERROR_TYPES.UNAUTHENTICATED]: {
      title: "🔑 Session Expired",
      message: "Your session has expired. Please sign in again to continue.",
      actions: [
        '1. Click "Sign Out" in the top menu',
        "2. Sign back in with your account",
      ],
      severity: "warning",
      canRetry: false,
    },
    [ERROR_TYPES.NETWORK_ERROR]: {
      title: "📡 Connection Issue",
      message: `Unable to connect to the server. Your changes will be saved automatically when the connection is restored.`,
      actions: [
        "1. Check your internet connection",
        browser === "Brave"
          ? "2. Try disabling Brave Shields for this site"
          : null,
        "2. Changes are queued and will sync automatically",
      ].filter(Boolean),
      severity: "info",
      canRetry: true,
    },
    [ERROR_TYPES.RATE_LIMITED]: {
      title: "⏳ Too Many Requests",
      message:
        "The server is temporarily limiting requests. Please wait a moment and try again.",
      actions: ["1. Wait 30 seconds", "2. Try your action again"],
      severity: "warning",
      canRetry: true,
    },
    [ERROR_TYPES.UNKNOWN]: {
      title: "❌ Unexpected Error",
      message: `An error occurred while ${context}. Please try again.`,
      actions: [
        "1. Refresh the page",
        "2. Try your action again",
        "3. If the problem persists, contact support",
      ],
      severity: "error",
      canRetry: true,
    },
  };

  return messages[errorType] || messages[ERROR_TYPES.UNKNOWN];
};

/**
 * Format error for toast notification (short version)
 */
export const getToastMessage = (error, context = "saving") => {
  const errorType = categorizeError(error);

  const toasts = {
    [ERROR_TYPES.PERMISSION_DENIED]:
      "🔐 Permission issue - please refresh or re-sign in",
    [ERROR_TYPES.UNAUTHENTICATED]: "🔑 Session expired - please sign in again",
    [ERROR_TYPES.NETWORK_ERROR]:
      "📡 Connection issue - changes queued for sync",
    [ERROR_TYPES.RATE_LIMITED]: "⏳ Too many requests - please wait and retry",
    [ERROR_TYPES.UNKNOWN]: `❌ Error ${context} - please try again`,
  };

  return toasts[errorType] || toasts[ERROR_TYPES.UNKNOWN];
};

/**
 * Check if error is recoverable (user can retry)
 */
export const isRecoverableError = (error) => {
  const errorType = categorizeError(error);
  return errorType !== ERROR_TYPES.UNAUTHENTICATED;
};

/**
 * Check if error should prompt for re-authentication
 */
export const shouldPromptReauth = (error) => {
  const errorType = categorizeError(error);
  return (
    errorType === ERROR_TYPES.UNAUTHENTICATED ||
    errorType === ERROR_TYPES.PERMISSION_DENIED
  );
};
