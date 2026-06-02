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
