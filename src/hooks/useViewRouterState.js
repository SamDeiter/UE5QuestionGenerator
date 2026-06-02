import { useMemo } from "react";

/**
 * Hook to memoize view router state for MainLayout.
 *
 * Only carries the non-store values ViewRouter still needs: the filtered list,
 * live status, and auth/loading info. appMode, config, all filter/search/sort
 * state, the translation map, and the session question list are now read
 * directly from the stores inside ViewRouter.
 *
 * @param {Object} params - Remaining view router state values
 * @returns {Object} - Memoized view router state object
 */
export function useViewRouterState({
  filteredQuestions,
  status,
  user,
  userRole,
  isInitialLoading,
}) {
  return useMemo(
    () => ({
      filteredQuestions,
      status,
      currentUser: user,
      userRole,
      isInitialLoading,
    }),
    [filteredQuestions, status, user, userRole, isInitialLoading]
  );
}
