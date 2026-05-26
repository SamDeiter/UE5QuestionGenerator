/**
 * AppError - Structured error class for consistent error handling
 *
 * Provides:
 * - Error codes for categorization
 * - Context object for debugging
 * - Timestamp for logging
 * - Standardized logging helper
 */
import { logger } from "./logger";

// Error codes for categorization
export const ERROR_CODES = {
  // Firebase/Auth errors
  AUTH_BLOCKED: "AUTH_BLOCKED",
  AUTH_EXPIRED: "AUTH_EXPIRED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  FIRESTORE_WRITE_FAILED: "FIRESTORE_WRITE_FAILED",
  FIRESTORE_READ_FAILED: "FIRESTORE_READ_FAILED",

  // Network errors
  NETWORK_OFFLINE: "NETWORK_OFFLINE",
  NETWORK_TIMEOUT: "NETWORK_TIMEOUT",

  // Validation errors
  VALIDATION_FAILED: "VALIDATION_FAILED",
  PARSE_ERROR: "PARSE_ERROR",

  // Application errors
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  GENERATION_FAILED: "GENERATION_FAILED",
  EXPORT_FAILED: "EXPORT_FAILED",
  IMPORT_FAILED: "IMPORT_FAILED",

  // Generic fallback
  UNKNOWN: "UNKNOWN",
};

/**
 * Structured error class with context for debugging
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {string} code - Error code from ERROR_CODES
   * @param {Object} context - Additional debugging context
   */
  constructor(message, code = ERROR_CODES.UNKNOWN, context = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Returns a JSON-serializable representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Logs an error with standardized format and context
 *
 * @param {Error} error - The error to log
 * @param {Object} additionalContext - Extra context to include
 * @returns {void}
 */
export function logError(error, additionalContext = {}) {
  const isAppError = error instanceof AppError;

  const logData = {
    message: error.message,
    code: isAppError ? error.code : ERROR_CODES.UNKNOWN,
    context: isAppError
      ? { ...error.context, ...additionalContext }
      : additionalContext,
    timestamp: isAppError ? error.timestamp : new Date().toISOString(),
  };

  // Log at error level with structured data
  logger.error(`[${logData.code}] ${logData.message}`, logData.context);

  // In development, also log the stack trace
  if (import.meta.env?.DEV && error.stack) {
    logger.error("Stack trace:", error.stack);
  }
}

export default AppError;
