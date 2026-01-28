/**
 * useFiltering Hook (Orchestrator)
 *
 * Manages all filtering and search state for the question list, including:
 * - Search term
 * - Filter mode (pending/accepted/rejected/all)
 * - Show history toggle
 * - Filter by creator
 * - Filter by tags
 * - Sort order
 *
 * This hook orchestrates the sub-hooks for modularity:
 * - useFilterState: Basic filter state management
 * - useFilterPersistence: localStorage save/restore
 * - useFilteredQuestions: Core filtering/sorting logic
 *
 * @module hooks/useFiltering
 */

import { useEffect, useRef } from "react";
import { useFilterState } from "./useFilterState";
import { useFilterPersistence } from "./useFilterPersistence";
import { useFilteredQuestions } from "./useFilteredQuestions";
import { STORAGE_KEYS } from "../utils/constants";
import { logger } from "../utils/logger";

/**
 * Custom hook for managing question filtering state and logic.
 *
 * @param {Object} params - Hook parameters
 * @param {Array} params.questions - Current session questions
 * @param {Array} params.historicalQuestions - Historical questions from cloud
 * @param {Object} params.config - App configuration (creatorName, discipline, difficulty, language)
 * @param {string} params.appMode - Current app mode ('create', 'review', 'database', etc.)
 * @param {Map} params.allQuestionsMap - Map of all questions by uniqueId
 * @returns {Object} Filtering state and handlers
 */
export function useFiltering({
  questions,
  historicalQuestions,
  config,
  appMode,
  allQuestionsMap,
}) {
  // ========================================================================
  // SUB-HOOKS
  // ========================================================================

  // 1. Basic filter state
  const filterState = useFilterState(appMode);

  // 2. Core filtering logic
  const {
    contextFilteredQuestions,
    contextCounts,
    filteredQuestions,
    uniqueFilteredQuestions,
    uniqueReviewers,
  } = useFilteredQuestions({
    questions,
    historicalQuestions,
    config,
    appMode,
    allQuestionsMap,
    filterState,
  });

  // 3. Persistence (localStorage save/restore)
  useFilterPersistence({
    appMode,
    searchTerm: filterState.searchTerm,
    filterMode: filterState.filterMode,
    showHistory: filterState.showHistory,
    currentReviewIndex: filterState.currentReviewIndex,
    setCurrentReviewIndex: filterState.setCurrentReviewIndex,
    setLastUniqueId: filterState.setLastUniqueId,
    uniqueFilteredQuestions,
  });

  // ========================================================================
  // POSITION PRESERVATION LOGIC
  // ========================================================================

  const lastKnownUniqueIdRef = useRef(null);
  const lastKnownIndexRef = useRef(filterState.currentReviewIndex);
  const lastKnownListRef = useRef(uniqueFilteredQuestions);

  useEffect(() => {
    const indexChanged =
      filterState.currentReviewIndex !== lastKnownIndexRef.current;

    if (uniqueFilteredQuestions.length === 0) {
      lastKnownUniqueIdRef.current = null;
      lastKnownIndexRef.current = filterState.currentReviewIndex;
      lastKnownListRef.current = uniqueFilteredQuestions;
      return;
    }

    const currentQ = uniqueFilteredQuestions[filterState.currentReviewIndex];
    const currentUniqueId = currentQ?.uniqueId;

    // If user intentionally navigated, update tracking
    if (indexChanged) {
      lastKnownUniqueIdRef.current = currentUniqueId;
      lastKnownIndexRef.current = filterState.currentReviewIndex;
      lastKnownListRef.current = uniqueFilteredQuestions;

      if (currentUniqueId) {
        localStorage.setItem(STORAGE_KEYS.PREF_LAST_ID, currentUniqueId);
        filterState.setLastUniqueId(currentUniqueId);
      }
      return;
    }

    // Preserve position when list updates
    const listRefChanged = uniqueFilteredQuestions !== lastKnownListRef.current;

    if (
      listRefChanged &&
      lastKnownUniqueIdRef.current &&
      lastKnownUniqueIdRef.current !== currentUniqueId
    ) {
      const preservedIndex = uniqueFilteredQuestions.findIndex(
        (q) => q.uniqueId === lastKnownUniqueIdRef.current
      );

      if (preservedIndex !== -1) {
        logger.log(
          `🔄 [Position Preservation] Restoring position to index ${preservedIndex}`
        );
        filterState.setCurrentReviewIndex(preservedIndex);
      } else {
        // Question no longer in list, stay at current index or reset
        logger.log(
          "🔄 [Position Preservation] Previous question not found, staying at current position"
        );
        lastKnownUniqueIdRef.current = currentUniqueId;
      }
    }

    lastKnownIndexRef.current = filterState.currentReviewIndex;
    lastKnownListRef.current = uniqueFilteredQuestions;
  }, [filterState.currentReviewIndex, uniqueFilteredQuestions, filterState]);

  // ========================================================================
  // RETURN
  // ========================================================================

  return {
    // State (from useFilterState)
    ...filterState,

    // Computed values (from useFilteredQuestions)
    contextFilteredQuestions,
    contextCounts,
    filteredQuestions,
    uniqueFilteredQuestions,
    uniqueReviewers,
  };
}
