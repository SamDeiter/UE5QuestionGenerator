import { useEffect } from "react";
import { logger } from "../utils/logger";
import { initializeAgents, resetAgents } from "../agents";
import { authManager } from "../services/AuthManager";

/**
 * Hook to manage concurrent editing agents lifecycle.
 * Initializes agents when user is authenticated and cleans up on logout.
 *
 * @param {Object} options - Configuration options
 * @param {Object|null} options.user - The authenticated user object
 * @param {boolean} options.authLoading - Whether auth is still loading
 */
export function useAgentLifecycle({ user, authLoading }) {
  useEffect(() => {
    if (user && !authLoading) {
      // Initialize agents with Firestore instance
      const initAgents = async () => {
        try {
          const { getDb } = await import("../services/firebase");
          initializeAgents(getDb());
          logger.log("✅ Concurrent editing agents initialized");
        } catch (error) {
          logger.error("❌ Failed to initialize agents:", error);
        }
      };
      initAgents();

      // Register agent cleanup on logout
      const cleanupFn = authManager.registerCleanup(() => {
        logger.log("🧹 Cleaning up agents on logout");
        resetAgents();
      });

      return cleanupFn;
    }
  }, [user, authLoading]);
}

export default useAgentLifecycle;
