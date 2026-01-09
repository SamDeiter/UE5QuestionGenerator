import { useState, useEffect } from "react";
import { getSecureItem, setSecureItem } from "../../utils/secureStorage";
import { STORAGE_KEYS, QUESTION_SOURCES } from "../../utils/constants";

/**
 * Hook for managing the raw question state and local persistence.
 * This is the lowest-level hook for question data.
 */
export const useQuestionState = (config) => {
  // Unified State: Single source of truth for ALL questions
  // Unified State: Single source of truth for ALL questions
  const [allQuestions, setAllQuestions] = useState([]);

  // Load questions asynchronously to unblock initial render
  useEffect(() => {
    const loadState = async () => {
      // Yield to main thread
      await new Promise((resolve) => setTimeout(resolve, 0));

      const saved = getSecureItem(STORAGE_KEYS.QUESTIONS);
      if (saved && Array.isArray(saved)) {
        // Hydrate saved questions as 'session' source
        setAllQuestions(
          saved.map((q) => ({ ...q, _source: QUESTION_SOURCES.SESSION }))
        );
      }
    };
    loadState();
  }, []);

  // Persist session questions ONLY to localStorage
  useEffect(() => {
    const sessionQuestions = allQuestions.filter(
      (q) => q._source === QUESTION_SOURCES.SESSION
    );
    // Strip the internal _source tag before saving to avoid cluttering storage/exports
    const cleanQuestions = sessionQuestions.map(({ _source, ...q }) => q);
    setSecureItem(STORAGE_KEYS.QUESTIONS, cleanQuestions);
  }, [allQuestions]);

  // Backfill creatorName on questions missing it (Session only)
  useEffect(() => {
    if (!config.creatorName) return;

    const needsBackfill = allQuestions.some(
      (q) =>
        q._source === QUESTION_SOURCES.SESSION &&
        (!q.creatorName ||
          q.creatorName === "N/A" ||
          q.creatorName === "Unknown")
    );

    if (needsBackfill) {
      setAllQuestions((prev) =>
        prev.map((q) => {
          if (
            q._source === QUESTION_SOURCES.SESSION &&
            (!q.creatorName ||
              q.creatorName === "N/A" ||
              q.creatorName === "Unknown")
          ) {
            return { ...q, creatorName: config.creatorName };
          }
          return q;
        })
      );
    }
  }, [config.creatorName, allQuestions]);

  return [allQuestions, setAllQuestions];
};
