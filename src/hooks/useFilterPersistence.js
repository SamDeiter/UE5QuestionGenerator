import { useEffect, useRef } from "react";
import { STORAGE_KEYS } from "../utils/constants";
import { logger } from "../utils/logger";

/**
 * useFilterPersistence Hook
 *
 * Handles persisting filter state to localStorage and restoring
 * the user's position in the question list across page refreshes.
 *
 * @param {Object} params - Hook parameters
 * @param {string} params.appMode - Current app mode
 * @param {string} params.searchTerm - Current search term
 * @param {string} params.filterMode - Current filter mode
 * @param {boolean} params.showHistory - Whether history is shown
 * @param {number} params.currentReviewIndex - Current position in review list
 * @param {Function} params.setCurrentReviewIndex - Setter for review index
 * @param {Function} params.setLastUniqueId - Setter for last unique ID
 * @param {Array} params.uniqueFilteredQuestions - Filtered question list
 */
export function useFilterPersistence({
  appMode,
  searchTerm,
  filterMode,
  showHistory,
  currentReviewIndex,
  setCurrentReviewIndex,
  setLastUniqueId,
  uniqueFilteredQuestions,
}) {
  // ========================================================================
  // REFS
  // ========================================================================

  // Track if we've restored position (prevent multiple restorations)
  const hasRestoredRef = useRef(false);

  // Reset restoration flag when leaving review mode
  const lastModeRef = useRef(appMode);

  // ========================================================================
  // EFFECTS - Persistence
  // ========================================================================

  // Persist filter preferences to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PREF_SEARCH, searchTerm);
    localStorage.setItem(STORAGE_KEYS.PREF_FILTER, filterMode);
    localStorage.setItem(STORAGE_KEYS.PREF_HISTORY, showHistory);
  }, [searchTerm, filterMode, showHistory]);

  // Persist review index
  useEffect(() => {
    if (appMode === "review") {
      localStorage.setItem(STORAGE_KEYS.PREF_REVIEW_INDEX, currentReviewIndex);
    }
  }, [currentReviewIndex, appMode]);

  // Reset restoration flag when entering review mode from another mode
  useEffect(() => {
    if (appMode === "review" && lastModeRef.current !== "review") {
      hasRestoredRef.current = false;
    }
    lastModeRef.current = appMode;
  }, [appMode]);

  // ========================================================================
  // EFFECTS - Position Restoration
  // ========================================================================

  // Restore position when entering review mode
  useEffect(() => {
    if (
      appMode === "review" &&
      !hasRestoredRef.current &&
      uniqueFilteredQuestions.length > 0
    ) {
      const savedId = localStorage.getItem(STORAGE_KEYS.PREF_LAST_ID);
      const savedIndex = parseInt(
        localStorage.getItem(STORAGE_KEYS.PREF_REVIEW_INDEX) || "0",
        10
      );

      logger.log("🎯 [Restoration] Attempting restoration...", {
        savedId,
        savedIndex,
        listSize: uniqueFilteredQuestions.length,
      });

      if (savedId) {
        const idx = uniqueFilteredQuestions.findIndex(
          (q) => q.uniqueId === savedId
        );
        if (idx !== -1) {
          logger.log(
            `🎯 [Restoration] Found saved question ${savedId} at index ${idx}`
          );
          setCurrentReviewIndex(idx);
          hasRestoredRef.current = true;
          return;
        }
      }

      if (savedIndex > 0 && savedIndex < uniqueFilteredQuestions.length) {
        logger.log(
          `🎯 [Restoration] Falling back to saved index ${savedIndex}`
        );
        setCurrentReviewIndex(savedIndex);
      }
      hasRestoredRef.current = true;
    }
  }, [
    appMode,
    uniqueFilteredQuestions,
    setCurrentReviewIndex,
    setLastUniqueId,
  ]);

  // Save current position when it changes
  useEffect(() => {
    if (appMode === "review" && uniqueFilteredQuestions.length > 0) {
      const currentQ = uniqueFilteredQuestions[currentReviewIndex];
      if (currentQ?.uniqueId) {
        localStorage.setItem(STORAGE_KEYS.PREF_LAST_ID, currentQ.uniqueId);
        setLastUniqueId(currentQ.uniqueId);
      }
    }
  }, [appMode, currentReviewIndex, uniqueFilteredQuestions, setLastUniqueId]);
}
