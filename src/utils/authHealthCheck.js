/**
 * Auth Health Check Utility
 *
 * Performs startup diagnostics to verify Firebase auth services are functioning.
 * Helps detect issues like disabled Token Service API (Stephan's securetoken 403 error).
 *
 * @module authHealthCheck
 */

import { auth } from "../services/firebase";
import { logger } from "./logger";

/**
 * Auth health status object
 * @typedef {Object} AuthHealthStatus
 * @property {boolean} healthy - Whether all checks passed
 * @property {boolean} tokenRefreshOk - Whether token refresh works
 * @property {boolean} userLoaded - Whether user is loaded
 * @property {string|null} error - Error message if unhealthy
 * @property {string|null} errorCode - Specific error code for troubleshooting
 * @property {string|null} guidance - User-facing guidance for resolution
 */

/**
 * Error codes and their user-facing guidance
 */
const ERROR_GUIDANCE = {
  "auth/network-request-failed": {
    message: "Network connection issue",
    guidance:
      "Check your internet connection. If using a VPN or firewall, ensure Firebase domains are allowed.",
  },
  "auth/quota-exceeded": {
    message: "API quota exceeded",
    guidance:
      "The project has exceeded its daily usage limit. Contact the administrator.",
  },
  "auth/internal-error": {
    message: "Firebase internal error",
    guidance:
      "This may indicate the Token Service API is disabled. Check Google Cloud Console.",
  },
  403: {
    message: "API access denied (403)",
    guidance:
      "The Token Service API may be disabled. An administrator needs to enable it in Google Cloud Console > APIs & Services.",
  },
  blocked: {
    message: "Request blocked",
    guidance:
      "A browser extension may be blocking Firebase. Try disabling ad blockers or use an incognito window.",
  },
  default: {
    message: "Authentication service error",
    guidance:
      "An unexpected error occurred. Please try refreshing the page or contact support.",
  },
};

/**
 * Determines error guidance based on error object
 * @param {Error} error - The error to analyze
 * @returns {Object} Error guidance object
 */
function getErrorGuidance(error) {
  const errorCode = error?.code || "";
  const errorMessage = error?.message?.toLowerCase() || "";

  // Check for specific error codes first
  if (ERROR_GUIDANCE[errorCode]) {
    return { ...ERROR_GUIDANCE[errorCode], errorCode };
  }

  // Check for 403 in message (securetoken API disabled)
  if (errorMessage.includes("403")) {
    return { ...ERROR_GUIDANCE["403"], errorCode: "403" };
  }

  // Check for blocked requests (ad blocker)
  if (
    errorMessage.includes("blocked") ||
    errorMessage.includes("failed to fetch") ||
    errorMessage.includes("network request failed")
  ) {
    return { ...ERROR_GUIDANCE["blocked"], errorCode: "blocked" };
  }

  // Default fallback
  return { ...ERROR_GUIDANCE["default"], errorCode: errorCode || "unknown" };
}

/**
 * Runs a comprehensive auth health check.
 *
 * Tests:
 * 1. Whether a user is currently authenticated
 * 2. Whether token refresh works (catches disabled Token Service API)
 *
 * @returns {Promise<AuthHealthStatus>} Health check results
 */
export async function runAuthHealthCheck() {
  const startTime = Date.now();
  logger.log("🏥 [AuthHealthCheck] Starting auth health check...");

  const status = {
    healthy: true,
    tokenRefreshOk: false,
    userLoaded: false,
    error: null,
    errorCode: null,
    guidance: null,
    durationMs: 0,
  };

  try {
    // Check 1: Is there a current user?
    const currentUser = auth.currentUser;
    status.userLoaded = !!currentUser;

    if (!currentUser) {
      logger.log(
        "🏥 [AuthHealthCheck] No user logged in - skipping token test"
      );
      status.durationMs = Date.now() - startTime;
      return status;
    }

    // Check 2: Can we refresh the token?
    // This is the key test that fails when Token Service API is disabled
    try {
      logger.log("🏥 [AuthHealthCheck] Testing token refresh...");
      await currentUser.getIdToken(true); // Force refresh
      status.tokenRefreshOk = true;
      logger.log("✅ [AuthHealthCheck] Token refresh successful");
    } catch (tokenError) {
      logger.error("❌ [AuthHealthCheck] Token refresh failed:", tokenError);
      status.healthy = false;
      status.tokenRefreshOk = false;

      const guidance = getErrorGuidance(tokenError);
      status.error = guidance.message;
      status.errorCode = guidance.errorCode;
      status.guidance = guidance.guidance;
    }
  } catch (error) {
    logger.error("❌ [AuthHealthCheck] Health check failed:", error);
    status.healthy = false;

    const guidance = getErrorGuidance(error);
    status.error = guidance.message;
    status.errorCode = guidance.errorCode;
    status.guidance = guidance.guidance;
  }

  status.durationMs = Date.now() - startTime;
  logger.log(
    `🏥 [AuthHealthCheck] Complete in ${status.durationMs}ms. Healthy: ${status.healthy}`
  );

  return status;
}

/**
 * Quick check if auth services are likely working.
 * Less comprehensive than runAuthHealthCheck but faster.
 *
 * @returns {boolean} true if auth appears to be working
 */
export function isAuthLikelyWorking() {
  try {
    // Basic sanity check - can we access auth.currentUser?
    const user = auth.currentUser;
    return user !== undefined;
  } catch {
    return false;
  }
}

/**
 * Formats health status for display in UI
 * @param {AuthHealthStatus} status - Health check result
 * @returns {Object} UI-friendly formatted status
 */
export function formatHealthStatusForUI(status) {
  if (status.healthy) {
    return {
      variant: "success",
      title: "Auth Services Healthy",
      message: "All authentication services are functioning normally.",
      showDetails: false,
    };
  }

  return {
    variant: "warning",
    title: "Auth Service Issue Detected",
    message: status.error || "Unknown authentication error",
    guidance: status.guidance,
    errorCode: status.errorCode,
    showDetails: true,
  };
}
