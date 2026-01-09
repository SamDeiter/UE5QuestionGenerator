import { useState, useEffect } from "react";
import { getSecureItem, setSecureItem } from "../../utils/secureStorage";
import { logger } from "../../utils/logger";
import { STORAGE_KEYS } from "../../utils/constants";

/**
 * Hook for managing the raw question state and local persistence.
 * This is the lowest-level hook for question data.
 */
export const useQuestionState = (config) => {
  // Unified State: Single source of truth for ALL questions
  const [allQuestions, setAllQuestions] = useState(() => {
    const saved = getSecureItem(STORAGE_KEYS.QUESTIONS);
    if (saved && Array.isArray(saved)) {
      // Hydrate saved questions as 'session' source
      return saved.map((q) => ({ ...q, _source: "session" }));
    }
    return [];
  });

  // Persist session questions ONLY to localStorage
  useEffect(() => {
    const sessionQuestions = allQuestions.filter(
      (q) => q._source === "session"
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
        q._source === "session" &&
        (!q.creatorName ||
          q.creatorName === "N/A" ||
          q.creatorName === "Unknown")
    );

    if (needsBackfill) {
      setAllQuestions((prev) =>
        prev.map((q) => {
          if (
            q._source === "session" &&
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
