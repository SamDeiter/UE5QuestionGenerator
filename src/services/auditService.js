/**
 * Audit Log Service
 *
 * Logs all critical operations to Firestore for traceability and rollback capability.
 * Creates entries in the 'audit-log' collection.
 */

import { getDb } from "./firebase";
import { getAuth } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { logger } from "../utils/logger";

export const logAuditEvent = async (questionId, eventType, details = {}) => {
  try {
    const db = getDb();
    const auth = getAuth();
    const user = auth.currentUser;

    const auditEntry = {
      questionId,
      eventType,
      timestamp: serverTimestamp(),
      userId: user?.uid || "system",
      userEmail: user?.email || "system@automated",
      details: {
        ...details,
        oldValue: details.oldValue || null,
        newValue: details.newValue || null,
      },
      sessionId: localStorage.getItem("ue5_session_agent_id") || "unknown",
      userAgent: navigator.userAgent.substring(0, 200),
    };

    await addDoc(collection(db, "audit-log"), auditEntry);
    logger.log(
      `📋 Audit: ${eventType} on ${questionId?.substring(0, 8) || "bulk"}`
    );
  } catch (error) {
    // Don't throw - audit logging should not break the main operation
    logger.error("Failed to log audit event:", error);
  }
};

/**
 * Log a bulk operation (affects multiple questions)
 * @param {string} action - The bulk action type
 * @param {Array<string>} questionIds - Array of affected question IDs
 * @param {object} details - Additional details
 */
// eslint-disable-next-line no-unused-vars
const logBulkOperation = async (action, questionIds, details = {}) => {
  try {
    const db = getDb();
    const auth = getAuth();
    const user = auth.currentUser;

    const auditEntry = {
      eventType: `BULK_${action}`,
      timestamp: serverTimestamp(),
      userId: user?.uid || "system",
      userEmail: user?.email || "system@automated",
      questionCount: questionIds.length,
      questionIds: questionIds.slice(0, 100),
      details,
      sessionId: localStorage.getItem("ue5_session_agent_id") || "unknown",
    };

    await addDoc(collection(db, "audit-log"), auditEntry);
    logger.log(`📋 Bulk Audit: ${action} on ${questionIds.length} questions`);
  } catch (error) {
    logger.error("Failed to log bulk audit event:", error);
  }
};

// Action type constants for consistency
export const AUDIT_ACTIONS = {
  STATUS_CHANGE: "STATUS_CHANGE",
  CRITIQUE_APPLIED: "CRITIQUE_APPLIED",
  IMPROVEMENT_APPLIED: "IMPROVEMENT_APPLIED",
  QUESTION_VERIFIED: "QUESTION_VERIFIED",
  QUESTION_ACCEPTED: "QUESTION_ACCEPTED",
  QUESTION_REJECTED: "QUESTION_REJECTED",
  QUESTION_RESTORED: "QUESTION_RESTORED",
  TRANSLATION_ADDED: "TRANSLATION_ADDED",
  TAGS_UPDATED: "TAGS_UPDATED",
  BULK_ACCEPT: "BULK_ACCEPT",
  BULK_REJECT: "BULK_REJECT",
  BULK_DELETE: "BULK_DELETE",
  BULK_CRITIQUE: "BULK_CRITIQUE",
  // Pre-save review lifecycle events (for debugging permission issues)
  REVIEW_ATTEMPT: "REVIEW_ATTEMPT",
  REVIEW_SUCCESS: "REVIEW_SUCCESS",
  REVIEW_FAILED: "REVIEW_FAILED",
};
