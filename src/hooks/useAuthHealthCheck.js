import { useState, useEffect } from "react";
import { runAuthHealthCheck } from "../utils/authHealthCheck";
import { logger } from "../utils/logger";

/**
 * Hook to run auth health check on authenticated user mount
 *
 * Detects Token Service API issues that could cause permission errors.
 * Returns the health status for display in AppBanners.
 *
 * @param {Object} options - Hook options
 * @param {Object} options.user - Firebase user object
 * @param {boolean} options.authLoading - Whether auth is still loading
 * @returns {Object|null} - Auth health status or null if not checked yet
 */
export function useAuthHealthCheck({ user, authLoading }) {
  const [authHealthStatus, setAuthHealthStatus] = useState(null);

  useEffect(() => {
    if (user && !authLoading) {
      // Run health check to detect Token Service API issues
      runAuthHealthCheck().then((status) => {
        setAuthHealthStatus(status);
        if (!status.healthy) {
          logger.warn("🏥 Auth health check failed:", status);
        }
      });
    }
  }, [user, authLoading]);

  return authHealthStatus;
}
