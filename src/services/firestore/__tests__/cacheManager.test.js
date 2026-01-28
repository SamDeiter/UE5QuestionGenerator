/**
 * Cache Manager Unit Tests
 *
 * Tests the centralized cache management.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the underlying module
vi.mock("../../firebaseQueries", () => ({
  invalidateQuestionsCache: vi.fn(),
}));

import * as firebaseQueries from "../../firebaseQueries";
import {
  invalidateCache,
  getCacheStats,
  clearAllCaches,
} from "../cacheManager";

describe("cacheManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // invalidateCache
  // ============================================================
  describe("invalidateCache", () => {
    it("invalidates questions cache when type is 'questions'", () => {
      invalidateCache("questions");

      expect(firebaseQueries.invalidateQuestionsCache).toHaveBeenCalled();
    });

    it("invalidates all caches when type is 'all'", () => {
      invalidateCache("all");

      expect(firebaseQueries.invalidateQuestionsCache).toHaveBeenCalled();
    });

    it("invalidates all caches when no type provided (default)", () => {
      invalidateCache();

      expect(firebaseQueries.invalidateQuestionsCache).toHaveBeenCalled();
    });

    it("handles 'users' cache type without error", () => {
      // Users cache not yet implemented, should not throw
      expect(() => invalidateCache("users")).not.toThrow();
    });

    it("handles 'stats' cache type without error", () => {
      // Stats cache not yet implemented, should not throw
      expect(() => invalidateCache("stats")).not.toThrow();
    });
  });

  // ============================================================
  // getCacheStats
  // ============================================================
  describe("getCacheStats", () => {
    it("returns cache statistics object", () => {
      const stats = getCacheStats();

      expect(stats).toHaveProperty("questions");
      expect(stats.questions).toHaveProperty("type", "questions");
      expect(stats.questions).toHaveProperty("size");
      expect(stats.questions).toHaveProperty("lastInvalidated");
    });
  });

  // ============================================================
  // clearAllCaches
  // ============================================================
  describe("clearAllCaches", () => {
    it("calls invalidateCache with 'all'", () => {
      clearAllCaches();

      expect(firebaseQueries.invalidateQuestionsCache).toHaveBeenCalled();
    });
  });
});
