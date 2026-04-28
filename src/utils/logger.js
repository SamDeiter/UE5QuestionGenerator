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
 *
 * Runtime debug toggle (production):
 *   By default, production builds only emit error-level logs. To enable
 *   verbose logs (log/info/warn/debug) in production without redeploying,
 *   open the browser devtools console and either:
 *
 *     1. Run: localStorage.setItem('debug', '1') and then reload the page.
 *     2. Or simply call: window.enableDebug()
 *
 *   To turn it back off:
 *     1. localStorage.removeItem('debug') and reload, or
 *     2. window.disableDebug()
 *
 *   The flag is read once at module load, so a reload is required for the
 *   change to take effect.
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

// Runtime override: allow developers (or savvy users) to opt into verbose
// logging in production by setting localStorage.debug = '1' (or 'true').
// Read once at module load to avoid repeated localStorage hits per log call.
const debugFlag =
  typeof window !== "undefined" &&
  window.localStorage &&
  (window.localStorage.getItem("debug") === "1" ||
    window.localStorage.getItem("debug") === "true");

// Set log level based on environment, with runtime override support
const currentLogLevel =
  isProduction && !debugFlag ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG;

// Expose convenience helpers for toggling debug mode from devtools.
// Defined once at module init, not on every log call.
if (typeof window !== "undefined") {
  window.enableDebug = () => {
    window.localStorage.setItem("debug", "1");
    console.log("[logger] Debug logs enabled. Reloading...");
    window.location.reload();
  };
  window.disableDebug = () => {
    window.localStorage.removeItem("debug");
    console.log("[logger] Debug logs disabled. Reloading...");
    window.location.reload();
  };
}

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
