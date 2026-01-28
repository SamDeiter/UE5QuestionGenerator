import { useMemo } from "react";

/**
 * Hook to memoize view router handlers for MainLayout
 *
 * Provides a stable reference to the handler functions used by
 * the view router to prevent unnecessary re-renders.
 *
 * @param {Object} handlers - Individual handler functions
 * @returns {Object} - Memoized handlers object
 */
export function useViewRouterHandlers({
  handleLoadFromSheets,
  handleLoadFromFirestore,
  handleUpdateDatabaseQuestion,
  handleKickBackToReview,
  handleUpdateStatus,
  handleExplain,
  handleVariate,
  handleCritique,
  handleApplyRewrite,
  handleTranslateSingle,
  handleLanguageSwitch,
  handleDelete,
  handleManualUpdate,
  handleTrimExcess,
  handleUpdateQuestion,
  userRole,
}) {
  return useMemo(
    () => ({
      handleLoadFromSheets,
      handleLoadFromFirestore,
      handleUpdateDatabaseQuestion,
      handleKickBackToReview,
      handleUpdateStatus,
      handleExplain,
      handleVariate,
      handleCritique,
      handleApplyRewrite,
      handleTranslateSingle,
      handleLanguageSwitch,
      handleDelete,
      handleManualUpdate,
      handleTrimExcess,
      handleUpdateQuestion,
      userRole,
    }),
    [
      handleLoadFromSheets,
      handleLoadFromFirestore,
      handleUpdateDatabaseQuestion,
      handleKickBackToReview,
      handleUpdateStatus,
      handleExplain,
      handleVariate,
      handleCritique,
      handleApplyRewrite,
      handleTranslateSingle,
      handleLanguageSwitch,
      handleDelete,
      handleManualUpdate,
      handleTrimExcess,
      handleUpdateQuestion,
      userRole,
    ]
  );
}
