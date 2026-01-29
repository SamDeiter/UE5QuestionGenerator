import { useEffect, useRef } from "react";
import { logger } from "../utils/logger";
import { runLocalStorageMigration } from "../utils/migrateScores";

/**
 * Hook to auto-load database questions on startup.
 * Runs once when user is authenticated and not loading.
 *
 * @param {Object} options - Configuration options
 * @param {Object|null} options.user - The authenticated user object
 * @param {boolean} options.authLoading - Whether auth is still loading
 * @param {Function} options.handleLoadFromFirestore - Function to load questions from Firestore
 */
export function useAutoLoad({ user, authLoading, handleLoadFromFirestore }) {
  const hasAutoLoadedRef = useRef(false);

  useEffect(() => {
    if (user && !authLoading && !hasAutoLoadedRef.current) {
      // One-time migration: Add improvedScore to existing critiques
      const migrated = runLocalStorageMigration();
      if (migrated.updated > 0) {
        logger.log(
          `🔄 Migrated ${migrated.updated} questions with estimated improved scores`
        );
      }

      hasAutoLoadedRef.current = true;
      logger.log("📊 Pre-loading first 50 questions for instant display...");

      // PERFORMANCE FIX v2: Pre-load 50 questions for fast initial display
      // Full dataset loads via real-time subscription in background
      handleLoadFromFirestore(true, 50); // Limited eager load
    }
  }, [user, authLoading, handleLoadFromFirestore]);

  return { hasAutoLoaded: hasAutoLoadedRef.current };
}

export default useAutoLoad;
