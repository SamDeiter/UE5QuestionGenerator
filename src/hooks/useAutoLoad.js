import { useEffect, useRef } from "react";
import { logger } from "../utils/logger";
import { runLocalStorageMigration } from "../utils/migrateScores";

/**
 * Hook to auto-load database questions on startup.
 * Runs once when user is authenticated and not loading.
 *
 * `isInitialLoading` is OWNED by the caller (AuthenticatedApp) and passed in
 * here as a setter, rather than owned locally. This lets sibling hooks that
 * run BEFORE useAutoLoad in the render (e.g. useQuestionManager, which needs
 * to gate its realtime listener on the initial-load flag) read the same
 * state — useAutoLoad can't return it early enough for them because it
 * depends on handleLoadFromFirestore, which depends on those very hooks.
 *
 * @param {Object} options - Configuration options
 * @param {Object|null} options.user - The authenticated user object
 * @param {boolean} options.authLoading - Whether auth is still loading
 * @param {Function} options.handleLoadFromFirestore - Function to load questions from Firestore
 * @param {Function} options.setIsInitialLoading - Setter for the caller-owned initial-load flag
 * @returns {Object} { hasAutoLoaded }
 */
export function useAutoLoad({
  user,
  authLoading,
  handleLoadFromFirestore,
  setIsInitialLoading,
}) {
  const hasAutoLoadedRef = useRef(false);

  useEffect(() => {
    // Still waiting for auth to resolve
    if (authLoading) {
      return;
    }

    // User not authenticated - no loading needed
    if (!user) {
      setIsInitialLoading(false);
      return;
    }

    // Already loaded - done
    if (hasAutoLoadedRef.current) {
      setIsInitialLoading(false);
      return;
    }

    // First load for authenticated user
    const loadQuestions = async () => {
      // One-time migration: Add improvedScore to existing critiques
      const migrated = runLocalStorageMigration();
      if (migrated.updated > 0) {
        logger.log(
          `🔄 Migrated ${migrated.updated} questions with estimated improved scores`
        );
      }

      hasAutoLoadedRef.current = true;
      logger.log("📊 Loading all questions from Firestore...");

      // Load all questions on startup
      await handleLoadFromFirestore(true);
      setIsInitialLoading(false);
    };

    loadQuestions();
  }, [user, authLoading, handleLoadFromFirestore, setIsInitialLoading]);

  return { hasAutoLoaded: hasAutoLoadedRef.current };
}

export default useAutoLoad;
