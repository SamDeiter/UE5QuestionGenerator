/**
 * stringHelpers - Tests for string utility functions
 * Pure functions, no React dependencies
 */
import { describe, it, expect } from "vitest";
import {
  chunkArray,
  textSimilarity,
  computeWordDiff,
  renderMarkdown,
  stripHtmlTags,
  safe,
  parseCSVLine,
} from "../stringHelpers";

describe("stringHelpers", () => {
  describe("chunkArray", () => {
    it("splits array into chunks of specified size", () => {
      const result = chunkArray([1, 2, 3, 4, 5], 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("handles array smaller than chunk size", () => {
      const result = chunkArray([1, 2], 5);
      expect(result).toEqual([[1, 2]]);
    });

    it("handles empty array", () => {
      const result = chunkArray([], 3);
      expect(result).toEqual([]);
    });

    it("handles chunk size of 1", () => {
      const result = chunkArray([1, 2, 3], 1);
      expect(result).toEqual([[1], [2], [3]]);
    });
  });

  describe("textSimilarity", () => {
    it("returns 1 for identical strings", () => {
      expect(textSimilarity("hello world", "hello world")).toBe(1);
    });

    it("returns 0 for empty strings", () => {
      expect(textSimilarity("", "hello")).toBe(0);
      expect(textSimilarity("hello", "")).toBe(0);
    });

    it("returns 0 for null/undefined", () => {
      expect(textSimilarity(null, "hello")).toBe(0);
      expect(textSimilarity("hello", undefined)).toBe(0);
    });

    it("is case insensitive", () => {
      expect(textSimilarity("Hello World", "hello world")).toBe(1);
    });

    it("strips HTML tags before comparing", () => {
      expect(textSimilarity("<p>hello</p>", "hello")).toBe(1);
    });

    it("returns high similarity for similar strings", () => {
      const similarity = textSimilarity("hello world", "hello worlds");
      expect(similarity).toBeGreaterThan(0.8);
    });

    it("returns low similarity for different strings", () => {
      const similarity = textSimilarity("hello", "goodbye");
      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe("computeWordDiff", () => {
    it("returns empty array for empty inputs", () => {
      expect(computeWordDiff("", "")).toEqual([]);
    });

    it("marks all as added when old is empty", () => {
      const result = computeWordDiff("", "new text");
      expect(result).toEqual([{ type: "added", text: "new text" }]);
    });

    it("marks all as removed when new is empty", () => {
      const result = computeWordDiff("old text", "");
      expect(result).toEqual([{ type: "removed", text: "old text" }]);
    });

    it("marks identical text as unchanged", () => {
      const result = computeWordDiff("same text", "same text");
      expect(result).toEqual([{ type: "unchanged", text: "same text" }]);
    });

    it("detects added words", () => {
      const result = computeWordDiff("hello", "hello world");
      expect(result.some((s) => s.type === "added")).toBe(true);
    });

    it("detects removed words", () => {
      const result = computeWordDiff("hello world", "hello");
      expect(result.some((s) => s.type === "removed")).toBe(true);
    });
  });

  describe("renderMarkdown", () => {
    it("returns empty string for null/undefined", () => {
      expect(renderMarkdown(null)).toBe("");
      expect(renderMarkdown(undefined)).toBe("");
    });

    it("converts bold markdown to HTML", () => {
      const result = renderMarkdown("**bold text**");
      expect(result).toContain("strong");
      expect(result).toContain("bold text");
    });

    it("converts inline code to HTML", () => {
      const result = renderMarkdown("`code`");
      expect(result).toContain("code");
      expect(result).toContain("<code");
    });

    it("preserves plain text", () => {
      const result = renderMarkdown("plain text");
      expect(result).toContain("plain text");
    });
  });

  describe("stripHtmlTags", () => {
    it("removes HTML tags", () => {
      expect(stripHtmlTags("<p>hello</p>")).toBe("hello");
    });

    it("handles nested tags", () => {
      expect(stripHtmlTags("<div><span>text</span></div>")).toBe("text");
    });

    it("returns non-string values unchanged", () => {
      expect(stripHtmlTags(123)).toBe(123);
      expect(stripHtmlTags(null)).toBe(null);
    });

    it("handles text with attributes", () => {
      expect(stripHtmlTags('<p class="test">hello</p>')).toBe("hello");
    });
  });

  describe("safe", () => {
    it("wraps text in quotes", () => {
      const result = safe("hello");
      expect(result).toBe('"hello"');
    });

    it("returns empty quotes for null/undefined", () => {
      expect(safe(null)).toBe('""');
      expect(safe(undefined)).toBe('""');
    });

    it("removes HTML tags", () => {
      const result = safe("<p>hello</p>");
      expect(result).toBe('"hello"');
    });

    it("removes quotes from content", () => {
      const result = safe('hello "world"');
      expect(result).not.toContain('""');
    });
  });

  describe("parseCSVLine", () => {
    it("parses simple comma-separated values", () => {
      const result = parseCSVLine("a,b,c");
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("handles quoted values", () => {
      const result = parseCSVLine('"hello","world"');
      expect(result).toEqual(["hello", "world"]);
    });

    it("handles commas inside quotes", () => {
      const result = parseCSVLine('"hello, world",test');
      expect(result).toEqual(["hello, world", "test"]);
    });

    it("handles escaped quotes", () => {
      const result = parseCSVLine('"he said ""hi""",test');
      expect(result).toEqual(['he said "hi"', "test"]);
    });

    it("handles empty cells", () => {
      const result = parseCSVLine("a,,c");
      expect(result).toEqual(["a", "", "c"]);
    });
  });
});
