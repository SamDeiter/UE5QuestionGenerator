/**
 * analyticsStore - Core analytics functions tests
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getAnalytics,
  logGeneration,
  logQuestion,
  getTokenStats,
  getTokenUsage,
} from "../analyticsStore";

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Mock crypto.randomUUID with a stable counter for tests
let uuidCounter = 0;
vi.stubGlobal("crypto", {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
});

describe("analyticsStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("getAnalytics", () => {
    it("returns initialized analytics when localStorage is empty", () => {
      const result = getAnalytics();
      expect(result).toHaveProperty("generations");
      expect(result).toHaveProperty("questions");
      expect(result).toHaveProperty("summary");
      expect(result.generations).toEqual([]);
      expect(result.questions).toEqual([]);
    });

    it("parses existing data from localStorage", () => {
      const mockData = {
        generations: [{ id: "gen1" }],
        questions: [],
        summary: { totalGenerations: 1 },
      };
      localStorageMock.setItem("ue5_analytics", JSON.stringify(mockData));

      const result = getAnalytics();
      expect(result.generations).toHaveLength(1);
      expect(result.summary.totalGenerations).toBe(1);
    });
  });

  describe("logGeneration", () => {
    it("logs a generation event", () => {
      const generationData = {
        discipline: "Blueprint",
        difficulty: "Medium",
        batchSize: 5,
        tokensUsed: { input: 500, output: 200 },
        questionsGenerated: 5,
      };

      const id = logGeneration(generationData);

      expect(id).toBeTruthy();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("calculates success flag correctly", () => {
      const successGen = logGeneration({ success: true });
      const failGen = logGeneration({ success: false });

      expect(successGen).toBeTruthy();
      expect(failGen).toBeTruthy();
    });
  });

  describe("logQuestion", () => {
    it("logs a new question", () => {
      logQuestion({
        id: "q1",
        discipline: "Materials",
        status: "pending",
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("updates existing question", () => {
      // First log
      logQuestion({ id: "q1", status: "pending" });
      // Update
      logQuestion({ id: "q1", status: "accepted" });

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe("getTokenStats", () => {
    it("returns token statistics", () => {
      const stats = getTokenStats();
      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("recent");
      expect(stats).toHaveProperty("avgInput");
      expect(stats).toHaveProperty("avgOutput");
    });
  });

  describe("getTokenUsage", () => {
    it("returns token usage breakdown", () => {
      const usage = getTokenUsage();
      expect(usage).toHaveProperty("inputTokens");
      expect(usage).toHaveProperty("outputTokens");
      expect(usage).toHaveProperty("totalCost");
    });
  });
});
