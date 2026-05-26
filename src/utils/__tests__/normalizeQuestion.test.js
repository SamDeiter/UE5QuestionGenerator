/**
 * normalizeQuestion - Tests for question normalization utility
 * Pure functions, no React dependencies
 */
import { describe, it, expect } from "vitest";
import normalizeQuestion, {
  completeReviewTracking,
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
});
