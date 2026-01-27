/**
 * Invite Service
 *
 * Client-side wrapper for invite-related Cloud Functions.
 * All invite validation happens server-side for security.
 *
 * @module services/inviteService
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";
import { logger } from "../utils/logger";

// Initialize Cloud Functions
const functions = getFunctions(app, "us-central1");

/**
 * Validates an invite code server-side.
 * Does NOT require authentication.
 *
 * @param {string} code - The invite code to validate
 * @returns {Promise<{valid: boolean, role: string, expiresAt: string, remainingUses: number|string}>}
 * @throws {Error} If code is invalid, expired, revoked, or rate limited
 */
export const validateInvite = async (code) => {
  try {
    const validateInviteFn = httpsCallable(functions, "validateInvite");
    const result = await validateInviteFn({ code });
    return result.data;
  } catch (error) {
    logger.error("Invite validation error:", error);
    throw new Error(error.message || "Failed to validate invite code");
  }
};

/**
 * Consumes an invite code after successful authentication.
 * REQUIRES authentication.
 *
 * @param {string} code - The invite code to consume
 * @returns {Promise<{success: boolean, role: string, alreadyUsed?: boolean}>}
 * @throws {Error} If consumption fails
 */
export const consumeInvite = async (code) => {
  try {
    const consumeInviteFn = httpsCallable(functions, "consumeInvite");
    const result = await consumeInviteFn({ code });
    return result.data;
  } catch (error) {
    logger.error("Invite consumption error:", error);
    throw new Error(error.message || "Failed to use invite code");
  }
};

/**
 * Creates a new invite code (Admin only).
 *
 * @param {Object} options - Invite creation options
 * @param {number} [options.maxUses=1] - Maximum number of uses (-1 for unlimited)
 * @param {number} [options.expiresInDays=7] - Days until expiration (max 30)
 * @param {string} [options.role='user'] - Role to assign ('user' or 'admin')
 * @param {string} [options.note=''] - Optional description
 * @returns {Promise<{success: boolean, code: string, inviteUrl: string, expiresAt: string}>}
 * @throws {Error} If not admin or creation fails
 */
export const createInvite = async (options = {}) => {
  try {
    const createInviteFn = httpsCallable(functions, "createInvite");
    const result = await createInviteFn(options);
    return result.data;
  } catch (error) {
    logger.error("Invite creation error:", error);
    throw new Error(error.message || "Failed to create invite");
  }
};

/**
 * Revokes an existing invite code (Admin only).
 *
 * @param {string} code - The invite code to revoke
 * @returns {Promise<{success: boolean}>}
 * @throws {Error} If not admin or revocation fails
 */
export const revokeInvite = async (code) => {
  try {
    const revokeInviteFn = httpsCallable(functions, "revokeInvite");
    const result = await revokeInviteFn({ code });
    return result.data;
  } catch (error) {
    logger.error("Invite revocation error:", error);
    throw new Error(error.message || "Failed to revoke invite");
  }
};

/**
 * Checks if the current user is registered (has used a valid invite).
 *
 * @returns {Promise<{registered: boolean, role?: string, registeredAt?: string}>}
 */
export const checkUserRegistration = async () => {
  try {
    const checkFn = httpsCallable(functions, "checkUserRegistration");
    const result = await checkFn({});
    return result.data;
  } catch (error) {
    logger.error("Registration check error:", error);
    return { registered: false };
  }
};

/**
 * Gets invite code from URL query parameters.
 *
 * @returns {string|null} The invite code or null if not present
 */
export const getInviteFromUrl = () => {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("invite");
};

/**
 * Clears invite code from URL without page reload.
 */
export const clearInviteFromUrl = () => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("invite");
  window.history.replaceState({}, "", url.toString());
};

/**
 * Sets up the current user as an initial admin.
 * Only works for whitelisted emails ([SUPER_ADMIN_EMAIL], [PERSONAL_EMAIL])
 *
 * @returns {Promise<{success: boolean, message: string, role: string}>}
 */
export const setupInitialAdmin = async () => {
  try {
    const setupFn = httpsCallable(functions, "setupInitialAdmin");
    const result = await setupFn({});
    return result.data;
  } catch (error) {
    logger.error("Initial admin setup error:", error);
    throw new Error(error.message || "Failed to setup admin");
  }
};

/**
 * Logs an authentication failure for admin monitoring.
 * Non-critical - errors are swallowed to avoid breaking the auth flow.
 *
 * @param {Object} data - Failure details
 * @param {string} data.errorCode - Error code
 * @param {string} data.errorMessage - Error message
 * @param {string} data.userAgent - Browser user agent
 * @param {string} data.timestamp - ISO timestamp
 * @returns {Promise<{success: boolean, logId?: string}>}
 */
export const logAuthFailure = async (data) => {
  try {
    const logFn = httpsCallable(functions, "logAuthFailure");
    const result = await logFn(data);
    return result.data;
  } catch (error) {
    // Silently fail - logging should never break auth
    logger.warn("Failed to log auth failure:", error);
    return { success: false };
  }
};
