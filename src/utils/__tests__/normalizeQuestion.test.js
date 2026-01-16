/**
 * normalizeQuestion - Tests for question normalization utility
 * Pure functions, no React dependencies
 */
import { describe, it, expect } from "vitest";
import normalizeQuestion, {
  normalizeQuestions,
  startReviewTracking,
  completeReviewTracking,
  formatReviewDuration,
} from "../normalizeQuestion";

describe("normalizeQuestion", () => {
  describe("normalizeQuestion", () => {
    it("fills in missing fields with defaults", () => {
      const result = normalizeQuestion({});
      expect(result.discipline).toBe("General");
      expect(result.difficulty).toBe("Easy");
      expect(result.type).toBe("Multiple Choice");
      expect(result.status).toBe("pending");
      expect(result.language).toBe("English");
    });

    it("preserves existing values", () => {
      const input = {
        question: "Test question?",
        discipline: "Blueprint",
        difficulty: "Hard",
      };
      const result = normalizeQuestion(input);
      expect(result.question).toBe("Test question?");
      expect(result.discipline).toBe("Blueprint");
      expect(result.difficulty).toBe("Hard");
    });

    it("generates id and uniqueId if missing", () => {
      const result = normalizeQuestion({});
      expect(result.id).toBeDefined();
      expect(result.uniqueId).toBeDefined();
      // id and uniqueId should be the same
      expect(result.id).toBe(result.uniqueId);
    });

    it("preserves existing id and uniqueId", () => {
      const input = {
        id: "existing-id",
        uniqueId: "existing-unique-id",
      };
      const result = normalizeQuestion(input);
      // Should prefer uniqueId if both exist
      expect(result.uniqueId).toBe("existing-unique-id");
    });

    it("applies context defaults", () => {
      const contextDefaults = {
        discipline: "Niagara",
        creatorName: "Test User",
      };
      const result = normalizeQuestion({}, contextDefaults);
      expect(result.discipline).toBe("Niagara");
      expect(result.creatorName).toBe("Test User");
    });

    it("ensures tags is an array", () => {
      const result = normalizeQuestion({});
      expect(Array.isArray(result.tags)).toBe(true);
    });

    it("returns null for invalid input", () => {
      expect(normalizeQuestion(null)).toBe(null);
      expect(normalizeQuestion(undefined)).toBe(null);
      expect(normalizeQuestion("string")).toBe(null);
    });

    it("sets options with default structure", () => {
      const result = normalizeQuestion({});
      expect(result.options).toHaveProperty("A");
      expect(result.options).toHaveProperty("B");
      expect(result.options).toHaveProperty("C");
      expect(result.options).toHaveProperty("D");
    });
  });

  describe("normalizeQuestions", () => {
    it("normalizes array of questions", () => {
      const questions = [
        { question: "Q1" },
        { question: "Q2", discipline: "Materials" },
      ];
      const result = normalizeQuestions(questions);
      expect(result).toHaveLength(2);
      expect(result[0].discipline).toBe("General");
      expect(result[1].discipline).toBe("Materials");
    });

    it("filters out null entries from invalid inputs", () => {
      const questions = [{ question: "Q1" }, null, { question: "Q2" }];
      const result = normalizeQuestions(questions);
      // null entries get filtered out by .filter(q => q !== null)
      expect(result).toHaveLength(2);
    });

    it("applies context defaults to all questions", () => {
      const questions = [{ question: "Q1" }, { question: "Q2" }];
      const contextDefaults = { creatorName: "Batch Creator" };
      const result = normalizeQuestions(questions, contextDefaults);
      expect(result[0].creatorName).toBe("Batch Creator");
      expect(result[1].creatorName).toBe("Batch Creator");
    });

    it("returns empty array for non-array input", () => {
      expect(normalizeQuestions(null)).toEqual([]);
      expect(normalizeQuestions("string")).toEqual([]);
    });
  });

  describe("startReviewTracking", () => {
    it("sets reviewStartedAt timestamp", () => {
      const question = { uniqueId: "q1" };
      const result = startReviewTracking(question);
      expect(result.reviewStartedAt).toBeDefined();
      expect(typeof result.reviewStartedAt).toBe("string");
    });

    it("preserves other question properties", () => {
      const question = { uniqueId: "q1", question: "Test?" };
      const result = startReviewTracking(question);
      expect(result.question).toBe("Test?");
    });

    it("does not overwrite existing reviewStartedAt", () => {
      const existingTime = "2024-01-01T00:00:00.000Z";
      const question = { reviewStartedAt: existingTime };
      const result = startReviewTracking(question);
      expect(result.reviewStartedAt).toBe(existingTime);
    });
  });

  describe("completeReviewTracking", () => {
    it("calculates duration when startedAt exists", () => {
      const startTime = new Date(Date.now() - 30000).toISOString(); // 30 sec ago
      const question = { reviewStartedAt: startTime };
      const result = completeReviewTracking(question, "Reviewer");
      expect(result.reviewDuration).toBeGreaterThan(0);
    });

    it("sets reviewerName", () => {
      const question = { reviewStartedAt: new Date().toISOString() };
      const result = completeReviewTracking(question, "Test Reviewer");
      expect(result.reviewerName).toBe("Test Reviewer");
    });

    it("sets reviewCompletedAt", () => {
      const question = { reviewStartedAt: new Date().toISOString() };
      const result = completeReviewTracking(question);
      expect(result.reviewCompletedAt).toBeDefined();
    });

    it("returns null duration when no startedAt", () => {
      const question = {};
      const result = completeReviewTracking(question);
      expect(result.reviewDuration).toBe(null);
    });
  });

  describe("formatReviewDuration", () => {
    it("formats seconds correctly", () => {
      expect(formatReviewDuration(30)).toBe("30s");
      expect(formatReviewDuration(45)).toBe("45s");
    });

    it("formats minutes and seconds", () => {
      expect(formatReviewDuration(90)).toBe("1m 30s");
      expect(formatReviewDuration(125)).toBe("2m 5s");
    });

    it("returns -- for zero or negative", () => {
      expect(formatReviewDuration(0)).toBe("--");
      expect(formatReviewDuration(-5)).toBe("--");
      expect(formatReviewDuration(null)).toBe("--");
    });

    it("formats hours correctly", () => {
      expect(formatReviewDuration(3600)).toBe("1h");
      expect(formatReviewDuration(3660)).toBe("1h 1m");
    });
  });
});
