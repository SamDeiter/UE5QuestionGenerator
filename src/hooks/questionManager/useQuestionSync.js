/* eslint-disable sonarjs/no-nested-functions */
import { useEffect } from "react";
import { logger } from "../../utils/logger";
import { STORAGE_KEYS, QUESTION_SOURCES } from "../../utils/constants";
import { saveQuestionToFirestore } from "../../services/firebase";

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
