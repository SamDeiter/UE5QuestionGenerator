import { describe, it, expect } from "vitest";
import { parseQuestionDoc } from "../questionDocParser";

const validBaseDoc = {
  id: "doc-1",
  uniqueId: "uid-1",
  question: "What does X do?",
  creatorId: "creator-1",
  answers: ["a", "b"],
  correctIndex: 0,
  status: "accepted",
  discipline: "Tech Art",
  language: "English",
};

describe("parseQuestionDoc difficulty handling", () => {
  // Regression test for the parser overwriting canonical difficulty values
  // with "medium", which caused every question to render as "Intermediate"
  // in the Review console and 0/N/0 in the SCORM export modal.
  it.each([
    ["Beginner"],
    ["Intermediate"],
    ["Expert"],
    ["Easy"],
    ["Medium"],
    ["Hard"],
    ["easy"],
    ["medium"],
    ["hard"],
  ])("passes %s through unchanged", (difficulty) => {
    const { valid, question } = parseQuestionDoc({
      ...validBaseDoc,
      difficulty,
    });
    expect(valid).toBe(true);
    expect(question.difficulty).toBe(difficulty);
  });

  it("falls back to Intermediate for unknown values", () => {
    const { valid, question } = parseQuestionDoc({
      ...validBaseDoc,
      difficulty: "PotatoTier",
    });
    expect(valid).toBe(true);
    expect(question.difficulty).toBe("Intermediate");
  });

  it("falls back to Intermediate when difficulty is missing", () => {
    const { valid, question } = parseQuestionDoc({ ...validBaseDoc });
    expect(valid).toBe(true);
    expect(question.difficulty).toBe("Intermediate");
  });
});
