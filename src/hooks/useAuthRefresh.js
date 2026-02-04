import { useEffect } from "react";
import { logger } from "../utils/logger";
import { TOAST_DURATION } from "../utils/constants";
import { refreshAuthToken, signOutUser } from "../services/firebaseAuth";

// Constants
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const SIGN_OUT_DELAY_MS = 2000;

/**
 * Hook to manage auth token refresh lifecycle.
 * Performs initial token refresh on mount and sets up periodic refresh.
 *
 * @param {Object} options - Configuration options
 * @param {Object|null} options.user - The authenticated user object
 * @param {boolean} options.authLoading - Whether auth is still loading
 * @param {Function} options.showMessage - Toast message handler
 */
export function useAuthRefresh({ user, authLoading, showMessage }) {
  useEffect(() => {
    if (!user || authLoading) return;

    // HIGH 7: Enhanced handler for auth refresh result
    const handleAuthRefreshResult = (result, isAutoRefresh = false) => {
      if (result?.success) {
        logger.log(
          isAutoRefresh
            ? "🔄 Auth token auto-refreshed"
            : "🔄 Initial auth token refreshed"
        );
      } else if (result?.reason === "auth-blocked") {
        logger.error("🔒 Auth blocked - securetoken 403 detected");
        showMessage(
          "🔒 Session corrupted - signing you out automatically...",
          "error"
        );
        // A6: Auto sign-out to clear corrupted auth state
        setTimeout(() => signOutUser(), SIGN_OUT_DELAY_MS);
      } else if (result?.reason === "auth/user-disabled") {
        // HIGH 7: Account disabled by admin
        showMessage(
          "⚠️ Your account has been disabled. Please contact support.",
          "error",
          TOAST_DURATION.LONG
        );
        setTimeout(() => signOutUser(), SIGN_OUT_DELAY_MS);
      } else if (result?.reason === "auth/id-token-revoked") {
        // HIGH 7: Token revoked (password changed, security event)
        showMessage(
          "🔐 Session expired - please sign in again.",
          "warning",
          TOAST_DURATION.LONG
        );
        setTimeout(() => signOutUser(), SIGN_OUT_DELAY_MS);
      } else if (isAutoRefresh && !result?.success) {
        // HIGH 7: Generic refresh failure - show clear message
        logger.warn("⚠️ Auth token refresh failed:", result?.reason);
        if (result?.reason === "auth/network-request-failed") {
          showMessage(
            "📶 Network issue - couldn't refresh session. Check your connection.",
            "warning"
          );
        } else {
          // For other failures, prompt re-auth
          showMessage(
            "⏳ Session needs refresh - please sign out and back in.",
            "warning",
            TOAST_DURATION.LONG
          );
        }
      }
    };

    // Refresh token immediately on mount
    refreshAuthToken().then((result) => handleAuthRefreshResult(result, false));

    // Set up periodic refresh every 30 minutes
    const intervalId = setInterval(() => {
      refreshAuthToken().then((result) =>
        handleAuthRefreshResult(result, true)
      );
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [user, authLoading, showMessage]);
}

export default useAuthRefresh;
