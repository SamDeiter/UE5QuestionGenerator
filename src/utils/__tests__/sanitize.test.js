/**
 * Tests for sanitize.js - XSS protection utilities
 */
import { describe, it, expect } from "vitest";
import { sanitizeHTML, sanitizeText, sanitizeMarkdown } from "../sanitize";

describe("sanitize utilities", () => {
  describe("sanitizeHTML", () => {
    it("should return an object with __html property", () => {
      const result = sanitizeHTML("<p>Hello</p>");
      expect(result).toHaveProperty("__html");
    });

    it("should allow safe HTML tags", () => {
      const result = sanitizeHTML(
        "<b>Bold</b> <i>Italic</i> <code>code</code>"
      );
      expect(result.__html).toContain("<b>Bold</b>");
      expect(result.__html).toContain("<i>Italic</i>");
      expect(result.__html).toContain("<code>code</code>");
    });

    it("should strip dangerous script tags", () => {
      const result = sanitizeHTML('<script>alert("xss")</script>Hello');
      expect(result.__html).not.toContain("<script>");
      expect(result.__html).not.toContain("alert");
      expect(result.__html).toContain("Hello");
    });

    it("should strip onclick handlers", () => {
      const result = sanitizeHTML('<div onclick="alert(1)">Click</div>');
      expect(result.__html).not.toContain("onclick");
    });

    it("should allow href attributes on links", () => {
      const result = sanitizeHTML('<a href="https://example.com">Link</a>');
      expect(result.__html).toContain('href="https://example.com"');
    });

    it("should strip javascript: URLs", () => {
      /* eslint-disable sonarjs/code-eval -- Testing XSS sanitization requires javascript: strings */
      const result = sanitizeHTML('<a href="javascript:alert(1)">Bad Link</a>');
      expect(result.__html).not.toContain("javascript:");
      /* eslint-enable sonarjs/code-eval */
    });
  });

  describe("sanitizeText", () => {
    it("should return an object with __html property", () => {
      const result = sanitizeText("Hello World");
      expect(result).toHaveProperty("__html");
    });

    it("should be more restrictive than sanitizeHTML", () => {
      const result = sanitizeText('<p>Paragraph</p> <a href="#">Link</a>');
      // sanitizeText should strip <p> and <a> tags (not in allowed list)
      expect(result.__html).not.toContain("<p>");
      expect(result.__html).not.toContain("<a");
    });

    it("should allow basic formatting tags", () => {
      const result = sanitizeText("<b>Bold</b> <em>Emphasis</em>");
      expect(result.__html).toContain("<b>Bold</b>");
      expect(result.__html).toContain("<em>Emphasis</em>");
    });
  });

  describe("sanitizeMarkdown", () => {
    it("should return an object with __html property", () => {
      const result = sanitizeMarkdown("# Header");
      expect(result).toHaveProperty("__html");
    });

    it("should allow heading tags", () => {
      const result = sanitizeMarkdown("<h1>Header 1</h1><h2>Header 2</h2>");
      expect(result.__html).toContain("<h1>Header 1</h1>");
      expect(result.__html).toContain("<h2>Header 2</h2>");
    });

    it("should allow list elements", () => {
      const result = sanitizeMarkdown(
        "<ul><li>Item 1</li><li>Item 2</li></ul>"
      );
      expect(result.__html).toContain("<ul>");
      expect(result.__html).toContain("<li>");
    });

    it("should strip script tags", () => {
      const result = sanitizeMarkdown("<script>evil()</script><p>Safe</p>");
      expect(result.__html).not.toContain("<script>");
      expect(result.__html).toContain("<p>Safe</p>");
    });
  });

  describe("edge cases", () => {
    it("should handle null input gracefully", () => {
      const result = sanitizeHTML(null);
      expect(result.__html).toBe("");
    });

    it("should handle undefined input gracefully", () => {
      const result = sanitizeHTML(undefined);
      expect(result.__html).toBe("");
    });

    it("should handle empty string", () => {
      const result = sanitizeHTML("");
      expect(result.__html).toBe("");
    });
  });
});
