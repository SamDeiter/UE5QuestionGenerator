/**
 * Tests for parseQuestion.js
 *
 * Validates that Firestore document parsing correctly handles:
 * - Standard question format
 * - Legacy/alternative field names
 * - Choices array to options object conversion
 * - Firestore Timestamp objects
 * - Missing/null input handling
 */
import { describe, it, expect } from "vitest";
import { parseQuestion, parseQuestions } from "../parseQuestion";

describe("parseQuestion", () => {
  describe("standard format handling", () => {
    it("passes through standard format unchanged", () => {
      const input = {
        question: "What is UE5?",
        options: { A: "Game engine", B: "IDE", C: "Language", D: "Framework" },
        correct: "A",
        difficulty: "Easy",
        discipline: "General",
      };

      const result = parseQuestion(input);

      expect(result.question).toBe("What is UE5?");
      expect(result.options).toEqual(input.options);
      expect(result.correct).toBe("A");
    });

    it("includes document ID when provided", () => {
      const input = { question: "Test question" };
      const docId = "abc123";

      const result = parseQuestion(input, docId);

      expect(result.id).toBe("abc123");
      expect(result.uniqueId).toBe("abc123");
    });
  });

  describe("field alias conversion", () => {
    it("converts questionText to question", () => {
      const input = { questionText: "What is Blueprints?" };

      const result = parseQuestion(input);

      expect(result.question).toBe("What is Blueprints?");
      expect(result.questionText).toBe("What is Blueprints?"); // Original preserved
    });

    it("does not override existing canonical field", () => {
      const input = {
        question: "Canonical",
        questionText: "Alias",
      };

      const result = parseQuestion(input);

      expect(result.question).toBe("Canonical");
    });

    it("converts dateAdded to timestamp", () => {
      const input = { dateAdded: "2024-01-15T10:00:00Z" };

      const result = parseQuestion(input);

      expect(result.timestamp).toBe("2024-01-15T10:00:00Z");
    });
  });

  describe("choices array conversion", () => {
    it("converts choices array to options object", () => {
      const input = {
        question: "Test",
        choices: ["Option A", "Option B", "Option C", "Option D"],
      };

      const result = parseQuestion(input);

      expect(result.options).toEqual({
        A: "Option A",
        B: "Option B",
        C: "Option C",
        D: "Option D",
      });
    });

    it("finds correct letter from correctAnswer text", () => {
      const input = {
        question: "Test question",
        choices: ["Wrong", "Wrong", "Correct Answer", "Wrong"],
        correctAnswer: "Correct Answer",
      };

      const result = parseQuestion(input);

      expect(result.correct).toBe("C");
      expect(result.options.C).toBe("Correct Answer");
    });

    it("handles partial choices array", () => {
      const input = {
        choices: ["Only A", "Only B"],
      };

      const result = parseQuestion(input);

      expect(result.options).toEqual({
        A: "Only A",
        B: "Only B",
        C: "",
        D: "",
      });
    });

    it("does not override existing options", () => {
      const input = {
        choices: ["From choices"],
        options: { A: "From options", B: "", C: "", D: "" },
      };

      const result = parseQuestion(input);

      expect(result.options.A).toBe("From options");
    });
  });

  describe("Firestore Timestamp handling", () => {
    it("converts Firestore Timestamp to ISO string", () => {
      const mockDate = new Date("2024-06-15T12:30:00Z");
      const firestoreTimestamp = {
        toDate: () => mockDate,
      };

      const input = { timestamp: firestoreTimestamp };

      const result = parseQuestion(input);

      expect(result.timestamp).toBe("2024-06-15T12:30:00.000Z");
    });

    it("handles firestoreUpdatedAt Timestamp", () => {
      const mockDate = new Date("2024-07-20T08:00:00Z");
      const input = {
        firestoreUpdatedAt: { toDate: () => mockDate },
      };

      const result = parseQuestion(input);

      expect(result.firestoreUpdatedAt).toBe("2024-07-20T08:00:00.000Z");
    });
  });

  describe("edge cases", () => {
    it("returns null for null input", () => {
      expect(parseQuestion(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(parseQuestion(undefined)).toBeNull();
    });

    it("returns null for non-object input", () => {
      expect(parseQuestion("string")).toBeNull();
      expect(parseQuestion(123)).toBeNull();
    });

    it("handles empty object", () => {
      const result = parseQuestion({});
      expect(result).toEqual({});
    });

    it("preserves unknown fields", () => {
      const input = {
        question: "Test",
        customField: "custom value",
        anotherCustom: 42,
      };

      const result = parseQuestion(input);

      expect(result.customField).toBe("custom value");
      expect(result.anotherCustom).toBe(42);
    });
  });
});

describe("parseQuestions", () => {
  it("parses array of documents", () => {
    const docs = [{ question: "Q1" }, { question: "Q2" }, { question: "Q3" }];

    const result = parseQuestions(docs);

    expect(result).toHaveLength(3);
    expect(result[0].question).toBe("Q1");
    expect(result[2].question).toBe("Q3");
  });

  it("filters out null results", () => {
    const docs = [{ question: "Valid" }, null, { question: "Also valid" }];

    const result = parseQuestions(docs);

    expect(result).toHaveLength(2);
  });

  it("returns empty array for non-array input", () => {
    expect(parseQuestions(null)).toEqual([]);
    expect(parseQuestions(undefined)).toEqual([]);
    expect(parseQuestions("string")).toEqual([]);
  });

  it("uses getDocId function when provided", () => {
    const docs = [
      { data: { question: "Q1" }, docId: "doc1" },
      { data: { question: "Q2" }, docId: "doc2" },
    ];

    const result = parseQuestions(
      docs.map((d) => d.data),
      (_, index) => docs[index].docId
    );

    expect(result[0].id).toBe("doc1");
    expect(result[1].id).toBe("doc2");
  });
});
