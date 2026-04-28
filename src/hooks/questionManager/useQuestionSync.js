/* eslint-disable sonarjs/no-nested-functions */
import { useEffect } from "react";
import { logger } from "../../utils/logger";
import { STORAGE_KEYS, QUESTION_SOURCES } from "../../utils/constants";
import { saveQuestionToFirestore } from "../../services/firebase";
import { subscribeToAllQuestions } from "../../services/firebaseQueries";

/**
 * Hook for handling external synchronization (storage events, cloud auto-save).
 */
export const useQuestionSync = (allQuestions, setAllQuestions) => {
  // Sync questions across browser tabs via storage event
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEYS.QUESTIONS && e.newValue) {
        try {
          const newSessionQuestions = JSON.parse(e.newValue).map((q) => ({
            ...q,
            _source: QUESTION_SOURCES.SESSION,
          }));
          logger.log(
            `🔄 Syncing ${newSessionQuestions.length} questions from another tab...`
          );

          // Update ONLY the session questions in the unified state
          setAllQuestions((prev) => {
            const nonSession = prev.filter(
              (q) => q._source !== QUESTION_SOURCES.SESSION
            );
            return [...nonSession, ...newSessionQuestions];
          });
        } catch (err) {
          logger.error("Failed to sync questions from storage:", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [setAllQuestions]);

  // PHASE 3.2: Real-time Firestore synchronization
  useEffect(() => {
    // Only subscribe if we are in a mode that needs real-time DB updates
    // (e.g. not just purely local session mode)
    logger.log("📡 Enabling real-time database synchronization...");

    const unsubscribe = subscribeToAllQuestions((firestoreQuestions) => {
      if (!firestoreQuestions || firestoreQuestions.length === 0) return;

      logger.log(
        `📥 Received ${firestoreQuestions.length} real-time updates from Firestore`
      );

      setAllQuestions((prev) => {
        // Create a map of the new questions for fast lookup
        const firestoreMap = new Map(
          firestoreQuestions.map((q) => [q.id, { ...q, _source: QUESTION_SOURCES.DATABASE }])
        );

        // Merge logic:
        // 1. Keep all non-database questions (SESSION, etc.)
        // 2. For DATABASE questions, if they are in the new batch, use the NEW one
        // 3. If they are NOT in the new batch, keep them (they might be older ones we loaded earlier)
        
        const nonDatabase = prev.filter(q => q._source !== QUESTION_SOURCES.DATABASE);
        const existingDatabase = prev.filter(q => q._source === QUESTION_SOURCES.DATABASE);
        
        // Update existing or add new
        const updatedDatabase = existingDatabase.map(q => firestoreMap.get(q.id) || q);
        
        // Find brand new ones (not in existingDatabase)
        const existingIds = new Set(existingDatabase.map(q => q.id));
        const newDatabase = firestoreQuestions
          .filter(q => !existingIds.has(q.id))
          .map(q => ({ ...q, _source: QUESTION_SOURCES.DATABASE }));

        return [...nonDatabase, ...updatedDatabase, ...newDatabase];
      });
    });

    return () => {
      logger.log("🔌 Disabling real-time database synchronization");
      unsubscribe();
    };
  }, [setAllQuestions]);

  /**
   * Helper to perform cloud backup
   */
  const backupToCloud = async (newItems, targetSource) => {
    if (
      targetSource === QUESTION_SOURCES.SESSION &&
      newItems &&
      newItems.length > 0
    ) {
      logger.log(`💾 Auto-saving ${newItems.length} questions to Firestore...`);
      const savePromises = newItems.map((q) =>
        saveQuestionToFirestore(q).catch((err) => {
          logger.warn(`⚠️ Failed to auto-save question ${q.uniqueId}:`, err);
        })
      );
      await Promise.all(savePromises);
      logger.log(`✓ Auto-saved ${newItems.length} questions to cloud`);
    }
  };

  return { backupToCloud };
};
