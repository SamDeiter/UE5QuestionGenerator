/**
 * contextOptimizer - Tests for context optimization utilities
 * Pure functions for reducing token usage
 */
import { describe, it, expect } from "vitest";
import {
  extractRelevantExcerpts,
  optimizeContext,
  processMultipleFiles,
  analyzeOptimization,
} from "../contextOptimizer";

describe("contextOptimizer", () => {
  describe("extractRelevantExcerpts", () => {
    it("returns empty array for null/undefined text", () => {
      expect(extractRelevantExcerpts(null, "Blueprints")).toEqual([]);
      expect(extractRelevantExcerpts(undefined, "Blueprints")).toEqual([]);
      expect(extractRelevantExcerpts("", "Blueprints")).toEqual([]);
    });

    it("extracts chunks containing discipline keywords", () => {
      const text = `
        This is about blueprints and visual scripting.
        The blueprint editor allows you to create nodes.
        This paragraph is about unrelated topics.
      `;
      const result = extractRelevantExcerpts(text, "Blueprints", 2);
      // Should extract chunks with blueprint-related keywords
      expect(result.length).toBeGreaterThan(0);
    });

    it("returns empty when no keywords match", () => {
      const text = "This is completely unrelated content with no keywords.";
      const result = extractRelevantExcerpts(text, "Blueprints", 2);
      expect(result).toEqual([]);
    });

    it("respects maxExcerpts parameter", () => {
      const text = `
        Blueprint node creation.
        Blueprint event handling.
        Blueprint function calls.
        Blueprint variable access.
        Blueprint interface usage.
      `;
      const result = extractRelevantExcerpts(text, "Blueprints", 2);
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe("optimizeContext", () => {
    it("returns empty string for null/undefined input", () => {
      expect(optimizeContext(null, "Blueprints")).toBe("");
      expect(optimizeContext("", "Blueprints")).toBe("");
    });

    it("returns original content if under token limit", () => {
      const shortContent = "Short content about blueprints.";
      const result = optimizeContext(shortContent, "Blueprints");
      expect(result).toBe(shortContent);
    });

    it("truncates very long content", () => {
      const longContent = "blueprint ".repeat(10000);
      const result = optimizeContext(longContent, "Blueprints");
      expect(result.length).toBeLessThan(longContent.length);
    });
  });

  describe("processMultipleFiles", () => {
    it("returns empty string for null/empty files", () => {
      expect(processMultipleFiles(null, "Blueprints")).toBe("");
      expect(processMultipleFiles([], "Blueprints")).toBe("");
    });

    it("adds file headers", () => {
      const files = [{ name: "test.txt", content: "Blueprint content" }];
      const result = processMultipleFiles(files, "Blueprints");
      expect(result).toContain("## test.txt");
    });

    it("combines multiple files", () => {
      const files = [
        { name: "file1.txt", content: "Blueprint content 1" },
        { name: "file2.txt", content: "Blueprint content 2" },
      ];
      const result = processMultipleFiles(files, "Blueprints");
      expect(result).toContain("## file1.txt");
      expect(result).toContain("## file2.txt");
    });
  });

  describe("analyzeOptimization", () => {
    it("returns analysis object with all properties", () => {
      const original = "This is the original content about blueprints.";
      const optimized = "Blueprints.";
      const result = analyzeOptimization(original, optimized);

      expect(result).toHaveProperty("original");
      expect(result).toHaveProperty("optimized");
      expect(result).toHaveProperty("reduction");
      expect(result).toHaveProperty("withinLimit");
    });

    it("calculates reduction percentage correctly", () => {
      const original = "x".repeat(1000);
      const optimized = "x".repeat(500);
      const result = analyzeOptimization(original, optimized);

      expect(result.reduction.percentage).toBe(50);
      expect(result.reduction.chars).toBe(500);
    });

    it("handles empty strings", () => {
      const result = analyzeOptimization("", "");
      expect(result.original.chars).toBe(0);
      expect(result.optimized.chars).toBe(0);
      expect(result.reduction.percentage).toBe(0);
    });

    it("reports withinLimit correctly", () => {
      const shortContent = "Short";
      const result = analyzeOptimization(shortContent, shortContent);
      expect(result.withinLimit).toBe(true);
    });
  });
});
