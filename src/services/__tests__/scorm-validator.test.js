/**
 * Tests for scorm/validator.js
 * Directly tests validateQuestionsForExport
 */
import { describe, it, expect } from "vitest";
import { validateQuestionsForExport } from "../scorm/validator";

describe("scorm/validator", () => {
  describe("validateQuestionsForExport", () => {
    it("returns invalid for null input", () => {
      const result = validateQuestionsForExport(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("No questions selected for export");
    });

    it("returns invalid for empty array", () => {
      const result = validateQuestionsForExport([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("No questions selected for export");
    });

    it("returns valid for well-formed questions (current format)", () => {
      const questions = [
        {
          question: "What is Nanite?",
          options: { a: "Mesh system", b: "Light" },
          correct: "a",
        },
        {
          question: "What is Lumen?",
          options: { a: "GI", b: "Audio" },
          correct: "a",
        },
        {
          question: "What is Niagara?",
          options: { a: "Particles", b: "Mesh" },
          correct: "a",
        },
        {
          question: "What is MetaSounds?",
          options: { a: "Audio", b: "Visual" },
          correct: "a",
        },
        {
          question: "What is World Partition?",
          options: { a: "Streaming", b: "Audio" },
          correct: "a",
        },
      ];
      const result = validateQuestionsForExport(questions);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("warns when less than 5 questions", () => {
      const questions = [
        {
          question: "What is Nanite?",
          options: { a: "Mesh", b: "Light" },
          correct: "a",
        },
      ];
      const result = validateQuestionsForExport(questions);
      expect(result.valid).toBe(true); // Still valid, just a warning
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("Less than 5");
    });

    it("warns when more than 100 questions", () => {
      const questions = Array.from({ length: 101 }, (_, i) => ({
        question: `Question ${i}`,
        options: { a: "A", b: "B" },
        correct: "a",
      }));
      const result = validateQuestionsForExport(questions);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes("More than 100"))).toBe(
        true
      );
    });

    it("errors on missing question text", () => {
      const questions = [
        { question: "", options: { a: "A", b: "B" }, correct: "a" },
      ];
      const result = validateQuestionsForExport(questions);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Missing question text");
    });

    it("errors on missing choices", () => {
      const questions = [{ question: "What?", correct: "a" }];
      const result = validateQuestionsForExport(questions);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("at least 2 choices");
    });

    it("errors on missing correct answer", () => {
      const questions = [{ question: "What?", options: { a: "A", b: "B" } }];
      const result = validateQuestionsForExport(questions);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Missing correct answer");
    });

    it("errors when legacy correctAnswer not in choices", () => {
      const questions = [
        {
          question: "Test",
          choices: ["A", "B"],
          correctAnswer: "C",
        },
      ];
      const result = validateQuestionsForExport(questions);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Correct answer not found in choices"),
        ])
      );
    });

    it("returns questionCount in result", () => {
      const questions = [
        {
          question: "Test",
          options: { a: "A", b: "B" },
          correct: "a",
        },
      ];
      const result = validateQuestionsForExport(questions);
      expect(result.questionCount).toBe(1);
    });

    it("validates legacy format (questionText + choices)", () => {
      const questions = [
        {
          questionText: "Legacy question",
          choices: ["A", "B", "C"],
          correctAnswer: "A",
        },
      ];
      const result = validateQuestionsForExport(questions);
      expect(result.valid).toBe(true);
    });
  });
});
