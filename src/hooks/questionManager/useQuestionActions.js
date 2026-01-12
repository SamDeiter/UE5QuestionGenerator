import { useState, useCallback } from "react";
import { filterDuplicateQuestions } from "../../utils/questionHelpers";
import { QUESTION_SOURCES } from "../../utils/constants";
import { saveQuestionToFirestore } from "../../services/firebase";
import { getAgents } from "../../agents";
import { logger } from "../../utils/logger";
import { useStatusActions } from "./useStatusActions";
import { useConflictResolution } from "./useConflictResolution";

/**
 * Hook for managing interactive actions on questions.
 */
export const useQuestionActions = (
  allQuestions,
  setAllQuestions,
  backupToCloud,
  showMessage,
  config
) => {
  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);

  // CRUD Helpers
  const updateQuestionInState = useCallback(
    (id, updates) => {
      setAllQuestions((prev) => {
        const idx = prev.findIndex((q) => q.id === id);
        if (idx === -1) return prev;
        const updated =
          typeof updates === "function" ? updates(prev[idx]) : updates;
        const newList = [...prev];
        newList[idx] = { ...updated, _source: prev[idx]._source };
        return newList;
      });
    },
    [setAllQuestions]
  );

  // Delegate conflict resolution to specialized hook
  const {
    conflictData,
    setConflictData,
    showConflictModal,
    setShowConflictModal,
    questionVersions,
    setQuestionVersions,
    getVersion,
    updateVersion,
    handleVersionConflict,
    handleConflictResolve,
  } = useConflictResolution({
    updateQuestionInState,
    setAllQuestions,
    showMessage,
    config,
  });

  const addQuestions = useCallback(
    async (newItems, source = QUESTION_SOURCES.SESSION) => {
      // Determine target source - handle legacy boolean values
      let targetSource;
      if (source === true) {
        targetSource = QUESTION_SOURCES.IMPORT;
      } else if (source === false) {
        targetSource = QUESTION_SOURCES.SESSION;
      } else {
        targetSource = source;
      }
      await backupToCloud(newItems, targetSource);
      setAllQuestions((prev) => {
        const tagged = newItems.map((q) => ({ ...q, _source: targetSource }));
        const current = prev.filter((q) => q._source === targetSource);
        const unique = filterDuplicateQuestions(tagged, current, []);
        return [...prev, ...unique];
      });
    },
    [backupToCloud, setAllQuestions]
  );

  const updateAllVariantsInState = useCallback(
    (uniqueId, updateFn) => {
      if (!uniqueId) return;
      setAllQuestions((prev) =>
        prev.map((q) => (q.uniqueId === uniqueId ? updateFn(q) : q))
      );
    },
    [setAllQuestions]
  );

  // Delegate status actions to specialized hook
  const { handleUpdateStatus, handleAccept, handleReject } = useStatusActions({
    allQuestions,
    setAllQuestions,
    updateQuestionInState,
    showMessage,
    config,
  });

  const handleUpdateQuestion = useCallback(
    async (id, updates) => {
      const currentQ = allQuestions.find((q) => q.id === id);
      if (!currentQ) return;

      const updatedQ = { ...currentQ, ...updates };
      const agents = getAgents();

      try {
        if (agents?.saveGuardAgent) {
          const baseVersion = getVersion(id, currentQ.version || 1);
          const result = await agents.saveGuardAgent.saveQuestion(
            currentQ.id,
            updates,
            baseVersion,
            config.userId,
            config.userEmail
          );

          if (!result.success) {
            if (result.errorType === "VERSION_CONFLICT") {
              handleVersionConflict(result, updates, baseVersion);
              return;
            }
            throw new Error(result.error);
          }

          updateVersion(id, result.newVersion);
          updateQuestionInState(id, {
            ...updatedQ,
            version: result.newVersion,
          });
        } else {
          await saveQuestionToFirestore(updatedQ);
          updateQuestionInState(id, updatedQ);
        }
      } catch (err) {
        if (err.message?.startsWith("QUESTION_DELETED:")) {
          setAllQuestions((prev) => prev.filter((q) => q.id !== id));
        } else if (showMessage) {
          showMessage(`⚠️ Failed to save: ${err.message}`, 4000);
        }
      }
    },
    [
      allQuestions,
      config.userId,
      config.userEmail,
      getVersion,
      updateVersion,
      handleVersionConflict,
      setAllQuestions,
      updateQuestionInState,
      showMessage,
    ]
  );

  const replaceQuestions = useCallback(
    (newItems, source) => {
      setAllQuestions((prev) => {
        const others = prev.filter((q) => q._source !== source);
        const tagged = newItems.map((q) => ({ ...q, _source: source }));
        return [...others, ...tagged];
      });
    },
    [setAllQuestions]
  );

  const bulkDeleteQuestions = useCallback(
    (idsToDelete) => {
      const idSet = new Set(idsToDelete);
      setAllQuestions((prev) => prev.filter((q) => !idSet.has(q.id)));
    },
    [setAllQuestions]
  );

  const moveQuestion = useCallback(
    async (id, targetSource, updates = {}) => {
      const currentQ = allQuestions.find((q) => q.id === id);
      if (!currentQ) return;

      const updatedQ = {
        ...currentQ,
        ...updates,
        _source: targetSource,
        modifiedAt: new Date().toISOString(),
      };

      try {
        await saveQuestionToFirestore(updatedQ);

        // Update local state
        updateQuestionInState(id, updatedQ);

        if (showMessage) {
          showMessage("Question moved successfully.", 2000);
        }
      } catch (err) {
        logger.error("Failed to move question:", err);
        if (showMessage) {
          showMessage(`Failed to move question: ${err.message}`, 3000);
        }
      }
    },
    [allQuestions, updateQuestionInState, showMessage]
  );

  const clearQuestions = useCallback(() => {
    setAllQuestions((prev) =>
      prev.filter((q) => q._source !== QUESTION_SOURCES.SESSION)
    );
    setShowClearModal(false);
    if (showMessage) showMessage("Session questions cleared", "success");
  }, [setAllQuestions, showMessage]);

  return {
    addQuestions,
    updateQuestionInState,
    updateAllVariantsInState,
    handleUpdateStatus,
    handleAccept,
    handleReject,
    handleUpdateQuestion,
    replaceQuestions,
    bulkDeleteQuestions,
    moveQuestion,
    clearQuestions,
    // Conflict resolution (delegated to useConflictResolution)
    conflictData,
    setConflictData,
    showConflictModal,
    setShowConflictModal,
    handleConflictResolve,
    // Delete confirmation state
    deleteConfirmId,
    setDeleteConfirmId,
    showClearModal,
    setShowClearModal,
    // Version tracking (delegated to useConflictResolution)
    questionVersions,
    setQuestionVersions,
  };
};
