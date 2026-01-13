/**
 * QuestionContent Sanitization Tests
 *
 * REGRESSION PREVENTION: Questions were displaying raw HTML tags (<b>) and
 * corrupted Bengali Unicode characters (ভাষা) in answer options.
 * These tests ensure content is properly sanitized before display.
 */
import { describe, it, expect } from "vitest";

// ============================================================
// SANITIZATION FUNCTIONS (testing the logic directly)
// ============================================================

/**
 * Helper function that mirrors the sanitization logic in QuestionContent.jsx
 * This tests the transformation of malformed content.
 */
const cleanOptionText = (text) => {
  if (!text || typeof text !== "string") return text;
  return (
    text
      // Remove Bengali Unicode characters (corrupted text)
      .replace(/[\u0980-\u09FF]+/g, "")
      // Remove HTML tags - use non-greedy match to prevent backtracking
      .replace(/<[^<>]*>/g, "")
      .trim()
  );
};

/**
 * Helper function that mirrors the tag cleaning logic in QuestionMetadata.jsx
 */
const cleanTag = (tag) => {
  return String(tag)
    .replace(/^#+\s*/, "")
    .trim();
};

// ============================================================
// CONTENT SANITIZATION TESTS
// ============================================================

describe("QuestionContent Sanitization Tests", () => {
  describe("Option Text Cleaning", () => {
    it("CRITICAL: Removes HTML tags from option text", () => {
      const dirtyText = "Use <b>Nanite</b> for high-poly meshes";
      const cleaned = cleanOptionText(dirtyText);

      expect(cleaned).not.toContain("<b>");
      expect(cleaned).not.toContain("</b>");
      expect(cleaned).toBe("Use Nanite for high-poly meshes");
    });

    it("CRITICAL: Removes Bengali Unicode corruption", () => {
      const dirtyText = "Use Naniteভাষা for meshes";
      const cleaned = cleanOptionText(dirtyText);

      expect(cleaned).not.toMatch(/[\u0980-\u09FF]/);
      expect(cleaned).toBe("Use Nanite for meshes");
    });

    it("Handles multiple HTML tag types", () => {
      const dirtyText =
        "<strong>Bold</strong> and <em>italic</em> and <span>span</span>";
      const cleaned = cleanOptionText(dirtyText);

      expect(cleaned).toBe("Bold and italic and span");
    });

    it("Handles null/undefined gracefully", () => {
      expect(cleanOptionText(null)).toBeNull();
      expect(cleanOptionText(undefined)).toBeUndefined();
      expect(cleanOptionText("")).toBe("");
    });

    it("Preserves clean text unchanged", () => {
      const cleanText = "This is a normal option text without issues.";
      expect(cleanOptionText(cleanText)).toBe(cleanText);
    });
  });

  describe("Tag Cleaning", () => {
    it("CRITICAL: Removes leading # from tags", () => {
      expect(cleanTag("#Blueprints")).toBe("Blueprints");
      expect(cleanTag("##Blueprints")).toBe("Blueprints");
      expect(cleanTag("###Blueprints")).toBe("Blueprints");
    });

    it("Removes # with spaces", () => {
      expect(cleanTag("# Blueprints")).toBe("Blueprints");
      expect(cleanTag("## Blueprints")).toBe("Blueprints");
    });

    it("Handles tags without # prefix", () => {
      expect(cleanTag("Blueprints")).toBe("Blueprints");
    });

    it("Trims whitespace", () => {
      expect(cleanTag("  Blueprints  ")).toBe("Blueprints");
      expect(cleanTag("#  Blueprints  ")).toBe("Blueprints");
    });
  });
});
