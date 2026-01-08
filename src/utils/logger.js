/**
 * Centralized Logger Utility
 *
 * Provides consistent logging across the application with:
 * - Environment-aware log levels (disabled in production)
 * - Prefixed logs for easy filtering
 * - Structured log output
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.log('Message');           // General log
 *   logger.info('Info message');     // Info level
 *   logger.warn('Warning');          // Warning level
 *   logger.error('Error', error);    // Error level (always shown)
 *   logger.debug('Debug info');      // Debug level (verbose)
 */

// Check if we're in production mode
const isProduction =
  import.meta.env?.PROD || import.meta.env?.MODE === "production";

// Log levels: 0=silent, 1=errors, 2=warnings, 3=info, 4=debug
const LOG_LEVELS = {
  SILENT: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
};

// Set log level based on environment
const currentLogLevel = isProduction ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG;

/**
 * Format log prefix with timestamp and optional module name
 */
const formatPrefix = (level, module = null) => {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  const levelEmoji = {
    log: "📝",
    info: "ℹ️",
    warn: "⚠️",
    error: "❌",
    debug: "🔍",
  };
  const emoji = levelEmoji[level] || "📝";
  return module
    ? `${emoji} [${timestamp}] [${module}]`
    : `${emoji} [${timestamp}]`;
};

/**
 * Create a logger instance, optionally scoped to a module
 */
const createLogger = (moduleName = null) => ({
  /**
   * General log (same as info in production behavior)
   */
  log: (...args) => {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      console.log(formatPrefix("log", moduleName), ...args);
    }
  },

  /**
   * Informational messages
   */
  info: (...args) => {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      console.info(formatPrefix("info", moduleName), ...args);
    }
  },

  /**
   * Warning messages
   */
  warn: (...args) => {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      console.warn(formatPrefix("warn", moduleName), ...args);
    }
  },

  /**
   * Error messages (always shown)
   */
  error: (...args) => {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      console.error(formatPrefix("error", moduleName), ...args);
    }
  },

  /**
   * Debug messages (only in development with DEBUG level)
   */
  debug: (...args) => {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      console.debug(formatPrefix("debug", moduleName), ...args);
    }
  },

  /**
   * Group related logs together
   */
  group: (label, fn) => {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      console.group(formatPrefix("log", moduleName) + " " + label);
      fn();
      console.groupEnd();
    }
  },

  /**
   * Log a table (for arrays/objects)
   */
  table: (data, columns) => {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      console.table(data, columns);
    }
  },
});

// Default logger instance (no module prefix)
export const logger = createLogger();

// Factory to create module-specific loggers
export const createModuleLogger = (moduleName) => createLogger(moduleName);

// Export log levels for external configuration
export { LOG_LEVELS, isProduction };

export default logger;
