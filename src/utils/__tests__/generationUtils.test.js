/**
 * generationUtils - Tests for question generation utilities
 * Pure functions, no React dependencies
 */
import { describe, it, expect } from "vitest";
import {
  calculateCoverageGaps,
  filterForbiddenSources,
  enrichGeneratedQuestions,
} from "../generationUtils";

describe("generationUtils", () => {
  describe("calculateCoverageGaps", () => {
    it("returns all tags as zeroTags when no questions exist", () => {
      const availableTags = ["#tag1", "#tag2", "#tag3"];
      const result = calculateCoverageGaps("Blueprint", availableTags, []);
      expect(result.zeroTags).toHaveLength(3);
      expect(result.lowTags).toHaveLength(0);
    });

    it("moves tags to lowTags when they have some coverage", () => {
      const availableTags = ["#tag1", "#tag2"];
      const questions = [
        { discipline: "Blueprint", tags: ["#tag1"] },
        { discipline: "Blueprint", tags: ["#tag1"] },
      ];
      const result = calculateCoverageGaps(
        "Blueprint",
        availableTags,
        questions
      );
      expect(result.lowTags).toContain("#tag1");
      expect(result.zeroTags).toContain("#tag2");
    });

    it("only counts questions from specified discipline", () => {
      const availableTags = ["#tag1"];
      const questions = [
        { discipline: "Materials", tags: ["#tag1"] },
        { discipline: "Materials", tags: ["#tag1"] },
      ];
      const result = calculateCoverageGaps(
        "Blueprint",
        availableTags,
        questions
      );
      // Blueprint has no questions, so tag1 should be zero
      expect(result.zeroTags).toContain("#tag1");
    });

    it("handles tags without # prefix", () => {
      const availableTags = ["#tag1"];
      const questions = [{ discipline: "Blueprint", tags: ["tag1"] }];
      const result = calculateCoverageGaps(
        "Blueprint",
        availableTags,
        questions
      );
      // Should match even without #
      expect(result.lowTags).toContain("#tag1");
    });
  });

  describe("filterForbiddenSources", () => {
    it("filters out YouTube URLs", () => {
      const questions = [
        { sourceUrl: "https://youtube.com/watch?v=123" },
        { sourceUrl: "https://docs.unrealengine.com/page" },
      ];
      const result = filterForbiddenSources(questions);
      expect(result).toHaveLength(1);
      expect(result[0].sourceUrl).toContain("unrealengine");
    });

    it("filters out youtu.be URLs", () => {
      const questions = [
        { sourceUrl: "https://youtu.be/abc123" },
        { sourceUrl: "https://example.com" },
      ];
      const result = filterForbiddenSources(questions);
      expect(result).toHaveLength(1);
    });

    it("filters out Vimeo URLs", () => {
      const questions = [
        { sourceUrl: "https://vimeo.com/123456" },
        { sourceUrl: "https://docs.unrealengine.com" },
      ];
      const result = filterForbiddenSources(questions);
      expect(result).toHaveLength(1);
    });

    it("keeps questions without sourceUrl", () => {
      const questions = [{ question: "Test?" }];
      const result = filterForbiddenSources(questions);
      expect(result).toHaveLength(1);
    });

    it("handles empty array", () => {
      expect(filterForbiddenSources([])).toEqual([]);
    });
  });

  describe("enrichGeneratedQuestions", () => {
    const mockContext = {
      config: {
        creatorName: "Test User",
        model: "gemini-2.5-flash",
        discipline: "Blueprint",
        tags: ["#test"],
      },
      duration: 5000,
      costPerQuestion: 0.001,
      groundingSources: ["source1", "source2"],
      expectedType: "Multiple Choice",
      requestedDifficulty: "Medium",
    };

    it("adds status pending to all questions", () => {
      const questions = [{ question: "Q1" }, { question: "Q2" }];
      const result = enrichGeneratedQuestions(questions, mockContext);
      expect(result.every((q) => q.status === "pending")).toBe(true);
    });

    it("adds creatorName from config", () => {
      const questions = [{ question: "Q1" }];
      const result = enrichGeneratedQuestions(questions, mockContext);
      expect(result[0].creatorName).toBe("Test User");
    });

    it("adds discipline and type from context", () => {
      const questions = [{ question: "Q1" }];
      const result = enrichGeneratedQuestions(questions, mockContext);
      expect(result[0].discipline).toBe("Blueprint");
      expect(result[0].type).toBe("Multiple Choice");
    });

    it("uses question tags if present, otherwise config tags", () => {
      const questions = [
        { question: "Q1", tags: ["#custom"] },
        { question: "Q2", tags: [] },
      ];
      const result = enrichGeneratedQuestions(questions, mockContext);
      expect(result[0].tags).toContain("#custom");
      expect(result[1].tags).toContain("#test");
    });

    it("adds generation metadata", () => {
      const questions = [{ question: "Q1" }];
      const result = enrichGeneratedQuestions(questions, mockContext);
      expect(result[0].estimatedCost).toBe(0.001);
      expect(result[0].generationTime).toBe(5000);
      expect(result[0].model).toBe("gemini-2.5-flash");
    });
  });
});
