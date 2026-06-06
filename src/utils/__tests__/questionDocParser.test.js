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

describe("parseQuestionDoc uniqueId normalization for translation variants", () => {
  it("strips language suffix from uniqueId for Spanish variant", () => {
    const { valid, question } = parseQuestionDoc({
      id: "abc123_Spanish",
      uniqueId: "abc123_Spanish",
      question: "¿Qué hace X?",
      creatorId: "creator-1",
      answers: ["a", "b"],
      language: "Spanish",
    });
    expect(valid).toBe(true);
    expect(question.uniqueId).toBe("abc123");
    expect(question.id).toBe("abc123_Spanish");
  });

  it("strips language suffix from uniqueId when uniqueId is absent (doc ID fallback)", () => {
    const { valid, question } = parseQuestionDoc({
      id: "abc123_French",
      question: "Qu'est-ce que X fait ?",
      creatorId: "creator-1",
      answers: ["a", "b"],
      language: "French",
    });
    expect(valid).toBe(true);
    expect(question.uniqueId).toBe("abc123");
    expect(question.id).toBe("abc123_French");
  });

  it("does not modify uniqueId when it does not end with the language suffix", () => {
    const { valid, question } = parseQuestionDoc({
      id: "abc123_Spanish",
      uniqueId: "abc123",
      question: "¿Qué hace X?",
      creatorId: "creator-1",
      answers: ["a", "b"],
      language: "Spanish",
    });
    expect(valid).toBe(true);
    expect(question.uniqueId).toBe("abc123");
  });

  it("does not modify uniqueId for English questions", () => {
    const { valid, question } = parseQuestionDoc({ ...validBaseDoc });
    expect(valid).toBe(true);
    expect(question.uniqueId).toBe("uid-1");
  });
});
