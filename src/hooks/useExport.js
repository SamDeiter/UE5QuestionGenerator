import { useExportFormatting } from "./export/useExportFormatting";
import { useSheetsBridge } from "./export/useSheetsBridge";
import { useFirestoreSync } from "./export/useFirestoreSync";

/**
 * useExport — facade composing three focused sub-hooks. Public API
 * unchanged so AuthenticatedApp and every other caller works without
 * modification.
 *
 *   - useExportFormatting: CSV/JSON/Markdown generation + file IO,
 *     including the bulk-export flow
 *   - useSheetsBridge: Google Sheets export (dual-write with Firestore)
 *     + load-from-sheets re-import
 *   - useFirestoreSync: the three-tier cache→incremental→full-sync
 *     loader used by autoload + the Refresh button
 */
export const useExport = (
  config,
  questions,
  historicalQuestions,
  uniqueFilteredQuestions,
  allQuestionsMap,
  showHistory,
  showMessage,
  setStatus,
  setIsProcessing,
  setAppMode,
  setShowExportMenu,
  // setShowBulkExportModal retained as positional param so existing
  // AuthenticatedApp call sites don't need to change; the modal toggle
  // now lives in ModalContext.
  _setShowBulkExportModal,
  replaceQuestions
) => {
  const { handleExportByGroup, handleExportCurrentTarget, handleBulkExport } =
    useExportFormatting({
      config,
      questions,
      historicalQuestions,
      uniqueFilteredQuestions,
      allQuestionsMap,
      showHistory,
      showMessage,
      setStatus,
      setIsProcessing,
      setShowExportMenu,
    });

  const { handleExportToSheets, handleLoadFromSheets } = useSheetsBridge({
    config,
    questions,
    historicalQuestions,
    showHistory,
    showMessage,
    setStatus,
    setIsProcessing,
    setAppMode,
    setShowExportMenu,
    replaceQuestions,
  });

  const { handleLoadFromFirestore } = useFirestoreSync({
    showMessage,
    setStatus,
    setIsProcessing,
    setShowExportMenu,
    replaceQuestions,
  });

  return {
    handleExportByGroup,
    handleExportCurrentTarget,
    handleExportToSheets,
    handleLoadFromSheets,
    handleLoadFromFirestore,
    handleBulkExport,
  };
};
