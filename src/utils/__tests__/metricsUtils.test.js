/**
 * metricsUtils - Tests for metrics calculation functions
 * Pure functions, no React dependencies
 */
import { describe, it, expect } from "vitest";
import { calculateMetrics } from "../metricsUtils";

describe("metricsUtils", () => {
  describe("calculateMetrics", () => {
    it("returns default metrics for empty array", () => {
      const result = calculateMetrics([]);
      expect(result.total).toBe(0);
      expect(result.uniqueQuestions).toBe(0);
      expect(result.byDifficulty).toEqual({ Easy: 0, Medium: 0, Hard: 0 });
      expect(result.byType).toEqual({ "Multiple Choice": 0, "True/False": 0 });
    });

    it("returns default metrics for null input", () => {
      const result = calculateMetrics(null);
      expect(result.total).toBe(0);
    });

    it("counts total questions correctly", () => {
      const questions = [
        { uniqueId: "q1", difficulty: "Easy", type: "Multiple Choice" },
        { uniqueId: "q2", difficulty: "Medium", type: "True/False" },
      ];
      const result = calculateMetrics(questions);
      expect(result.total).toBe(2);
    });

    it("deduplicates by uniqueId", () => {
      const questions = [
        {
          uniqueId: "q1",
          difficulty: "Easy",
          type: "Multiple Choice",
          language: "English",
        },
        {
          uniqueId: "q1",
          difficulty: "Easy",
          type: "Multiple Choice",
          language: "Chinese",
        }, // Translation
        {
          uniqueId: "q2",
          difficulty: "Medium",
          type: "Multiple Choice",
          language: "English",
        },
      ];
      const result = calculateMetrics(questions);
      expect(result.uniqueQuestions).toBe(2);
      expect(result.total).toBe(3);
    });

    it("counts by difficulty correctly", () => {
      const questions = [
        { uniqueId: "q1", difficulty: "Easy", type: "Multiple Choice" },
        { uniqueId: "q2", difficulty: "Easy", type: "Multiple Choice" },
        { uniqueId: "q3", difficulty: "Hard", type: "Multiple Choice" },
      ];
      const result = calculateMetrics(questions);
      expect(result.byDifficulty.Easy).toBe(2);
      expect(result.byDifficulty.Hard).toBe(1);
      expect(result.byDifficulty.Medium).toBe(0);
    });

    it("normalizes difficulty values", () => {
      const questions = [
        { uniqueId: "q1", difficulty: "Beginner", type: "Multiple Choice" }, // -> Easy
        { uniqueId: "q2", difficulty: "Intermediate", type: "Multiple Choice" }, // -> Medium
        { uniqueId: "q3", difficulty: "Expert", type: "Multiple Choice" }, // -> Hard
      ];
      const result = calculateMetrics(questions);
      expect(result.byDifficulty.Easy).toBe(1);
      expect(result.byDifficulty.Medium).toBe(1);
      expect(result.byDifficulty.Hard).toBe(1);
    });

    it("counts by type correctly", () => {
      const questions = [
        { uniqueId: "q1", difficulty: "Easy", type: "Multiple Choice" },
        { uniqueId: "q2", difficulty: "Easy", type: "True/False" },
        { uniqueId: "q3", difficulty: "Easy", type: "True/False" },
      ];
      const result = calculateMetrics(questions);
      expect(result.byType["Multiple Choice"]).toBe(1);
      expect(result.byType["True/False"]).toBe(2);
    });

    it("counts by discipline correctly", () => {
      const questions = [
        {
          uniqueId: "q1",
          difficulty: "Easy",
          type: "Multiple Choice",
          discipline: "Blueprint",
        },
        {
          uniqueId: "q2",
          difficulty: "Easy",
          type: "Multiple Choice",
          discipline: "Blueprint",
        },
        {
          uniqueId: "q3",
          difficulty: "Easy",
          type: "Multiple Choice",
          discipline: "Materials",
        },
      ];
      const result = calculateMetrics(questions);
      expect(result.byDiscipline.Blueprint).toBe(2);
      expect(result.byDiscipline.Materials).toBe(1);
    });

    it("counts by language correctly", () => {
      const questions = [
        { uniqueId: "q1", language: "English" },
        { uniqueId: "q1", language: "Chinese (Simplified)" },
        { uniqueId: "q2", language: "English" },
      ];
      const result = calculateMetrics(questions);
      expect(result.byLanguage.English).toBe(2);
      expect(result.byLanguage["Chinese (Simplified)"]).toBe(1);
    });

    it("defaults language to English when missing", () => {
      const questions = [
        { uniqueId: "q1" }, // No language field
      ];
      const result = calculateMetrics(questions);
      expect(result.byLanguage.English).toBe(1);
    });

    it("calculates average quality from critiqueScore", () => {
      const questions = [
        { uniqueId: "q1", critiqueScore: 80 },
        { uniqueId: "q2", critiqueScore: 90 },
      ];
      const result = calculateMetrics(questions);
      expect(result.avgQuality).toBe("85.0");
    });

    it("calculates average quality from initialQuality", () => {
      const questions = [
        { uniqueId: "q1", initialQuality: 70 },
        { uniqueId: "q2", initialQuality: 80 },
      ];
      const result = calculateMetrics(questions);
      expect(result.avgQuality).toBe("75.0");
    });

    it("returns 0 avgQuality when no scores", () => {
      const questions = [{ uniqueId: "q1" }, { uniqueId: "q2" }];
      const result = calculateMetrics(questions);
      expect(result.avgQuality).toBe(0);
    });

    it("prefers English version when deduplicating", () => {
      const questions = [
        { uniqueId: "q1", language: "Chinese", difficulty: "Hard" },
        { uniqueId: "q1", language: "English", difficulty: "Easy" },
      ];
      const result = calculateMetrics(questions);
      // Should use English version for difficulty count
      expect(result.byDifficulty.Easy).toBe(1);
      expect(result.byDifficulty.Hard).toBe(0);
    });
  });
});
