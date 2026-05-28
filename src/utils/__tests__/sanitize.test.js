/**
 * Tests for sanitize.js - XSS protection utilities
 */
import { describe, it, expect } from "vitest";
import { sanitizeToHtmlProps } from "../sanitize";

describe("sanitize utilities", () => {
  describe("sanitizeToHtmlProps", () => {
    it("should return an object with __html property", () => {
      const result = sanitizeToHtmlProps("Hello World");
      expect(result).toHaveProperty("__html");
    });

    it("should strip <p> and <a> tags (not in allowed list)", () => {
      const result = sanitizeToHtmlProps(
        '<p>Paragraph</p> <a href="#">Link</a>'
      );
      expect(result.__html).not.toContain("<p>");
      expect(result.__html).not.toContain("<a");
    });

    it("should allow basic formatting tags", () => {
      const result = sanitizeToHtmlProps("<b>Bold</b> <em>Emphasis</em>");
      expect(result.__html).toContain("<b>Bold</b>");
      expect(result.__html).toContain("<em>Emphasis</em>");
    });
  });
});
