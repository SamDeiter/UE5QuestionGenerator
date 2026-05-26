/**
 * Tests for scorm/converter.js
 * Directly tests convertQuestionToScormFormat
 */
import { describe, it, expect } from "vitest";
import { convertQuestionToScormFormat } from "../scorm/converter";

describe("scorm/converter", () => {
  describe("convertQuestionToScormFormat", () => {
    it("converts current format (options object + correct key)", () => {
      const question = {
        id: "q1",
        question: "What is Nanite?",
        type: "Multiple Choice",
        difficulty: "Medium",
        options: { a: "Mesh system", b: "Light system", c: "Audio", d: "UI" },
        correct: "a",
      };
      const result = convertQuestionToScormFormat(question);
      expect(result.id).toBe("q1");
      expect(result.text).toBe("What is Nanite?");
      expect(result.type).toBe("Multiple Choice");
      expect(result.choices).toHaveLength(4);
      expect(result.choices[0].correct).toBe(true);
      expect(result.choices[1].correct).toBe(false);
    });

    it("converts legacy format (choices array + correctAnswer text)", () => {
      const question = {
        guid: "legacy-1",
        questionText: "What is Lumen?",
        choices: ["GI System", "Mesh System"],
        correctAnswer: "GI System",
      };
      const result = convertQuestionToScormFormat(question);
      expect(result.id).toBe("legacy-1");
      expect(result.text).toBe("What is Lumen?");
      expect(result.choices).toHaveLength(2);
      expect(result.choices[0].text).toBe("GI System");
      expect(result.choices[0].correct).toBe(true);
    });

    it("prefers question over questionText", () => {
      const question = {
        id: "q2",
        question: "Preferred text",
        questionText: "Legacy text",
        options: { a: "Yes", b: "No" },
        correct: "a",
      };
      const result = convertQuestionToScormFormat(question);
      expect(result.text).toBe("Preferred text");
    });

    it("prefers id over guid", () => {
      const question = {
        id: "id-1",
        guid: "guid-1",
        question: "Test",
        options: { a: "A", b: "B" },
        correct: "a",
      };
      expect(convertQuestionToScormFormat(question).id).toBe("id-1");
    });

    it("returns empty choices for invalid input", () => {
      const question = { question: "No choices" };
      const result = convertQuestionToScormFormat(question);
      expect(result.choices).toEqual([]);
    });

    it("filters empty options", () => {
      const question = {
        id: "q3",
        question: "Test",
        options: { a: "Valid", b: "", c: "Also valid", d: "  " },
        correct: "a",
      };
      const result = convertQuestionToScormFormat(question);
      expect(result.choices).toHaveLength(2);
    });

    it("sanitizes question text (removes markdown)", () => {
      const question = {
        id: "q4",
        question: "What is **Nanite**?",
        options: { a: "A", b: "B" },
        correct: "a",
      };
      const result = convertQuestionToScormFormat(question);
      expect(result.text).toBe("What is Nanite?");
    });

    it("sanitizes choice text", () => {
      const question = {
        id: "q5",
        question: "Test",
        options: { a: "**Bold** answer", b: "Normal" },
        correct: "a",
      };
      const result = convertQuestionToScormFormat(question);
      expect(result.choices[0].text).toBe("Bold answer");
    });

    // True/False specific tests
    describe("True/False handling", () => {
      it("sorts True/False choices: True first, False second", () => {
        const question = {
          id: "tf1",
          question: "Nanite is a mesh system",
          type: "True/False",
          options: { a: "False", b: "True" },
          correct: "b",
        };
        const result = convertQuestionToScormFormat(question);
        expect(result.choices[0].text).toBe("True");
        expect(result.choices[1].text).toBe("False");
      });

      it("filters T/F questions with 4+ choices to only 2", () => {
        const question = {
          id: "tf2",
          question: "Test T/F question",
          type: "True/False",
          options: { a: "True", b: "False", c: "Maybe", d: "Sometimes" },
          correct: "a",
        };
        const result = convertQuestionToScormFormat(question);
        expect(result.choices).toHaveLength(2);
        expect(result.choices[0].text).toBe("True");
        expect(result.choices[1].text).toBe("False");
      });

      it("handles True/False with trailing periods", () => {
        const question = {
          id: "tf3",
          question: "Test",
          type: "Multiple Choice", // not explicitly T/F type
          options: { a: "False.", b: "True." },
          correct: "b",
        };
        const result = convertQuestionToScormFormat(question);
        // normTF detects "True." and "False." as T/F
        expect(result.choices[0].text).toBe("True.");
        expect(result.choices[1].text).toBe("False.");
      });

      it("defaults type to Multiple Choice", () => {
        const question = {
          id: "q6",
          question: "Test",
          options: { a: "A", b: "B" },
          correct: "a",
        };
        expect(convertQuestionToScormFormat(question).type).toBe(
          "Multiple Choice"
        );
      });

      it("defaults difficulty to Intermediate when none is provided", () => {
        const question = {
          id: "q7",
          question: "Test",
          options: { a: "A", b: "B" },
          correct: "a",
        };
        expect(convertQuestionToScormFormat(question).difficulty).toBe(
          "Intermediate"
        );
      });
    });
  });
});
