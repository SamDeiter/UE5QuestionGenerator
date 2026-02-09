/**
 * Question Cache Unit Tests
 *
 * Tests the IndexedDB-based caching layer for questions and metadata.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock idb
const mockStore = new Map();
const mockMetaStore = new Map();

const mockDB = {
  transaction: vi.fn(() => ({
    store: {
      put: vi.fn((value) => {
        if (value.uniqueId) mockStore.set(value.uniqueId, value);
        return Promise.resolve();
      }),
    },
    done: Promise.resolve(),
  })),
  put: vi.fn((storeName, value, key) => {
    if (storeName === "meta") {
      mockMetaStore.set(key, value);
    }
    return Promise.resolve();
  }),
  get: vi.fn((storeName, key) => {
    if (storeName === "meta") {
      return Promise.resolve(mockMetaStore.get(key) || null);
    }
    return Promise.resolve(mockStore.get(key) || null);
  }),
  getAll: vi.fn(() => Promise.resolve([...mockStore.values()])),
  getAllFromIndex: vi.fn(() => Promise.resolve([])),
  count: vi.fn(() => Promise.resolve(mockStore.size)),
  clear: vi.fn((storeName) => {
    if (storeName === "meta") mockMetaStore.clear();
    else mockStore.clear();
    return Promise.resolve();
  }),
  delete: vi.fn((storeName, key) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
};

vi.mock("idb", () => ({
  openDB: vi.fn(() => Promise.resolve(mockDB)),
}));

vi.mock("../../utils/logger", () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../utils/constants", () => ({
  FIRESTORE_LIMITS: {
    CACHE_TTL_MS: 300000, // 5 minutes
  },
}));

import {
  cacheQuestions,
  cacheMetadata,
  getCachedMetadata,
  isCacheValid,
  clearCache,
  getCacheStats,
} from "../questionCache";

describe("questionCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    mockMetaStore.clear();
  });

  // ============================================================
  // cacheMetadata / getCachedMetadata
  // ============================================================
  describe("cacheMetadata", () => {
    it("stores metadata by key", async () => {
      const testData = { totalQuestions: 150, byStatus: { accepted: 42 } };
      await cacheMetadata("global_stats", testData);

      expect(mockDB.put).toHaveBeenCalledWith("meta", testData, "global_stats");
    });

    it("does nothing when key is null/empty", async () => {
      await cacheMetadata(null, { foo: "bar" });
      await cacheMetadata("", { foo: "bar" });

      expect(mockDB.put).not.toHaveBeenCalled();
    });
  });

  describe("getCachedMetadata", () => {
    it("retrieves stored metadata by key", async () => {
      const testData = { totalQuestions: 150 };
      mockMetaStore.set("global_stats", testData);

      const result = await getCachedMetadata("global_stats");
      expect(result).toEqual(testData);
    });

    it("returns null for missing keys", async () => {
      const result = await getCachedMetadata("nonexistent_key");
      expect(result).toBeNull();
    });

    it("returns null when key is null/empty", async () => {
      const result = await getCachedMetadata(null);
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // cacheQuestions / getCachedQuestions
  // ============================================================
  describe("cacheQuestions", () => {
    it("stores questions to the cache", async () => {
      const questions = [
        { uniqueId: "q1", question: "What is X?" },
        { uniqueId: "q2", question: "What is Y?" },
      ];

      await cacheQuestions(questions);

      // Should have created a transaction
      expect(mockDB.transaction).toHaveBeenCalled();
    });

    it("does nothing for empty arrays", async () => {
      await cacheQuestions([]);
      await cacheQuestions(null);

      expect(mockDB.transaction).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // clearCache
  // ============================================================
  describe("clearCache", () => {
    it("clears both stores", async () => {
      await clearCache();

      expect(mockDB.clear).toHaveBeenCalledWith("questions");
      expect(mockDB.clear).toHaveBeenCalledWith("meta");
    });
  });

  // ============================================================
  // isCacheValid
  // ============================================================
  describe("isCacheValid", () => {
    it("returns false when no cache exists", async () => {
      const valid = await isCacheValid();
      expect(valid).toBe(false);
    });
  });

  // ============================================================
  // getCacheStats
  // ============================================================
  describe("getCacheStats", () => {
    it("returns stats with count and validity", async () => {
      const stats = await getCacheStats();

      expect(stats).toHaveProperty("count");
      expect(stats).toHaveProperty("lastUpdated");
      expect(stats).toHaveProperty("isValid");
    });
  });
});
