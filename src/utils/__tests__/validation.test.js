/**
 * validation - Tests for input validation utility functions
 * Pure functions, no React dependencies
 */
import { describe, it, expect } from "vitest";
import {
  validateQuestion,
  validateConfig,
  sanitizeInput,
  validateQuestionBatch,
} from "../validation";

describe("validation", () => {
  describe("validateQuestion", () => {
    const validQuestion = {
      question: "What is the Blueprint Editor in Unreal Engine 5?",
      correctAnswer: "A visual scripting tool for creating game logic",
      options: ["Option A", "Option B", "Option C", "Option D"],
      discipline: "Blueprint",
    };

    it("accepts a valid question", () => {
      const result = validateQuestion(validQuestion);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects question without question text", () => {
      const q = { ...validQuestion, question: undefined };
      const result = validateQuestion(q);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Question text is required");
    });

    it("rejects question text shorter than 10 characters", () => {
      const q = { ...validQuestion, question: "Short" };
      const result = validateQuestion(q);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("at least 10"))).toBe(true);
    });

    it("rejects question text with script tags", () => {
      const q = {
        ...validQuestion,
        question: "<script>alert('xss')</script>What is Blueprint?",
      };
      const result = validateQuestion(q);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("invalid content"))).toBe(
        true
      );
    });

    it("rejects missing correctAnswer", () => {
      const q = { ...validQuestion, correctAnswer: undefined };
      const result = validateQuestion(q);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Correct answer is required");
    });

    it("rejects too few options", () => {
      const q = { ...validQuestion, options: ["Only one"] };
      const result = validateQuestion(q);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("2-6 options"))).toBe(true);
    });

    it("rejects too many options", () => {
      const q = {
        ...validQuestion,
        options: ["A", "B", "C", "D", "E", "F", "G"],
      };
      const result = validateQuestion(q);
      expect(result.valid).toBe(false);
    });

    it("validates discipline", () => {
      const q = { ...validQuestion, discipline: "InvalidDiscipline" };
      const result = validateQuestion(q);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Invalid discipline"))).toBe(
        true
      );
    });

    it("accepts valid disciplines", () => {
      const disciplines = ["Blueprint", "Niagara", "Material", "Animation"];
      disciplines.forEach((discipline) => {
        const q = { ...validQuestion, discipline };
        const result = validateQuestion(q);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe("validateConfig", () => {
    it("accepts empty config", () => {
      const result = validateConfig({});
      expect(result.valid).toBe(true);
    });

    it("rejects creator name too long", () => {
      const config = { creatorName: "a".repeat(101) };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("too long"))).toBe(true);
    });

    it("validates API key length", () => {
      const config = { apiKey: "short" };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("format"))).toBe(true);
    });

    it("accepts valid API key length", () => {
      const config = { apiKey: "a".repeat(50) };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it("validates Sheet URL format", () => {
      const config = { sheetUrl: "not-a-url" };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
    });

    it("rejects non-Google Sheet URL", () => {
      const config = { sheetUrl: "https://example.com/sheet" };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Google Sheets"))).toBe(true);
    });

    it("accepts valid Google Sheet URL", () => {
      const config = {
        sheetUrl: "https://docs.google.com/spreadsheets/d/abc123",
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });
  });

  describe("sanitizeInput", () => {
    it("returns empty string for non-string input", () => {
      expect(sanitizeInput(null)).toBe("");
      expect(sanitizeInput(undefined)).toBe("");
      expect(sanitizeInput(123)).toBe("");
    });

    it("trims whitespace", () => {
      expect(sanitizeInput("  hello  ")).toBe("hello");
    });

    it("removes null bytes", () => {
      expect(sanitizeInput("hello\0world")).toBe("helloworld");
    });

    it("limits string length", () => {
      const longString = "a".repeat(20000);
      const result = sanitizeInput(longString);
      expect(result.length).toBe(10000);
    });

    it("preserves normal text", () => {
      expect(sanitizeInput("Hello World")).toBe("Hello World");
    });
  });

  describe("validateQuestionBatch", () => {
    const validQ = {
      question: "What is the Blueprint Editor?",
      correctAnswer: "A visual scripting tool",
      options: ["A", "B", "C", "D"],
    };

    it("returns all valid questions", () => {
      const questions = [validQ, { ...validQ, question: "Second question" }];
      const result = validateQuestionBatch(questions);
      expect(result.validQuestions).toHaveLength(2);
      expect(result.invalidQuestions).toHaveLength(0);
    });

    it("separates invalid questions with errors", () => {
      const questions = [
        validQ,
        { question: "" }, // Invalid
        { ...validQ, question: "Third question" },
      ];
      const result = validateQuestionBatch(questions);
      expect(result.validQuestions).toHaveLength(2);
      expect(result.invalidQuestions).toHaveLength(1);
      expect(result.invalidQuestions[0].index).toBe(1);
      expect(result.invalidQuestions[0].errors.length).toBeGreaterThan(0);
    });

    it("handles empty array", () => {
      const result = validateQuestionBatch([]);
      expect(result.validQuestions).toHaveLength(0);
      expect(result.invalidQuestions).toHaveLength(0);
    });
  });
});
