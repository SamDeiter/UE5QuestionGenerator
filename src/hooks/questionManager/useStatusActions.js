import { useState, useCallback } from "react";
import {
  GENERATION_LIMITS,
  PROCESSING,
  QUESTION_STATUS,
  TIME,
  TOAST_DURATION,
} from "../../utils/constants";
import { deleteQuestionFromFirestore } from "../../services/firebase";
import { saveQuestionAsReviewer } from "../../services/firestoreSave";
import { logQuestion } from "../../utils/analyticsStore";
import { completeReviewTracking } from "../../utils/normalizeQuestion";
import { logger } from "../../utils/logger";
import { logAuditEvent, AUDIT_ACTIONS } from "../../services/auditService";
import { calculateReviewerAverageScore } from "../../utils/reviewerAnalytics";

const AUTO_SCORE_THRESHOLD = 10;

/**
 * Hook for managing status-related actions on questions.
 * Handles accept, reject, and delete operations.
 *
 * @param {Object} params - Hook parameters
 * @param {Array} params.allQuestions - Current questions array
 * @param {Function} params.setAllQuestions - State setter for questions
 * @param {Function} params.updateQuestionInState - Updates a single question in state
 * @param {Function} params.showMessage - Toast notification function
 * @param {Object} params.config - App configuration (creatorName, userEmail, etc.)
 */
