import { useState, useCallback } from "react";
import { filterDuplicateQuestions } from "../../utils/questionHelpers";
import {
  PROCESSING,
  QUESTION_SOURCES,
  QUESTION_STATUS,
} from "../../utils/constants";
import {
  saveQuestionToFirestore,
  deleteQuestionFromFirestore,
} from "../../services/firebase";
import { saveQuestionAsReviewer } from "../../services/firestoreSave";
import { logQuestion } from "../../utils/analyticsStore";
import { completeReviewTracking } from "../../utils/normalizeQuestion";
import { getAgents } from "../../agents";
import { logger } from "../../utils/logger";

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
  // Conflict resolution state
  const [conflictData, setConflictData] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);

  // Version tracking for concurrent editing
  const [questionVersions, setQuestionVersions] = useState(new Map());

  // CRUD Helpers
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

  const updateAllVariantsInState = useCallback(
    (uniqueId, updateFn) => {
      if (!uniqueId) return;
      setAllQuestions((prev) =>
        prev.map((q) => (q.uniqueId === uniqueId ? updateFn(q) : q))
      );
    },
    [setAllQuestions]
  );

  // Status handler
  const handleUpdateStatus = useCallback(
    async (id, newStatus, rejectionReason = null) => {
      // Linear search instead of map lookup
      const currentQ = allQuestions.find((q) => q.id === id);
      if (!currentQ) return;

      if (newStatus === QUESTION_STATUS.DELETED) {
        try {
          await deleteQuestionFromFirestore(currentQ.uniqueId || currentQ.id);
          setAllQuestions((prev) => prev.filter((q) => q.id !== id));
          logQuestion({
            ...currentQ,
            status: QUESTION_STATUS.DELETED,
            deletionReason: rejectionReason || "Status update to deleted",
            deletedAt: new Date().toISOString(),
          });
        } catch (err) {
          logger.error("Failed to delete:", err);
          if (showMessage)
            showMessage("Failed to delete question from cloud.", 3000);
        }
        return;
      }

      let updatedQ = { ...currentQ, status: newStatus };
      if (
        newStatus === QUESTION_STATUS.ACCEPTED ||
        newStatus === QUESTION_STATUS.REJECTED
      ) {
        // Require a reviewer name - use creatorName, or userEmail as fallback
        const reviewerName = config.creatorName || config.userEmail;
        if (!reviewerName) {
          if (showMessage) {
            showMessage(
              "⚠️ Please set your Creator Name in settings before reviewing questions.",
              5000
            );
          }
          return; // Don't proceed without a reviewer name
        }

        if (!updatedQ.reviewStartedAt) {
          const estimatedDurationMs =
            (PROCESSING.ESTIMATED_REVIEW_SECONDS || 30) * 1000;
          updatedQ.reviewStartedAt = new Date(
            Date.now() - estimatedDurationMs
          ).toISOString();
        }
        updatedQ = completeReviewTracking(updatedQ, reviewerName);
      }

      updatedQ = {
        ...updatedQ,
        critique:
          newStatus === QUESTION_STATUS.ACCEPTED ? null : updatedQ.critique,
        rejectionReason:
          newStatus === QUESTION_STATUS.REJECTED ? rejectionReason : null,
        rejectedAt:
          newStatus === QUESTION_STATUS.REJECTED
            ? new Date().toISOString()
            : null,
        acceptedAt:
          newStatus === QUESTION_STATUS.ACCEPTED
            ? new Date().toISOString()
            : updatedQ.acceptedAt,
      };

      // Use typed save function that filters to reviewer-allowed fields only
      const statusMetadata = {
        status: updatedQ.status,
        reviewStartedAt: updatedQ.reviewStartedAt,
        reviewDuration: updatedQ.reviewDuration,
        reviewerName: updatedQ.reviewerName,
        reviewCompletedAt: updatedQ.reviewCompletedAt,
        reviewedAt: updatedQ.reviewCompletedAt,
        reviewedBy: config.userEmail,
        acceptedAt: updatedQ.acceptedAt,
        acceptedBy:
          newStatus === QUESTION_STATUS.ACCEPTED ? config.userEmail : null,
        rejectedAt: updatedQ.rejectedAt,
        rejectedBy:
          newStatus === QUESTION_STATUS.REJECTED ? config.userEmail : null,
        rejectionReason: updatedQ.rejectionReason,
        critique: updatedQ.critique,
        critiqueScore: updatedQ.critiqueScore,
        humanVerified: updatedQ.humanVerified,
        humanVerifiedBy: updatedQ.humanVerifiedBy,
        humanVerifiedAt: updatedQ.humanVerifiedAt,
      };

      try {
        const result = await saveQuestionAsReviewer(
          updatedQ.uniqueId,
          statusMetadata
        );
        updateQuestionInState(id, updatedQ);
        if (result.queued && showMessage) {
          // Enhanced message with more detail
          const errorDetail = result.error
            ? ` (${result.error.substring(0, 50)})`
            : "";
          showMessage(
            `⚠️ Connection issue - queued for retry.${errorDetail}`,
            8000
          );
        } else if (
          showMessage &&
          (newStatus === QUESTION_STATUS.ACCEPTED ||
            newStatus === QUESTION_STATUS.REJECTED)
        ) {
          showMessage(`✓ Question ${newStatus} and saved to cloud`, 2000);
        }
      } catch (err) {
        const errorInfo = {
          action: `Update status to ${newStatus}`,
          message: err.message,
          code: err.code,
          questionId: id,
        };
        logger.error("Save failed:", errorInfo);

        if (err.message?.startsWith("QUESTION_DELETED:")) {
          setAllQuestions((prev) => prev.filter((q) => q.id !== id));
        } else if (showMessage) {
          showMessage(
            `⚠️ Failed to save: ${err.message}. Please try again or report this issue.`,
            8000
          );
        }
      }
    },
    [
      allQuestions,
      config.creatorName,
      setAllQuestions,
      updateQuestionInState,
      showMessage,
    ]
  );

  const handleUpdateQuestion = useCallback(
    async (id, updates) => {
      const currentQ = allQuestions.find((q) => q.id === id);
      if (!currentQ) return;

      const updatedQ = { ...currentQ, ...updates };
      const agents = getAgents();

      try {
        if (agents?.saveGuardAgent) {
          const baseVersion = questionVersions.get(id) || currentQ.version || 1;
          const result = await agents.saveGuardAgent.saveQuestion(
            currentQ.id,
            updates,
            baseVersion,
            config.userId,
            config.userEmail
          );

          if (!result.success) {
            if (result.errorType === "VERSION_CONFLICT") {
              setConflictData({
                serverQuestion: result.serverQuestion,
                serverVersion: result.serverVersion,
                localChanges: updates,
                expectedVersion: baseVersion,
              });
              setShowConflictModal(true);
              return;
            }
            throw new Error(result.error);
          }

          setQuestionVersions((prev) =>
            new Map(prev).set(id, result.newVersion)
          );
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
      questionVersions,
      config.userId,
      config.userEmail,
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
    [allQuestions, saveQuestionToFirestore, updateQuestionInState, showMessage]
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
    handleUpdateQuestion,
    replaceQuestions,
    bulkDeleteQuestions,
    moveQuestion,
    clearQuestions,
    conflictData,
    setConflictData,
    showConflictModal,
    setShowConflictModal,
    deleteConfirmId,
    setDeleteConfirmId,
    showClearModal,
    setShowClearModal,
    questionVersions,
    setQuestionVersions,
  };
};
