import { useQuestionState } from "./questionManager/useQuestionState";
import { useQuestionDerivedData } from "./questionManager/useQuestionDerivedData";
import { useQuestionSync } from "./questionManager/useQuestionSync";
import { useQuestionActions } from "./questionManager/useQuestionActions";

/**
 * Main orchestrator hook for question management.
 * Refactored to use modular sub-hooks for better maintainability.
 */
export const useQuestionManager = (config, showMessage) => {
  // 1. Core State & Persistence
  const [allQuestions, setAllQuestions] = useQuestionState(config);

  // 2. Derived Views & Memoized Data (depends on allQuestions)
  const derived = useQuestionDerivedData(allQuestions, config);

  // 3. External Synchronization & Backups
  const { backupToCloud } = useQuestionSync(allQuestions, setAllQuestions);

  // 4. User Actions & Interactive Logic
  const actions = useQuestionActions(
    allQuestions,
    setAllQuestions,
    backupToCloud,
    showMessage,
    config
  );

  // Combined return object matching the previous monolithic API
  return {
    ...derived,
    ...actions,

    // Legacy aliases
    addQuestionsToState: actions.addQuestions,
    updateQuestionInState: actions.updateQuestionInState,

    // Explicitly expose confirmDelete if components rely on it
    handleDelete: (id) => actions.setDeleteConfirmId(id),
    confirmDelete: (reason) =>
      actions.handleUpdateStatus(actions.deleteConfirmId, "deleted", reason),
    handleDeleteAllQuestions: actions.clearQuestions,
    replaceQuestions: actions.replaceQuestions,
    bulkDeleteQuestions: actions.bulkDeleteQuestions,

    // Passthrough for historical naming
    checkAndStoreQuestions: async (q) => q, // No-op legacy bridge
  };
};
