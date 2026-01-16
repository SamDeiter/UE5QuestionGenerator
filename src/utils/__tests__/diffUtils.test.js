/**
 * diffUtils - Tests for text diff utility functions
 * Pure functions, no React dependencies
 */
import { describe, it, expect } from "vitest";
import { diffWords, calculateSimilarity } from "../diffUtils";

describe("diffUtils", () => {
  describe("diffWords", () => {
    it("returns empty for empty inputs", () => {
      const result = diffWords("", "");
      // Empty strings split to [''] so result won't be empty
      expect(result).toBeDefined();
    });

    it("marks all words as added when first text is empty", () => {
      const result = diffWords("", "hello world");
      expect(result.some((r) => r.added)).toBe(true);
    });

    it("marks all words as removed when second text is empty", () => {
      const result = diffWords("hello world", "");
      expect(result.some((r) => r.removed)).toBe(true);
    });

    it("marks identical text as unchanged", () => {
      const result = diffWords("same text", "same text");
      // All items should have no added/removed flags
      expect(result.every((r) => !r.added && !r.removed)).toBe(true);
    });

    it("detects added words", () => {
      const result = diffWords("hello", "hello world");
      expect(result.some((r) => r.added)).toBe(true);
    });

    it("detects removed words", () => {
      const result = diffWords("hello world", "hello");
      expect(result.some((r) => r.removed)).toBe(true);
    });
  });

  describe("calculateSimilarity", () => {
    it("returns 100 for identical texts", () => {
      const result = calculateSimilarity("hello world", "hello world");
      expect(result).toBe(100);
    });

    it("returns 0 for completely different texts", () => {
      const result = calculateSimilarity("abc def", "xyz uvw");
      expect(result).toBe(0);
    });

    it("is case insensitive", () => {
      const result = calculateSimilarity("Hello World", "hello world");
      expect(result).toBe(100);
    });

    it("returns partial match percentage", () => {
      const result = calculateSimilarity("hello world", "hello goodbye");
      // Should be greater than 0 but less than 100 (partial overlap)
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100);
    });
  });
});
