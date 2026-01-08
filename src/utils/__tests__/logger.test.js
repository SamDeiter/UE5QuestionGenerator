/**
 * Tests for logger.js - Centralized logging utility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  logger,
  createModuleLogger,
  LOG_LEVELS,
  isProduction,
} from "../logger";

describe("logger utility", () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("default logger", () => {
    it("should have all logging methods", () => {
      expect(typeof logger.log).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });

    it("should call console.log when calling logger.log", () => {
      logger.log("test message");
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it("should call console.warn when calling logger.warn", () => {
      logger.warn("warning message");
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it("should call console.error when calling logger.error", () => {
      logger.error("error message");
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("should pass multiple arguments to console", () => {
      logger.log("message", { data: 123 }, [1, 2, 3]);
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe("createModuleLogger", () => {
    it("should create a logger with module name", () => {
      const moduleLogger = createModuleLogger("TestModule");
      expect(typeof moduleLogger.log).toBe("function");
      expect(typeof moduleLogger.error).toBe("function");
    });

    it("should include module name in log output", () => {
      const moduleLogger = createModuleLogger("FirebaseService");
      moduleLogger.log("connected");
      expect(consoleSpy.log).toHaveBeenCalled();
      // The call should include the module name in the prefix
      const callArgs = consoleSpy.log.mock.calls[0];
      expect(callArgs[0]).toContain("FirebaseService");
    });
  });

  describe("LOG_LEVELS", () => {
    it("should export log level constants", () => {
      expect(LOG_LEVELS.SILENT).toBe(0);
      expect(LOG_LEVELS.ERROR).toBe(1);
      expect(LOG_LEVELS.WARN).toBe(2);
      expect(LOG_LEVELS.INFO).toBe(3);
      expect(LOG_LEVELS.DEBUG).toBe(4);
    });
  });

  describe("isProduction export", () => {
    it("should export isProduction flag", () => {
      expect(typeof isProduction).toBe("boolean");
    });
  });

  describe("logger.group", () => {
    it("should have a group method", () => {
      expect(typeof logger.group).toBe("function");
    });
  });

  describe("logger.table", () => {
    it("should have a table method", () => {
      expect(typeof logger.table).toBe("function");
    });
  });
});
