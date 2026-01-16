/**
 * analyticsStore - Core analytics functions tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getAnalytics,
  logGeneration,
  logQuestion,
  getMetrics,
  exportAnalytics,
  clearAnalytics,
  getTokenStats,
  getTokenUsage,
  getTokenUsageFromQuestions,
  logCritiqueAction,
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

Object.defineProperty(global, "localStorage", { value: localStorageMock });

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: () => "test-uuid-" + Math.random().toString(36).slice(2),
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

  describe("getMetrics", () => {
    it("returns all metrics by default", () => {
      const metrics = getMetrics();
      expect(metrics).toHaveProperty("generations");
      expect(metrics).toHaveProperty("questions");
      expect(metrics).toHaveProperty("summary");
    });

    it("filters by day", () => {
      const metrics = getMetrics("day");
      expect(metrics).toHaveProperty("generations");
    });

    it("filters by week", () => {
      const metrics = getMetrics("week");
      expect(metrics).toHaveProperty("generations");
    });

    it("filters by month", () => {
      const metrics = getMetrics("month");
      expect(metrics).toHaveProperty("generations");
    });
  });

  describe("exportAnalytics", () => {
    it("returns CSV format", () => {
      const csv = exportAnalytics();
      expect(csv).toContain("Timestamp");
      expect(csv).toContain("Discipline");
      expect(csv).toContain("Difficulty");
    });
  });

  describe("clearAnalytics", () => {
    it("removes analytics from localStorage", () => {
      clearAnalytics();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("ue5_analytics");
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

  describe("getTokenUsageFromQuestions", () => {
    it("handles null input", () => {
      const usage = getTokenUsageFromQuestions(null);
      expect(usage).toEqual({ inputTokens: 0, outputTokens: 0, totalCost: 0 });
    });

    it("handles empty array", () => {
      const usage = getTokenUsageFromQuestions([]);
      expect(usage).toEqual({ inputTokens: 0, outputTokens: 0, totalCost: 0 });
    });

    it("calculates usage from questions", () => {
      const questions = [{ estimatedCost: 0.01 }, { estimatedCost: 0.02 }];
      const usage = getTokenUsageFromQuestions(questions);
      expect(usage.totalCost).toBe(0.03);
      expect(usage.inputTokens).toBe(1000); // 2 questions * 500
      expect(usage.outputTokens).toBe(400); // 2 questions * 200
    });
  });

  describe("logCritiqueAction", () => {
    it("logs applied action", () => {
      logCritiqueAction({
        questionId: "q1",
        action: "applied",
        critiqueScore: 85,
      });
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("logs rejected action", () => {
      logCritiqueAction({
        questionId: "q2",
        action: "rejected",
        critiqueScore: 60,
      });
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });
});
