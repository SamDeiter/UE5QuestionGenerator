/* eslint-disable sonarjs/no-nested-functions */
/**
 * Question Normalizer Tests
 *
 * CRITICAL: These tests verify that ALL question formats are properly normalized.
 * This is the single source of truth for question data shapes.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeQuestion,
  normalizeQuestions,
  validateNormalizedQuestion,
  validateNormalizedQuestions,
  isOldFormat,
  isNewFormat,
} from "../questionNormalizer";

describe("Question Normalizer", () => {
  // =====================================================
  // Test Data - Both Firestore Formats
  // =====================================================

  // OLD FORMAT: options object + correct letter
  const oldFormatQuestion = {
    id: "old-123",
    guid: "guid-old-123",
    question: "What is Nanite in Unreal Engine 5?",
    type: "Multiple Choice",
    difficulty: "Medium",
    discipline: "Rendering",
    options: {
      A: "Virtualized geometry system",
      B: "Lighting system",
      C: "Sound system",
      D: "Physics engine",
    },
    correct: "A",
    status: "accepted",
    language: "English",
  };

  // NEW FORMAT: choices array + correctAnswer text
  const newFormatQuestion = {
    id: "new-123",
    guid: "guid-new-123",
    question: "What is Lumen?",
    type: "Multiple Choice",
    difficulty: "Easy",
    discipline: "Lighting",
    choices: [
      "Global illumination",
      "Sound system",
      "Animation tool",
      "Networking",
    ],
    correctAnswer: "Global illumination",
    status: "accepted",
    language: "English",
  };

  // LEGACY FORMAT: questionText field name
  const legacyFormatQuestion = {
    id: "legacy-123",
    questionText: "What is Blueprints?",
    type: "Multiple Choice",
    choices: ["Visual scripting", "Text scripting", "Audio tool"],
    correctAnswer: "Visual scripting",
  };

  // TRUE/FALSE with old format
  const oldFormatTrueFalse = {
    id: "tf-old",
    question: "Nanite is a lighting system.",
    type: "True/False",
    options: { A: "TRUE", B: "FALSE", C: "", D: "" },
    correct: "B",
    difficulty: "Easy",
  };

  // =====================================================
  // normalizeQuestion Tests
  // =====================================================
  describe("normalizeQuestion", () => {
    it("should normalize OLD format (options/correct)", () => {
      const result = normalizeQuestion(oldFormatQuestion);

      expect(result.id).toBe("old-123");
      expect(result.question).toBe("What is Nanite in Unreal Engine 5?");
      expect(result.choices).toEqual([
        "Virtualized geometry system",
        "Lighting system",
        "Sound system",
        "Physics engine",
      ]);
      expect(result.correctAnswer).toBe("Virtualized geometry system");
      expect(result.difficulty).toBe("Medium");
      expect(result._originalFormat).toBe("options");
    });

    it("should normalize NEW format (choices/correctAnswer)", () => {
      const result = normalizeQuestion(newFormatQuestion);

      expect(result.id).toBe("new-123");
      expect(result.question).toBe("What is Lumen?");
      expect(result.choices).toEqual([
        "Global illumination",
        "Sound system",
        "Animation tool",
        "Networking",
      ]);
      expect(result.correctAnswer).toBe("Global illumination");
      expect(result._originalFormat).toBe("choices");
    });

    it("should handle LEGACY format (questionText field)", () => {
      const result = normalizeQuestion(legacyFormatQuestion);

      expect(result.question).toBe("What is Blueprints?");
      expect(result.correctAnswer).toBe("Visual scripting");
    });

    it("should handle True/False with old format", () => {
      const result = normalizeQuestion(oldFormatTrueFalse);

      expect(result.choices).toEqual(["TRUE", "FALSE"]);
      expect(result.correctAnswer).toBe("FALSE");
    });

    it("should filter out empty options", () => {
      const questionWithEmptyOptions = {
        ...oldFormatTrueFalse,
        options: { A: "TRUE", B: "FALSE", C: "", D: "   " },
      };
      const result = normalizeQuestion(questionWithEmptyOptions);

      expect(result.choices).toHaveLength(2);
      expect(result.choices).toEqual(["TRUE", "FALSE"]);
    });

    it("should provide default values for missing fields", () => {
      const minimalQuestion = {
        question: "Test question",
        choices: ["A", "B"],
        correctAnswer: "A",
      };
      const result = normalizeQuestion(minimalQuestion);

      expect(result.type).toBe("Multiple Choice");
      expect(result.difficulty).toBe("Medium");
      expect(result.status).toBe("pending");
      expect(result.language).toBe("English");
    });

    it("should return null for invalid input", () => {
      expect(normalizeQuestion(null)).toBe(null);
      expect(normalizeQuestion(undefined)).toBe(null);
      expect(normalizeQuestion("string")).toBe(null);
    });

    it("should preserve reviewer fields", () => {
      const withReviewer = {
        ...newFormatQuestion,
        reviewerNotes: "Good question",
        reviewedBy: "user@example.com",
        reviewedAt: new Date(),
      };
      const result = normalizeQuestion(withReviewer);

      expect(result.reviewerNotes).toBe("Good question");
      expect(result.reviewedBy).toBe("user@example.com");
    });
  });

  // =====================================================
  // normalizeQuestions Tests (batch)
  // =====================================================
  describe("normalizeQuestions", () => {
    it("should normalize mixed format questions", () => {
      const mixed = [
        oldFormatQuestion,
        newFormatQuestion,
        legacyFormatQuestion,
      ];
      const results = normalizeQuestions(mixed);

      expect(results).toHaveLength(3);
      expect(results[0].correctAnswer).toBe("Virtualized geometry system");
      expect(results[1].correctAnswer).toBe("Global illumination");
      expect(results[2].correctAnswer).toBe("Visual scripting");
    });

    it("should filter out null/invalid questions", () => {
      const withInvalid = [
        oldFormatQuestion,
        null,
        undefined,
        newFormatQuestion,
      ];
      const results = normalizeQuestions(withInvalid);

      expect(results).toHaveLength(2);
    });

    it("should return empty array for invalid input", () => {
      expect(normalizeQuestions(null)).toEqual([]);
      expect(normalizeQuestions("not array")).toEqual([]);
    });
  });

  // =====================================================
  // validateNormalizedQuestion Tests
  // =====================================================
  describe("validateNormalizedQuestion", () => {
    it("should pass valid normalized question", () => {
      const normalized = normalizeQuestion(newFormatQuestion);
      const result = validateNormalizedQuestion(normalized);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing question text", () => {
      const normalized = normalizeQuestion({
        ...newFormatQuestion,
        question: "",
      });
      const result = validateNormalizedQuestion(normalized);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing question text");
    });

    it("should detect insufficient choices", () => {
      const normalized = normalizeQuestion({
        ...newFormatQuestion,
        choices: ["Only one"],
      });
      const result = validateNormalizedQuestion(normalized);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Must have at least 2 choices");
    });

    it("should detect missing correct answer", () => {
      const normalized = normalizeQuestion({
        ...newFormatQuestion,
        correctAnswer: undefined,
      });
      const result = validateNormalizedQuestion(normalized);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing correct answer");
    });

    it("should detect correct answer not in choices", () => {
      const normalized = normalizeQuestion({
        ...newFormatQuestion,
        correctAnswer: "Not in list",
      });
      const result = validateNormalizedQuestion(normalized);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Correct answer not found in choices");
    });
  });

  // =====================================================
  // validateNormalizedQuestions Tests (batch)
  // =====================================================
  describe("validateNormalizedQuestions", () => {
    it("should validate batch of questions", () => {
      const questions = normalizeQuestions([
        oldFormatQuestion,
        newFormatQuestion,
      ]);
      const result = validateNormalizedQuestions(questions);

      expect(result.valid).toBe(true);
      expect(result.validCount).toBe(2);
      expect(result.invalidCount).toBe(0);
    });

    it("should report mixed valid/invalid", () => {
      const badQuestion = { question: "", choices: ["A"], correctAnswer: "B" };
      const questions = normalizeQuestions([newFormatQuestion, badQuestion]);
      const result = validateNormalizedQuestions(questions);

      expect(result.valid).toBe(false);
      expect(result.validCount).toBe(1);
      expect(result.invalidCount).toBe(1);
    });
  });

  // =====================================================
  // Format Detection Tests
  // =====================================================
  describe("Format Detection", () => {
    it("should detect old format", () => {
      expect(isOldFormat(oldFormatQuestion)).toBe(true);
      expect(isOldFormat(newFormatQuestion)).toBeFalsy();
    });

    it("should detect new format", () => {
      expect(isNewFormat(newFormatQuestion)).toBe(true);
      expect(isNewFormat(oldFormatQuestion)).toBeFalsy();
      expect(isNewFormat(null)).toBeFalsy();
    });
  });
});
