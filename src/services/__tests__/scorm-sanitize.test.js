/**
 * Tests for scorm/sanitize.js
 * Directly tests sanitizeQuestionText, isEnglishText, filterEnglishQuestions
 */
import { describe, it, expect } from "vitest";
import {
  sanitizeQuestionText,
  isEnglishText,
  filterEnglishQuestions,
} from "../scorm/sanitize";

describe("scorm/sanitize", () => {
  describe("sanitizeQuestionText", () => {
    it("returns empty string for null/undefined input", () => {
      expect(sanitizeQuestionText(null)).toBe("");
      expect(sanitizeQuestionText(undefined)).toBe("");
      expect(sanitizeQuestionText("")).toBe("");
    });

    it("returns empty string for non-string input", () => {
      expect(sanitizeQuestionText(123)).toBe("");
      expect(sanitizeQuestionText({})).toBe("");
    });

    it("removes markdown bold formatting (**text**)", () => {
      expect(sanitizeQuestionText("What is **Nanite**?")).toBe(
        "What is Nanite?"
      );
    });

    it("removes markdown bold formatting (__text__)", () => {
      expect(sanitizeQuestionText("What is __Lumen__?")).toBe("What is Lumen?");
    });

    it("removes trailing asterisks", () => {
      expect(sanitizeQuestionText("FLWC*")).toBe("FLWC");
      expect(sanitizeQuestionText("test***")).toBe("test");
    });

    it("normalizes multiple spaces to single space", () => {
      expect(sanitizeQuestionText("too   many    spaces")).toBe(
        "too many spaces"
      );
    });

    it("decodes common HTML entities", () => {
      expect(sanitizeQuestionText("A &amp; B")).toBe("A & B");
      expect(sanitizeQuestionText("&lt;div&gt;")).toBe("<div>");
      expect(sanitizeQuestionText("&quot;hello&quot;")).toBe('"hello"');
    });

    it("removes unknown HTML entities", () => {
      expect(sanitizeQuestionText("test &unknown; value")).toBe("test value");
    });

    it("decodes numeric HTML entities", () => {
      expect(sanitizeQuestionText("non&#160;breaking")).toBe("non breaking");
    });

    it("decodes hex HTML entities", () => {
      expect(sanitizeQuestionText("hex&#xA0;space")).toBe("hex space");
    });

    it("trims leading and trailing whitespace", () => {
      expect(sanitizeQuestionText("  hello  ")).toBe("hello");
    });
  });

  describe("isEnglishText", () => {
    it("returns true for English text", () => {
      expect(isEnglishText("What is Unreal Engine?")).toBe(true);
    });

    it("returns true for null/undefined/empty", () => {
      expect(isEnglishText(null)).toBe(true);
      expect(isEnglishText(undefined)).toBe(true);
      expect(isEnglishText("")).toBe(true);
    });

    it("returns false for Korean text", () => {
      expect(isEnglishText("언리얼 엔진이란?")).toBe(false);
    });

    it("returns false for Chinese text", () => {
      expect(isEnglishText("什么是虚幻引擎？")).toBe(false);
    });

    it("returns false for Japanese text", () => {
      expect(isEnglishText("アンリアルエンジンとは？")).toBe(false);
    });

    it("returns false for Cyrillic text", () => {
      expect(isEnglishText("Что такое Unreal Engine?")).toBe(false);
    });

    it("returns true for text with numbers and symbols", () => {
      expect(isEnglishText("UE5 v5.3 (2024) - $100")).toBe(true);
    });
  });

  describe("filterEnglishQuestions", () => {
    it("returns empty for null/undefined input", () => {
      expect(filterEnglishQuestions(null)).toEqual({
        filtered: [],
        skipped: 0,
      });
      expect(filterEnglishQuestions(undefined)).toEqual({
        filtered: [],
        skipped: 0,
      });
    });

    it("returns empty for non-array input", () => {
      expect(filterEnglishQuestions("not an array")).toEqual({
        filtered: [],
        skipped: 0,
      });
    });

    it("keeps English questions", () => {
      const questions = [
        { question: "What is Nanite?", options: { a: "Mesh", b: "Light" } },
      ];
      const result = filterEnglishQuestions(questions);
      expect(result.filtered).toHaveLength(1);
      expect(result.skipped).toBe(0);
    });

    it("filters non-English questions", () => {
      const questions = [
        { question: "What is Nanite?", options: { a: "Mesh", b: "Light" } },
        {
          question: "나나이트란 무엇인가?",
          options: { a: "메시", b: "라이트" },
        },
      ];
      const result = filterEnglishQuestions(questions);
      expect(result.filtered).toHaveLength(1);
      expect(result.skipped).toBe(1);
    });

    it("handles legacy questionText field", () => {
      const questions = [
        {
          questionText: "What is Lumen?",
          choices: ["GI System", "Mesh System"],
        },
      ];
      const result = filterEnglishQuestions(questions);
      expect(result.filtered).toHaveLength(1);
    });
  });
});
