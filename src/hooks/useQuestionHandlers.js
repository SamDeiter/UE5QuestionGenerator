import { useCallback, useRef, useState } from "react";
import {
  TOAST_DURATION,
  QUESTION_STATUS,
  QUALITY_THRESHOLDS,
  APP_MODES,
} from "../utils/constants";
import { useEditLock } from "./useEditLock";

/**
 * Custom hook that encapsulates QuestionItem's verification and action handlers.
 * Extracted from QuestionItem.jsx to reduce component complexity.
 *
 * @param {Object} params - Hook parameters
 * @param {Object} params.question - The question object
 * @param {string} params.appMode - Current app mode
 * @param {string} params.userId - Current user's ID
 * @param {string} params.userEmail - Current user's email
 * @param {Function} params.onUpdateQuestion - Handler to update question
 * @param {Function} params.onUpdateStatus - Handler to update question status
 * @param {Function} params.showMessage - Handler to show toast messages
 * @param {boolean} params.isProcessing - Whether processing is in progress
 * @returns {Object} Handlers and lock state
 */
export const useQuestionHandlers = ({
  question,
  appMode,
  userId,
  userEmail,
  onUpdateQuestion,
  onUpdateStatus,
  showMessage,
  isProcessing,
}) => {
  const q = question;

  // Lock expired handler
  const handleLockExpired = useCallback(() => {
    if (showMessage) {
      showMessage("⚠️ Edit lock expired - refreshing...", TOAST_DURATION.LONG);
    }
  }, [showMessage]);

  // Edit lock management
  const { lockedBy, isLocked, hasLock } = useEditLock(
    q.id,
    userId,
    userEmail,
    appMode === APP_MODES.REVIEW,
    handleLockExpired,
    isProcessing
  );

  // Modal state
  const [showImprovementModal, setShowImprovementModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const lastProcessedCritiqueRef = useRef(null);

  // Modal dismiss handler
  const handleModalDismiss = useCallback(() => {
    lastProcessedCritiqueRef.current = `dismissed-${q.id}-${Date.now()}`;
    setShowImprovementModal(false);
  }, [q.id]);

  // Verification via docs handler
  const handleVerifyViaDocs = useCallback(
    (clickInfo = {}) => {
      if (!onUpdateQuestion) return;
      onUpdateQuestion(q.id, {
        humanVerified: true,
        humanVerifiedBy: userEmail || "Unknown",
        humanVerifiedAt: new Date().toISOString(),
        verificationSource: "epic_docs",
        verificationClickedDocs: clickInfo.clickedDocs || false,
        verificationClickedSearch: clickInfo.clickedSearch || false,
      });
      if (showMessage) {
        showMessage("✅ Verified via Epic Docs!", TOAST_DURATION.MEDIUM);
      }
    },
    [q.id, onUpdateQuestion, userEmail, showMessage]
  );

  // Verification via search handler
  const handleVerifyViaSearch = useCallback(
    (clickInfo = {}) => {
      if (!onUpdateQuestion) return;
      onUpdateQuestion(q.id, {
        humanVerified: true,
        humanVerifiedBy: userEmail || "Unknown",
        humanVerifiedAt: new Date().toISOString(),
        verificationSource: "google_search",
        verificationClickedDocs: clickInfo.clickedDocs || false,
        verificationClickedSearch: clickInfo.clickedSearch || false,
      });
      if (showMessage) {
        showMessage("✅ Verified via Google Search!", TOAST_DURATION.MEDIUM);
      }
    },
    [q.id, onUpdateQuestion, userEmail, showMessage]
  );

  // Reject verification handler
  const handleRejectVerification = useCallback(
    (reasonId, clickInfo = {}) => {
      if (!onUpdateQuestion) return;
      onUpdateQuestion(q.id, {
        humanVerified: false,
        verificationRejected: true,
        verificationRejectedBy: userEmail || "Unknown",
        verificationRejectedAt: new Date().toISOString(),
        verificationRejectReason: reasonId,
        verificationClickedDocs: clickInfo.clickedDocs || false,
        verificationClickedSearch: clickInfo.clickedSearch || false,
      });
      if (onUpdateStatus) {
        onUpdateStatus(q.id, QUESTION_STATUS.REJECTED, reasonId);
      }
      if (showMessage) {
        showMessage(
          "❌ Question rejected - source not verified",
          TOAST_DURATION.LONG
        );
      }
    },
    [q.id, onUpdateQuestion, onUpdateStatus, userEmail, showMessage]
  );

  // Flag as unverified handler
  const handleFlagUnverified = useCallback(
    (clickInfo = {}) => {
      if (!onUpdateQuestion) return;
      onUpdateQuestion(q.id, {
        humanVerified: true,
        humanVerifiedBy: userEmail || "Unknown",
        humanVerifiedAt: new Date().toISOString(),
        verificationSource: "flagged_unverified",
        sourceUnverified: true,
        sourceUnverifiedBy: userEmail || "Unknown",
        sourceUnverifiedAt: new Date().toISOString(),
        sourceUnverifiedReason: "not_found_anywhere",
        verificationClickedDocs: clickInfo.clickedDocs || false,
        verificationClickedSearch: clickInfo.clickedSearch || false,
      });
      if (showMessage) {
        showMessage(
          "🚩 Flagged - source unverified, ready for Accept/Reject",
          TOAST_DURATION.LONG
        );
      }
    },
    [q.id, onUpdateQuestion, userEmail, showMessage]
  );

  // Accept handler with pipeline enforcement
  const handleAccept = useCallback(() => {
    // PIPELINE ENFORCEMENT: Critique is required before accept
    if (q.critiqueScore === null || q.critiqueScore === undefined) {
      if (showMessage) {
        showMessage("⚠️ Run AI Critique first", TOAST_DURATION.LONG);
      }
      return;
    }
    if (!q.humanVerified) {
      if (showMessage) {
        showMessage("⚠️ Please verify first", TOAST_DURATION.LONG);
      }
      return;
    }

    // LOW-SCORE WARNING: Confirm before accepting low-quality questions
    const passThreshold = QUALITY_THRESHOLDS?.PASS;
    if (q.critiqueScore < passThreshold) {
      const confirmed = window.confirm(
        `⚠️ This question scored ${q.critiqueScore}/100 (below ${passThreshold}).\n\nAre you sure you want to accept it anyway?`
      );
      if (!confirmed) return;
    }

    onUpdateStatus(q.id, QUESTION_STATUS.ACCEPTED);
  }, [q.critiqueScore, q.humanVerified, q.id, onUpdateStatus, showMessage]);

  // Open docs handler
  const handleOpenDocs = useCallback(() => {
    setShowVerifyModal(true);
  }, []);

  // Open search handler
  const handleOpenSearch = useCallback(() => {
    setShowVerifyModal(true);
  }, []);

  return {
    // Lock state
    lockedBy,
    isLocked,
    hasLock,

    // Modal state
    showImprovementModal,
    setShowImprovementModal,
    showVerifyModal,
    setShowVerifyModal,
    showVersionModal,
    setShowVersionModal,
    lastProcessedCritiqueRef,

    // Handlers
    handleModalDismiss,
    handleVerifyViaDocs,
    handleVerifyViaSearch,
    handleRejectVerification,
    handleFlagUnverified,
    handleAccept,
    handleOpenDocs,
    handleOpenSearch,
  };
};
