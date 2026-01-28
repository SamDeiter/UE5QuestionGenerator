import { useMemo } from "react";

/**
 * Hook to memoize view router state for MainLayout
 *
 * Centralizes all state needed by the ViewRouter component
 * to improve code organization and prevent unnecessary re-renders.
 *
 * @param {Object} params - All view router state values
 * @returns {Object} - Memoized view router state object
 */
export function useViewRouterState({
  currentReviewIndex,
  translationMap,
  filterByCreator,
  filteredQuestions,
  questions,
  status,
  filterMode,
  sortBy,
  searchTerm,
  showHistory,
  user,
  userRole,
}) {
  return useMemo(
    () => ({
      currentReviewIndex,
      translationMap,
      filterByCreator,
      filteredQuestions,
      questions,
      status,
      filterMode,
      sortBy,
      searchTerm,
      showHistory,
      currentUser: user,
      userRole,
    }),
    [
      currentReviewIndex,
      translationMap,
      filterByCreator,
      filteredQuestions,
      questions,
      status,
      filterMode,
      sortBy,
      searchTerm,
      showHistory,
      user,
      userRole,
    ]
  );
}
