import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  convertQuestionToScormFormat,
  validateQuestionsForExport,
  generateScormPackageFiles,
} from "../scormExporter";

describe("SCORM Exporter Service", () => {
  // --- Test Data ---
  const validQuestion = {
    guid: "q1",
    questionText: "What is Nanite?",
    type: "Multiple Choice",
    difficulty: "Beginner",
    choices: ["Geometry System", "Lighting System", "Sound System"],
    correctAnswer: "Geometry System",
  };

  const invalidQuestion = {
    guid: "q2",
    questionText: "", // Missing text
    type: "Multiple Choice",
    choices: ["A"], // Too few choices
    correctAnswer: "B", // Not in choices
  };

  // --- convertQuestionToScormFormat ---
  describe("convertQuestionToScormFormat", () => {
    it("should transform Firestore question to SCORM format", () => {
      const result = convertQuestionToScormFormat(validQuestion);

      expect(result.id).toBe("q1");
      expect(result.text).toBe("What is Nanite?");
      expect(result.choices).toHaveLength(3);
      expect(result.choices[0]).toEqual({
        text: "Geometry System",
        correct: true,
      });
      expect(result.choices[1]).toEqual({
        text: "Lighting System",
        correct: false,
      });
    });

    it("should handle T/F questions", () => {
      const tfQuestion = {
        questionText: "UE5 is free?",
        type: "True/False",
        choices: ["True", "False"],
        correctAnswer: "True",
      };
      const result = convertQuestionToScormFormat(tfQuestion);
      expect(result.choices).toHaveLength(2);
      expect(result.choices.find((c) => c.text === "True").correct).toBe(true);
    });
  });

  // --- validateQuestionsForExport ---
  describe("validateQuestionsForExport", () => {
    it("should pass valid questions", () => {
      const result = validateQuestionsForExport([validQuestion]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid questions", () => {
      const result = validateQuestionsForExport([invalidQuestion]);
      expect(result.valid).toBe(false);
      const errorText = result.errors.join(" ");
      expect(errorText).toContain("Missing question text");
      expect(errorText).toContain("at least 2 choices");
      expect(errorText).toContain("Correct answer not found");
    });

    it("should warn on low question count", () => {
      const result = validateQuestionsForExport([validQuestion]); // Only 1
      expect(result.valid).toBe(true); // Still valid
      expect(result.warnings).toHaveLength(1);
    });
  });

  // --- generateScormPackageFiles ---
  describe("generateScormPackageFiles", () => {
    // Mock global fetch
    const fetchMock = vi.fn();

    beforeEach(() => {
      global.fetch = fetchMock;
      // Setup default mock response
      fetchMock.mockResolvedValue({
        text: () => Promise.resolve("TEMPLATE_CONTENT"),
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should fetch all template files and generate questions.js", async () => {
      const config = {
        title: "Test Quiz",
        passingScore: 70,
        timeLimit: 15,
      };

      const files = await generateScormPackageFiles([validQuestion], config);

      // Verify fetch calls
      expect(fetchMock).toHaveBeenCalledTimes(5);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("imsmanifest.xml")
      );

      // Verify output files
      expect(files["imsmanifest.xml"]).toBe("TEMPLATE_CONTENT"); // In real run it replaces strings, but mock returns simpler
      expect(files["questions.js"]).toContain('title: "Test Quiz"');
      expect(files["questions.js"]).toContain("passingScore: 70");
      expect(files["questions.js"]).toContain("timeLimit: 900"); // 15 * 60
      expect(files["questions.js"]).toContain('"text": "What is Nanite?"');
    });

    it("should replace template variables in manifest", async () => {
      // Mock manifest content specifically
      fetchMock.mockImplementation((url) => {
        if (url.includes("imsmanifest.xml")) {
          return Promise.resolve({
            text: () =>
              Promise.resolve(
                "<title>UE5 Scenario Tracker</title><id>com.example.ue5scenario.scorm12</id>"
              ),
          });
        }
        return Promise.resolve({ text: () => Promise.resolve("") });
      });

      const files = await generateScormPackageFiles([validQuestion], {
        title: "New Title",
      });

      expect(files["imsmanifest.xml"]).toContain("<title>New Title</title>");
      expect(files["imsmanifest.xml"]).toContain("com.ue5questiongen");
    });
  });
});
