import { useShallow } from "zustand/react/shallow";
import { useFilterStore } from "../store/filterStore";

/**
 * useFilterState Hook
 *
 * Thin accessor over `filterStore` (zustand). State + hydration now live in the
 * store; this hook preserves the original return shape so existing callers
 * (useFiltering) keep working unchanged.
 *
 * @param {string} _appMode - retained for signature compatibility; the store
 *   resolves the initial review index from app mode at creation time.
 * @returns {Object} Filter state values and their setters
 */
export function useFilterState(_appMode) {
  return useFilterStore(
    useShallow((s) => ({
    // Search & Filter
    searchTerm: s.searchTerm,
    setSearchTerm: s.setSearchTerm,
    filterMode: s.filterMode,
    setFilterMode: s.setFilterMode,
    showHistory: s.showHistory,
    setShowHistory: s.setShowHistory,
    filterByCreator: s.filterByCreator,
    setFilterByCreator: s.setFilterByCreator,
    filterTags: s.filterTags,
    setFilterTags: s.setFilterTags,
    filterScoreTier: s.filterScoreTier,
    setFilterScoreTier: s.setFilterScoreTier,
    filterByReviewer: s.filterByReviewer,
    setFilterByReviewer: s.setFilterByReviewer,
    sortBy: s.sortBy,
    setSortBy: s.setSortBy,

    // Navigation
    currentReviewIndex: s.currentReviewIndex,
    setCurrentReviewIndex: s.setCurrentReviewIndex,
    lastUniqueId: s.lastUniqueId,
    setLastUniqueId: s.setLastUniqueId,
    }))
  );
}
