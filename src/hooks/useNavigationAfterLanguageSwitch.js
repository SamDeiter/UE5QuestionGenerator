import { useEffect } from "react";

/**
 * Hook to handle navigation after a language switch.
 * Navigates to the correct question after language filter changes.
 *
 * @param {Object} params
 * @param {string|null} params.pendingNavigationUniqueId - The uniqueId to navigate to
 * @param {Array} params.uniqueFilteredQuestions - The filtered questions list
 * @param {Function} params.setCurrentReviewIndex - Setter for the current review index
 * @param {Function} params.setPendingNavigationUniqueId - Setter to clear the pending navigation
 */
export function useNavigationAfterLanguageSwitch({
  pendingNavigationUniqueId,
  uniqueFilteredQuestions,
  setCurrentReviewIndex,
  setPendingNavigationUniqueId,
}) {
  useEffect(() => {
    if (pendingNavigationUniqueId && uniqueFilteredQuestions.length > 0) {
      // Find the index of the question with this uniqueId
      const targetIndex = uniqueFilteredQuestions.findIndex(
        (q) => q.uniqueId === pendingNavigationUniqueId
      );

      console.log("🔄 [App] Navigating after language switch:", {
        pendingNavigationUniqueId,
        targetIndex,
        totalQuestions: uniqueFilteredQuestions.length,
      });

      if (targetIndex >= 0) {
        setCurrentReviewIndex(targetIndex);
      }

      // Clear the pending navigation
      setPendingNavigationUniqueId(null);
    }
  }, [
    pendingNavigationUniqueId,
    uniqueFilteredQuestions,
    setCurrentReviewIndex,
    setPendingNavigationUniqueId,
  ]);
}
