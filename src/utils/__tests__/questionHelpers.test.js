import { describe, it, expect } from "vitest";
import { parseQuestions } from "../questionHelpers";

describe("questionHelpers - parseQuestions", () => {
  it("parses clean JSON array", () => {
    const input = '[{"Question": "Q1", "CorrectLetter": "A"}]';
    const result = parseQuestions(input);
    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("Q1");
  });

  it("parses JSON with conversational prefix", () => {
    const input =
      'Here is the JSON you requested:\n[{"Question": "Q1", "CorrectLetter": "A"}]';
    const result = parseQuestions(input);
    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("Q1");
  });

  it('parses JSON with "Sure, here are the questions:" prefix', () => {
    const input =
      'Sure, here are the questions:\n\n[{"Question": "Q1", "CorrectLetter": "A"}]';
    const result = parseQuestions(input);
    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("Q1");
  });

  it("parses JSON wrapped in markdown code blocks", () => {
    const input =
      'Here is the data:\n```json\n[{"Question": "Q1", "CorrectLetter": "A"}]\n```';
    const result = parseQuestions(input);
    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("Q1");
  });

  it('handles localized prefixes like "Certainly"', () => {
    const input =
      'Certainly! Here is the output:\n[{"Question": "Q1", "CorrectLetter": "A"}]';
    const result = parseQuestions(input);
    expect(result).toHaveLength(1);
  });
});
