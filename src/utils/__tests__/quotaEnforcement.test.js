/**
 * quotaEnforcement - Tests for quota validation utilities
 * Pure functions, no React dependencies
 */
import { describe, it, expect } from "vitest";
import {
  getCategoryCounts,
  getDisciplineCounts,
  isCategoryFull,
  isDisciplineFull,
  isTotalQuotaMet,
  getRemainingQuota,
  getQuotaStatus,
  validateGeneration,
} from "../quotaEnforcement";

describe("quotaEnforcement", () => {
  // Mock questions for testing
  const createQuestion = (overrides = {}) => ({
    discipline: "Blueprints",
    difficulty: "Beginner MC",
    type: "Multiple Choice",
    status: "accepted",
    ...overrides,
  });

  describe("getCategoryCounts", () => {
    it("returns counts for each category", () => {
      const questions = [
        createQuestion({ difficulty: "Beginner MC" }),
        createQuestion({ difficulty: "Beginner MC" }),
        createQuestion({ difficulty: "Expert MC" }),
      ];
      const result = getCategoryCounts(questions);
      expect(result["Beginner MC"]).toBe(2);
      expect(result["Expert MC"]).toBe(1);
    });

    it("excludes rejected questions", () => {
      const questions = [
        createQuestion({ difficulty: "Beginner MC", status: "accepted" }),
        createQuestion({ difficulty: "Beginner MC", status: "rejected" }),
      ];
      const result = getCategoryCounts(questions);
      expect(result["Beginner MC"]).toBe(1);
    });
  });

  describe("getDisciplineCounts", () => {
    it("groups by discipline and difficulty", () => {
      const questions = [
        createQuestion({ discipline: "Blueprints", difficulty: "Beginner MC" }),
        createQuestion({ discipline: "Materials", difficulty: "Expert MC" }),
      ];
      const result = getDisciplineCounts(questions);
      expect(result.Blueprints["Beginner MC"]).toBe(1);
      expect(result.Materials["Expert MC"]).toBe(1);
    });

    it("excludes rejected questions", () => {
      const questions = [
        createQuestion({ status: "accepted" }),
        createQuestion({ status: "rejected" }),
      ];
      const result = getDisciplineCounts(questions);
      expect(result.Blueprints["Beginner MC"]).toBe(1);
    });
  });

  describe("isCategoryFull", () => {
    it("returns false when under quota", () => {
      const questions = [createQuestion({ difficulty: "Beginner MC" })];
      expect(isCategoryFull("Beginner MC", questions)).toBe(false);
    });

    it("returns true when at quota (40)", () => {
      const questions = Array(40)
        .fill(null)
        .map(() => createQuestion({ difficulty: "Beginner MC" }));
      expect(isCategoryFull("Beginner MC", questions)).toBe(true);
    });
  });

  describe("isDisciplineFull", () => {
    it("returns false when under quota", () => {
      const questions = [createQuestion()];
      expect(isDisciplineFull("Blueprints", "Beginner MC", questions)).toBe(
        false
      );
    });

    it("checks specific discipline and difficulty", () => {
      const questions = [
        createQuestion({ discipline: "Materials", difficulty: "Beginner MC" }),
      ];
      // Blueprints has no questions, should be false
      expect(isDisciplineFull("Blueprints", "Beginner MC", questions)).toBe(
        false
      );
    });
  });

  describe("isTotalQuotaMet", () => {
    it("returns false when total under 240", () => {
      const questions = Array(100)
        .fill(null)
        .map(() => createQuestion());
      expect(isTotalQuotaMet(questions)).toBe(false);
    });

    it("returns true when total at or above 240", () => {
      const questions = Array(240)
        .fill(null)
        .map(() => createQuestion());
      expect(isTotalQuotaMet(questions)).toBe(true);
    });
  });

  describe("getRemainingQuota", () => {
    it("returns target when no questions", () => {
      expect(getRemainingQuota("Beginner MC", [])).toBe(40);
    });

    it("returns remaining count", () => {
      const questions = Array(30)
        .fill(null)
        .map(() => createQuestion({ difficulty: "Beginner MC" }));
      expect(getRemainingQuota("Beginner MC", questions)).toBe(10);
    });

    it("returns 0 when at or over quota", () => {
      const questions = Array(50)
        .fill(null)
        .map(() => createQuestion({ difficulty: "Beginner MC" }));
      expect(getRemainingQuota("Beginner MC", questions)).toBe(0);
    });
  });

  describe("getQuotaStatus", () => {
    it("returns status for all categories plus TOTAL", () => {
      const result = getQuotaStatus([]);
      expect(result).toHaveProperty("TOTAL");
      expect(result["Beginner MC"]).toHaveProperty("current");
      expect(result["Beginner MC"]).toHaveProperty("target");
      expect(result["Beginner MC"]).toHaveProperty("remaining");
      expect(result["Beginner MC"]).toHaveProperty("isFull");
      expect(result["Beginner MC"]).toHaveProperty("percentage");
    });

    it("calculates percentage correctly", () => {
      const questions = Array(20)
        .fill(null)
        .map(() => createQuestion({ difficulty: "Beginner MC" }));
      const result = getQuotaStatus(questions);
      expect(result["Beginner MC"].percentage).toBe(50);
    });
  });

  describe("validateGeneration", () => {
    it("allows generation when under quota", () => {
      const result = validateGeneration(
        "Blueprints",
        "Beginner",
        5,
        [],
        "Multiple Choice"
      );
      expect(result.allowed).toBe(true);
      expect(result.maxAllowed).toBeGreaterThan(0);
    });

    it("limits batch size to remaining quota", () => {
      const questions = Array(35)
        .fill(null)
        .map(() =>
          createQuestion({ difficulty: "Beginner", type: "Multiple Choice" })
        );
      const result = validateGeneration(
        "Blueprints",
        "Beginner",
        10,
        questions,
        "Multiple Choice"
      );
      expect(result.maxAllowed).toBe(5);
    });

    it("blocks when specific type is full", () => {
      const questions = Array(40)
        .fill(null)
        .map(() =>
          createQuestion({
            discipline: "Blueprints",
            difficulty: "Beginner",
            type: "Multiple Choice",
          })
        );
      const result = validateGeneration(
        "Blueprints",
        "Beginner",
        5,
        questions,
        "Multiple Choice"
      );
      expect(result.allowed).toBe(false);
      expect(result.forceType).toBe("True/False");
    });
  });
});
