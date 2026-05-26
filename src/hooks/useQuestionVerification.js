import { useCallback } from "react";
import { QUESTION_STATUS, TOAST_DURATION } from "../utils/constants";
import { useMessage } from "../contexts/MessageContext";
import {
  buildVerifyDocsData,
  buildVerifySearchData,
  buildRejectVerificationData,
  buildFlagUnverifiedData,
} from "../utils/questionItemHelpers";

/**
 * useQuestionVerification — handlers for the verify / reject / flag /
 * doc-link-update flow that QuestionItem fires from the
 * VerifyConfirmModal and SourceContextCard. Extracted from QuestionItem
 * so the parent can stop holding the four data-builder callbacks
 * inline.
 *
 * Returns five stable callbacks that the parent passes down to the
 * modal/cards. All callbacks no-op safely if onUpdateQuestion is
 * missing.
 */
export const useQuestionVerification = ({
  q,
  userEmail,
  onUpdateQuestion,
  onUpdateStatus,
}) => {
  const { showMessage } = useMessage();

  const handleVerifyViaDocs = useCallback(
    (clickInfo = {}) => {
      if (!onUpdateQuestion) return;
      onUpdateQuestion(q.id, buildVerifyDocsData(userEmail, clickInfo));
      showMessage("✅ Verified via Epic Docs!", TOAST_DURATION.MEDIUM);
    },
    [q.id, onUpdateQuestion, userEmail, showMessage]
  );

  const handleVerifyViaSearch = useCallback(
    (clickInfo = {}) => {
      if (!onUpdateQuestion) return;
      onUpdateQuestion(q.id, buildVerifySearchData(userEmail, clickInfo));
      showMessage("✅ Verified via Google Search!", TOAST_DURATION.MEDIUM);
    },
    [q.id, onUpdateQuestion, userEmail, showMessage]
  );

  const handleRejectVerification = useCallback(
    (reasonId, clickInfo = {}) => {
      if (!onUpdateQuestion) return;
      onUpdateQuestion(
        q.id,
        buildRejectVerificationData(userEmail, reasonId, clickInfo)
      );
      onUpdateStatus?.(q.id, QUESTION_STATUS.REJECTED, reasonId);
      showMessage(
        "❌ Question rejected - source not verified",
        TOAST_DURATION.LONG
      );
    },
    [q.id, onUpdateQuestion, onUpdateStatus, userEmail, showMessage]
  );

  // Flag as unverified but don't reject - question advances to Accept with warning
  const handleFlagUnverified = useCallback(
    (clickInfo = {}) => {
      if (!onUpdateQuestion) return;
      onUpdateQuestion(q.id, buildFlagUnverifiedData(userEmail, clickInfo));
      showMessage(
        "🚩 Flagged - source unverified, ready for Accept/Reject",
        TOAST_DURATION.LONG
      );
    },
    [q.id, onUpdateQuestion, userEmail, showMessage]
  );

  // Handle doc link updates from the DocLinkEditor component (Phase 1)
  const handleDocLinkUpdate = useCallback(
    (updates) => {
      if (!onUpdateQuestion) return;
      // Include the modifiedBy field automatically
      onUpdateQuestion(q.id, {
        ...updates,
        docLinkModifiedBy: userEmail,
      });
    },
    [q.id, onUpdateQuestion, userEmail]
  );

  return {
    handleVerifyViaDocs,
    handleVerifyViaSearch,
    handleRejectVerification,
    handleFlagUnverified,
    handleDocLinkUpdate,
  };
};
