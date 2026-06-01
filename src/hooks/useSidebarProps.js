import { useMemo } from "react";

/**
 * Hook to memoize sidebar props for MainLayout.
 *
 * Now carries only handlers + stats-derived values + flags the sidebar actually
 * consumes. State (`config`) and pure-derived data (`allQuestionsMap`) are read
 * directly from the store inside the sidebar components, so they are no longer
 * threaded here. Several previously-bundled props (approvedCounts,
 * overallPercentage, totalApproved, batchSizeWarning, handleSelectCategory,
 * setShowSettings) were dead pass-throughs and have been dropped.
 *
 * @param {Object} params - Sidebar handlers/stats/flags
 * @returns {Object} - Memoized sidebar props object
 */
export function useSidebarProps({
  showGenSettings,
  setShowGenSettings,
  handleChange,
  isTargetMet,
  maxBatchSize,
  handleGenerate,
  isGenerating,
  isApiReady,
  handleBulkTranslateMissing,
  isProcessing,
  customTags,
  status,
  isAdmin,
}) {
  return useMemo(
    () => ({
      showGenSettings,
      setShowGenSettings,
      handleChange,
      isTargetMet,
      maxBatchSize,
      handleGenerate,
      isGenerating,
      isApiReady,
      handleBulkTranslateMissing,
      isProcessing,
      customTags,
      status,
      isAdmin,
    }),
    [
      showGenSettings,
      setShowGenSettings,
      handleChange,
      isTargetMet,
      maxBatchSize,
      handleGenerate,
      isGenerating,
      isApiReady,
      handleBulkTranslateMissing,
      isProcessing,
      customTags,
      status,
      isAdmin,
    ]
  );
}
