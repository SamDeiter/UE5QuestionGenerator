import { useMemo } from "react";

/**
 * Hook to memoize sidebar props for MainLayout
 *
 * Centralizes all props needed by the GenerationSidebar component
 * to improve code organization and prevent unnecessary re-renders.
 *
 * @param {Object} params - All sidebar-related state and handlers
 * @returns {Object} - Memoized sidebar props object
 */
export function useSidebarProps({
  showGenSettings,
  setShowGenSettings,
  config,
  handleChange,
  allQuestionsMap,
  approvedCounts,
  overallPercentage,
  totalApproved,
  isTargetMet,
  maxBatchSize,
  batchSizeWarning,
  handleGenerate,
  isGenerating,
  isApiReady,
  handleBulkTranslateMissing,
  isProcessing,
  setShowSettings,
  handleSelectCategory,
  customTags,
  status,
  isAdmin,
}) {
  return useMemo(
    () => ({
      showGenSettings,
      setShowGenSettings,
      config,
      handleChange,
      allQuestionsMap,
      approvedCounts,
      overallPercentage,
      totalApproved,
      isTargetMet,
      maxBatchSize,
      batchSizeWarning,
      handleGenerate,
      isGenerating,
      isApiReady,
      handleBulkTranslateMissing,
      isProcessing,
      setShowSettings,
      handleSelectCategory,
      customTags,
      status,
      isAdmin,
    }),
    [
      showGenSettings,
      setShowGenSettings,
      config,
      handleChange,
      allQuestionsMap,
      approvedCounts,
      overallPercentage,
      totalApproved,
      isTargetMet,
      maxBatchSize,
      batchSizeWarning,
      handleGenerate,
      isGenerating,
      isApiReady,
      handleBulkTranslateMissing,
      isProcessing,
      setShowSettings,
      handleSelectCategory,
      customTags,
      status,
      isAdmin,
    ]
  );
}
