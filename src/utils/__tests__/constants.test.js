/**
 * constants - Tests for app constants and configuration values
 * Ensures constants are correctly defined and consistent
 */
import { describe, it, expect } from "vitest";
import {
  LANGUAGE_FLAGS,
  LANGUAGE_CODES,
  QUALITY_THRESHOLDS,
  QUALITY_PASS_THRESHOLD,
  STORAGE_KEYS,
  TIMING,
  QUESTION_STATUS,
  APP_MODES,
  REVIEWER_ALLOWED_FIELDS,
  DEFAULT_CONFIG,
} from "../constants";

describe("constants", () => {
  describe("LANGUAGE_FLAGS and LANGUAGE_CODES", () => {
    it("has matching keys in FLAGS and CODES", () => {
      const flagKeys = Object.keys(LANGUAGE_FLAGS);
      const codeKeys = Object.keys(LANGUAGE_CODES);
      expect(flagKeys).toEqual(codeKeys);
    });

    it("includes English as default language", () => {
      expect(LANGUAGE_FLAGS.English).toBeDefined();
      expect(LANGUAGE_CODES.English).toBe("US");
    });

    it("includes multiple language options", () => {
      expect(Object.keys(LANGUAGE_FLAGS).length).toBeGreaterThan(5);
    });
  });

  describe("QUALITY_THRESHOLDS", () => {
    it("has expected threshold levels", () => {
      expect(QUALITY_THRESHOLDS.EXCELLENT).toBe(90);
      expect(QUALITY_THRESHOLDS.PASS).toBe(70);
      expect(QUALITY_THRESHOLDS.MEDIOCRE).toBe(50);
    });

    it("QUALITY_PASS_THRESHOLD matches PASS", () => {
      expect(QUALITY_PASS_THRESHOLD).toBe(QUALITY_THRESHOLDS.PASS);
    });

    it("thresholds are in descending order", () => {
      expect(QUALITY_THRESHOLDS.EXCELLENT).toBeGreaterThan(
        QUALITY_THRESHOLDS.PASS
      );
      expect(QUALITY_THRESHOLDS.PASS).toBeGreaterThan(
        QUALITY_THRESHOLDS.MEDIOCRE
      );
    });
  });

  describe("STORAGE_KEYS", () => {
    it("all keys are unique strings", () => {
      const values = Object.values(STORAGE_KEYS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it("all keys start with ue5_ prefix", () => {
      Object.values(STORAGE_KEYS).forEach((key) => {
        expect(key.startsWith("ue5_")).toBe(true);
      });
    });
  });

  describe("TIMING constants", () => {
    it("has cooldown in seconds", () => {
      expect(TIMING.COOLDOWN_SECONDS).toBeGreaterThan(0);
    });

    it("has auto-save interval", () => {
      expect(TIMING.AUTO_SAVE_INTERVAL).toBeGreaterThan(1000);
    });

    it("has cache TTL", () => {
      expect(TIMING.CACHE_TTL_MS).toBeGreaterThan(0);
    });
  });

  describe("QUESTION_STATUS", () => {
    it("has expected status values", () => {
      expect(QUESTION_STATUS.PENDING).toBe("pending");
      expect(QUESTION_STATUS.ACCEPTED).toBe("accepted");
      expect(QUESTION_STATUS.REJECTED).toBe("rejected");
      expect(QUESTION_STATUS.DELETED).toBe("deleted");
    });
  });

  describe("APP_MODES", () => {
    it("has landing mode", () => {
      expect(APP_MODES.LANDING).toBe("landing");
    });

    it("has all expected modes", () => {
      const modes = Object.values(APP_MODES);
      expect(modes).toContain("create");
      expect(modes).toContain("review");
      expect(modes).toContain("database");
      expect(modes).toContain("analytics");
      expect(modes).toContain("admin");
    });
  });

  describe("REVIEWER_ALLOWED_FIELDS", () => {
    it("includes status field", () => {
      expect(REVIEWER_ALLOWED_FIELDS).toContain("status");
    });

    it("includes humanVerified fields", () => {
      expect(REVIEWER_ALLOWED_FIELDS).toContain("humanVerified");
      expect(REVIEWER_ALLOWED_FIELDS).toContain("humanVerifiedBy");
      expect(REVIEWER_ALLOWED_FIELDS).toContain("humanVerifiedAt");
    });

    it("includes critique fields", () => {
      expect(REVIEWER_ALLOWED_FIELDS).toContain("critique");
      expect(REVIEWER_ALLOWED_FIELDS).toContain("critiqueScore");
    });

    it("has no duplicates", () => {
      const unique = new Set(REVIEWER_ALLOWED_FIELDS);
      expect(unique.size).toBe(REVIEWER_ALLOWED_FIELDS.length);
    });
  });

  describe("DEFAULT_CONFIG", () => {
    it("has all required default values", () => {
      expect(DEFAULT_CONFIG.apiKey).toBe("");
      expect(DEFAULT_CONFIG.language).toBe("English");
      expect(DEFAULT_CONFIG.discipline).toBeDefined();
      expect(DEFAULT_CONFIG.difficulty).toBeDefined();
    });

    it("has valid batchSize", () => {
      const batchSize = parseInt(DEFAULT_CONFIG.batchSize, 10);
      expect(batchSize).toBeGreaterThan(0);
      expect(batchSize).toBeLessThanOrEqual(20);
    });
  });
});
