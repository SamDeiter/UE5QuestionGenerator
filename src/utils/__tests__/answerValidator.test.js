/**
 * answerValidator - Tests for answer validation utility
 * Pure functions, no React dependencies
 */
import { describe, it, expect } from "vitest";
import validateAnswer from "../answerValidator";

describe("answerValidator", () => {
  describe("validateAnswer", () => {
    it("returns invalid when missing CorrectLetter", () => {
      const question = {
        SourceExcerpt: "Some text",
        OptionA: "Answer A",
      };
      const result = validateAnswer(question);
      expect(result.isValid).toBe(false);
      expect(result.warning).toContain("Missing");
    });

    it("returns invalid when missing SourceExcerpt", () => {
      const question = {
        CorrectLetter: "A",
        OptionA: "Answer A",
      };
      const result = validateAnswer(question);
      expect(result.isValid).toBe(false);
      expect(result.warning).toContain("Missing");
    });

    it("returns invalid when no option for letter", () => {
      const question = {
        CorrectLetter: "A",
        SourceExcerpt: "Some text",
        // Missing OptionA
      };
      const result = validateAnswer(question);
      expect(result.isValid).toBe(false);
      expect(result.warning).toContain("No option found");
    });

    it("validates answer when terms found in excerpt", () => {
      const question = {
        CorrectLetter: "A",
        OptionA: "Blueprint Editor",
        SourceExcerpt:
          "The Blueprint Editor is a powerful visual scripting tool in Unreal Engine.",
      };
      const result = validateAnswer(question);
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.isValid).toBe(true);
    });

    it("returns low confidence when answer not in excerpt", () => {
      const question = {
        CorrectLetter: "A",
        OptionA: "Completely unrelated answer xyz123",
        SourceExcerpt: "The Blueprint Editor is used for visual scripting.",
      };
      const result = validateAnswer(question);
      expect(result.confidence).toBeLessThan(50);
    });

    it("handles lowercase correct letter", () => {
      const question = {
        correctLetter: "b",
        OptionB: "Materials Editor",
        SourceExcerpt: "The Materials Editor is used for creating materials.",
      };
      const result = validateAnswer(question);
      expect(result.isValid).toBe(true);
    });

    it("handles camelCase option names", () => {
      const question = {
        CorrectLetter: "C",
        optionC: "Animation Blueprint",
        SourceExcerpt: "Animation Blueprints control character animation.",
      };
      const result = validateAnswer(question);
      expect(result.details.correctAnswer).toBe("Animation Blueprint");
    });

    it("extracts details correctly", () => {
      const question = {
        CorrectLetter: "D",
        OptionD: "Sequencer tool for cinematics",
        SourceExcerpt: "Sequencer is a tool for creating cinematics in UE5.",
      };
      const result = validateAnswer(question);
      expect(result.details).toHaveProperty("correctAnswer");
      expect(result.details).toHaveProperty("correctLetter", "D");
      expect(result.details).toHaveProperty("answerTerms");
      expect(result.details).toHaveProperty("matchedTerms");
    });
  });
});
