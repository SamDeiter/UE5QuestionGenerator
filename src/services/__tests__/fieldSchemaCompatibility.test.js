/* eslint-disable sonarjs/no-nested-functions */
/**
 * Field Schema Compatibility Tests
 *
 * CRITICAL: These tests verify that SCORM export uses correct Firestore field names.
 *
 * FIRESTORE QUESTION SCHEMA (source of truth):
 * {
 *   id: string,              // Firestore document ID
 *   guid: string,            // Unique question identifier
 *   question: string,        // The question text (NOT 'questionText')
 *   type: string,            // "Multiple Choice" | "True/False"
 *   difficulty: string,      // "Easy" | "Medium" | "Hard"
 *   discipline: string,      // Category/topic
 *   choices: string[],       // Array of answer options
 *   correctAnswer: string,   // The correct choice (must be in choices)
 *   status: string,          // "pending" | "accepted" | "rejected"
 *   language: string,        // "English" | etc.
 * }
 */
import { describe, it, expect } from "vitest";
import {
  convertQuestionToScormFormat,
  validateQuestionsForExport,
} from "../scormExporter";

describe("Field Schema Compatibility", () => {
  describe("SCORM Exporter - Question Field Support", () => {
    it("CRITICAL: should handle 'question' field (Firestore format)", () => {
      const firestoreQuestion = {
        guid: "test-guid",
        question: "What is Nanite?", // Firestore field name
        type: "Multiple Choice",
        choices: ["A", "B", "C"],
        correctAnswer: "A",
      };

      const result = convertQuestionToScormFormat(firestoreQuestion);
      expect(result.text).toBe("What is Nanite?");
    });

    it("should handle legacy 'questionText' field (backward compatibility)", () => {
      const legacyQuestion = {
        guid: "legacy-guid",
        questionText: "Legacy question", // Old field name
        type: "Multiple Choice",
        choices: ["A", "B", "C"],
        correctAnswer: "A",
      };

      const result = convertQuestionToScormFormat(legacyQuestion);
      expect(result.text).toBe("Legacy question");
    });

    it("should prefer 'question' over 'questionText' when both exist", () => {
      const mixedQuestion = {
        guid: "mixed-guid",
        question: "Preferred text",
        questionText: "Legacy text",
        type: "Multiple Choice",
        choices: ["A", "B", "C"],
        correctAnswer: "A",
      };

      const result = convertQuestionToScormFormat(mixedQuestion);
      expect(result.text).toBe("Preferred text");
    });
  });

  describe("Validator - Question Field Support", () => {
    it("CRITICAL: should validate 'question' field (Firestore format)", () => {
      const firestoreQuestion = {
        question: "Valid question text",
        choices: ["A", "B", "C"],
        correctAnswer: "A",
      };

      const result = validateQuestionsForExport([firestoreQuestion]);
      expect(result.valid).toBe(true);
    });

    it("should validate legacy 'questionText' field", () => {
      const legacyQuestion = {
        questionText: "Valid question text",
        choices: ["A", "B", "C"],
        correctAnswer: "A",
      };

      const result = validateQuestionsForExport([legacyQuestion]);
      expect(result.valid).toBe(true);
    });

    it("should reject when neither field exists", () => {
      const noTextField = {
        choices: ["A", "B", "C"],
        correctAnswer: "A",
      };

      const result = validateQuestionsForExport([noTextField]);
      expect(result.valid).toBe(false);
      expect(result.errors.join(" ")).toContain("Missing question text");
    });
  });

  describe("Required Field Coverage", () => {
    it("should export all required SCORM fields", () => {
      const firestoreQuestion = {
        guid: "test-guid",
        question: "Test question text",
        type: "Multiple Choice",
        difficulty: "Medium",
        choices: ["A", "B", "C"],
        correctAnswer: "A",
      };

      const result = convertQuestionToScormFormat(firestoreQuestion);

      // Verify essential fields are exported
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("choices");
      expect(result).toHaveProperty("difficulty");

      // Verify values are correct
      expect(result.text).toBe("Test question text");
      expect(result.id).toBe("test-guid");
    });

    it("should mark correct answer in choices array", () => {
      const question = {
        question: "Test",
        choices: ["Wrong1", "Correct", "Wrong2"],
        correctAnswer: "Correct",
      };

      const result = convertQuestionToScormFormat(question);

      const correctChoice = result.choices.find((c) => c.correct === true);
      expect(correctChoice.text).toBe("Correct");

      const wrongChoices = result.choices.filter((c) => c.correct === false);
      expect(wrongChoices).toHaveLength(2);
    });
  });

  describe("Validation Error Detection", () => {
    it("should detect all common validation errors", () => {
      const badQuestion = {
        question: "", // Empty
        choices: ["Only one"], // Too few
        correctAnswer: "Not in list", // Not in choices
      };

      const result = validateQuestionsForExport([badQuestion]);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
      expect(
        result.errors.some((e) => e.includes("Missing question text")),
      ).toBe(true);
      expect(result.errors.some((e) => e.includes("at least 2 choices"))).toBe(
        true,
      );
      expect(
        result.errors.some((e) => e.includes("Correct answer not found")),
      ).toBe(true);
    });
  });

  describe("Difficulty Field Handling", () => {
    it("should preserve difficulty in export", () => {
      const easyQuestion = {
        question: "Easy question",
        difficulty: "Easy",
        choices: ["A", "B"],
        correctAnswer: "A",
      };

      const result = convertQuestionToScormFormat(easyQuestion);
      expect(result.difficulty).toBe("Easy");
    });

    it("should default to 'Medium' when difficulty is missing", () => {
      const noDifficultyQuestion = {
        question: "No difficulty",
        choices: ["A", "B"],
        correctAnswer: "A",
      };

      const result = convertQuestionToScormFormat(noDifficultyQuestion);
      expect(result.difficulty).toBe("Medium");
    });
  });
});

describe("Quiz Logic Compatibility", () => {
  describe("Standard Values", () => {
    it("should recognize standard difficulty values", () => {
      const standardDifficulties = ["Easy", "Medium", "Hard"];
      standardDifficulties.forEach((diff) => {
        const q = {
          question: "Test",
          difficulty: diff,
          choices: ["A", "B"],
          correctAnswer: "A",
        };
        const result = convertQuestionToScormFormat(q);
        expect(result.difficulty).toBe(diff);
      });
    });

    it("should handle all question types", () => {
      const types = ["Multiple Choice", "True/False"];
      types.forEach((type) => {
        const q = {
          question: "Test",
          type: type,
          choices: type === "True/False" ? ["True", "False"] : ["A", "B", "C"],
          correctAnswer: type === "True/False" ? "True" : "A",
        };
        const result = convertQuestionToScormFormat(q);
        expect(result.type).toBe(type);
      });
    });
  });
});
