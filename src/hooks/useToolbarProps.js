import { useMemo } from "react";
import { APP_MODES } from "../utils/constants";

/**
 * Hook to memoize toolbar props for MainLayout.
 *
 * appMode, config, and all filter/search/sort state are now read directly from
 * the stores inside ContextToolbar, so they are no longer threaded here. This
 * hook carries the derived counts, the reviewer list, flags, and the data /
 * bulk-action handlers. `appMode` is still accepted to gate the review-only
 * bulk handlers.
 *
 * @param {Object} params - Toolbar counts, flags, and handlers
 * @returns {Object} - Memoized toolbar props object
 */
export function useToolbarProps({
  appMode,
  contextCounts,
  uniqueReviewers,
  customTags,
  isProcessing,
  status,
  isAuthReady,
  handleLoadFromSheets,
  handleLoadFromFirestore,
  setShowBulkExportModal,
  handleClearPending,
  handleBulkAcceptHighScores,
  handleBulkCritiqueAll,
  handleTrimExcess,
  handleAutoTagAll,
  effectiveApiKey,
  handleChange,
}) {
  return useMemo(
    () => ({
      counts: contextCounts,
      uniqueReviewers,
      customTags,
      isProcessing,
      status,
      isAuthReady,
      onLoadSheets: handleLoadFromSheets,
      onLoadFirestore: handleLoadFromFirestore,
      onBulkExport: () => setShowBulkExportModal(true),
      onClearPending: handleClearPending,
      onBulkAcceptHighScores:
        appMode === APP_MODES.REVIEW ? handleBulkAcceptHighScores : undefined,
      onBulkCritiqueAll:
        appMode === APP_MODES.REVIEW ? handleBulkCritiqueAll : undefined,
      onTrimExcess: handleTrimExcess,
      onAutoTagAll: handleAutoTagAll,
      effectiveApiKey,
      handleChange,
    }),
    [
      appMode,
      contextCounts,
      uniqueReviewers,
      customTags,
      isProcessing,
      status,
      isAuthReady,
      handleLoadFromSheets,
      handleLoadFromFirestore,
      setShowBulkExportModal,
      handleClearPending,
      handleBulkAcceptHighScores,
      handleBulkCritiqueAll,
      handleTrimExcess,
      handleAutoTagAll,
      effectiveApiKey,
      handleChange,
    ]
  );
}