export const useStatusActions = ({
  allQuestions,
  setAllQuestions,
  updateQuestionInState,
  showMessage,
  config,
}) => {
  // QA FIX: Double-submit protection - track questions currently being processed
  const [processing, setProcessing] = useState(new Set());
  /**
   * Handles status updates for questions (accept, reject, delete).
   * Uses saveQuestionAsReviewer to ensure only allowed fields are sent.
   */
  const handleUpdateStatus = useCallback(
    async (id, newStatus, rejectionReason = null) => {
      // QA FIX: Prevent double-submit from rapid clicks
      if (processing.has(id)) {
        if (showMessage) {
          showMessage("⏳ Processing...", TOAST_DURATION.SHORT);
        }
        return;
      }

      const currentQ = allQuestions.find((q) => q.id === id);
      if (!currentQ) return;

      // Mark as processing
      setProcessing((prev) => new Set(prev).add(id));

      // Handle deletion separately
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
          if (showMessage) {
            showMessage(
              "Failed to delete question from cloud.",
              TOAST_DURATION.MEDIUM
            );
          }
        } finally {
          // QA FIX: Always remove from processing set
          setProcessing((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
        return;
      }

      let updatedQ = { ...currentQ, status: newStatus };

      // Handle accept/reject - requires reviewer tracking
      if (
        newStatus === QUESTION_STATUS.ACCEPTED ||
        newStatus === QUESTION_STATUS.REJECTED
      ) {
        const reviewerName = config.creatorName || config.userEmail;
        if (!reviewerName) {
          if (showMessage) {
            showMessage(
              "⚠️ Please set your Creator Name in settings before reviewing questions.",
              TOAST_DURATION.EXTENDED
            );
          }
          return;
        }

        if (!updatedQ.reviewStartedAt) {
          const fallbackSeconds = PROCESSING.ESTIMATED_REVIEW_SECONDS;
          const estimatedDurationMs = fallbackSeconds * TIME.SECOND;
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

      // AUTO-SCORING: If rejected and no score exists, apply reviewer average if threshold met
      if (
        newStatus === QUESTION_STATUS.REJECTED &&
        (updatedQ.critiqueScore === null ||
          updatedQ.critiqueScore === undefined)
      ) {
        const reviewerName = config.creatorName || config.userEmail;
        const { averageScore, totalScored } = calculateReviewerAverageScore(
          reviewerName,
          allQuestions
        );

        if (totalScored >= AUTO_SCORE_THRESHOLD && averageScore !== null) {
          logger.log(
            `[AutoScore] Applying average score ${averageScore} for reviewer ${reviewerName} (based on ${totalScored} reviews)`
          );
          updatedQ.critiqueScore = averageScore;
          // Optionally notify user
          if (showMessage) {
            showMessage(
              `📊 Applied your average score of ${averageScore}`,
              TOAST_DURATION.SHORT
            );
          }
        }
      }

      // Build payload with only reviewer-allowed fields
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

      // Log REVIEW_ATTEMPT before save (captures attempts even if save fails)
      logAuditEvent(updatedQ.uniqueId || id, AUDIT_ACTIONS.REVIEW_ATTEMPT, {
        attemptedStatus: newStatus,
        reviewerEmail: config.userEmail,
        reviewerName: config.creatorName,
      });

      try {
        const result = await saveQuestionAsReviewer(
          updatedQ.uniqueId,
          statusMetadata
        );
        updateQuestionInState(id, updatedQ);

        if (result.queued && showMessage) {
          const truncateLen = GENERATION_LIMITS.ERROR_TRUNCATE_LENGTH;
          const errorDetail = result.error
            ? ` (${result.error.substring(0, truncateLen)})`
            : "";
          showMessage(
            `⚠️ Connection issue - queued for retry.${errorDetail}`,
            TOAST_DURATION.EXTENDED
          );
        } else if (
          showMessage &&
          (newStatus === QUESTION_STATUS.ACCEPTED ||
            newStatus === QUESTION_STATUS.REJECTED)
        ) {
          // Log success to audit trail
          logAuditEvent(updatedQ.uniqueId || id, AUDIT_ACTIONS.REVIEW_SUCCESS, {
            oldValue: currentQ.status,
            newValue: newStatus,
            rejectionReason: rejectionReason || null,
          });

          showMessage(
            `✓ Question ${newStatus} and saved to cloud`,
            TOAST_DURATION.MEDIUM
          );
        }
      } catch (err) {
        const errorInfo = {
          action: `Update status to ${newStatus}`,
          message: err.message,
          code: err.code,
          questionId: id,
        };
        logger.error("Save failed:", errorInfo);

        // Log failure to audit trail
        logAuditEvent(updatedQ.uniqueId || id, AUDIT_ACTIONS.REVIEW_FAILED, {
          attemptedStatus: newStatus,
          errorCode: err.code,
          errorMessage: err.message,
        });

        if (err.message?.startsWith("QUESTION_DELETED:")) {
          setAllQuestions((prev) => prev.filter((q) => q.id !== id));
        } else if (
          err.code === "permission-denied" ||
          err.message?.includes("PERMISSION_DENIED")
        ) {
          // QA FIX: Specific error for permission issues (Ghost Reviewer detection)
          if (showMessage) {
            showMessage(
              "🚫 Permission issue - please refresh or re-sign in. Contact admin if issue persists.",
              TOAST_DURATION.EXTENDED
            );
          }
        } else if (err.code === "unavailable") {
          // QA FIX: Network unavailable - suggest retry
          if (showMessage) {
            showMessage(
              "⚠️ Network unavailable - check connection and retry",
              TOAST_DURATION.EXTENDED
            );
          }
        } else if (err.code === "unauthenticated") {
          // QA FIX: Token expired - prompt re-login
          if (showMessage) {
            showMessage(
              "🔐 Session expired - please sign in again",
              TOAST_DURATION.EXTENDED
            );
          }
        } else if (showMessage) {
          showMessage(
            `⚠️ Failed to save: ${err.message}. Please try again or report this issue.`,
            TOAST_DURATION.EXTENDED
          );
        }
      } finally {
        // QA FIX: Always remove from processing set, even on error
        setProcessing((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [
      allQuestions,
      config.creatorName,
      config.userEmail,
      setAllQuestions,
      updateQuestionInState,
      showMessage,
      processing, // QA FIX: Added to fix React Hook dependency warning
    ]
  );

  /**
   * Convenience method to accept a question.
   */
  const handleAccept = useCallback(
    async (id) => {
      await handleUpdateStatus(id, QUESTION_STATUS.ACCEPTED);
    },
    [handleUpdateStatus]
  );

  /**
   * Convenience method to reject a question with a reason.
   */
  const handleReject = useCallback(
    async (id, reason) => {
      await handleUpdateStatus(id, QUESTION_STATUS.REJECTED, reason);
    },
    [handleUpdateStatus]
  );

  return {
    handleUpdateStatus,
    handleAccept,
    handleReject,
  };
};
