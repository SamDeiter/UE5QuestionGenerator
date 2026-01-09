import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useQuestionDerivedData } from "../useQuestionDerivedData";
import { TARGET_TOTAL } from "../../../utils/constants";

const PROPS_CONFIG = {
  discipline: "Programming",
  type: "Multiple Choice",
  difficulty: "Beginner",
};

describe("useQuestionDerivedData", () => {
  const mockAllQuestions = [
    // Session Question
    {
      id: "s1",
      uniqueId: "uid1",
      text: "Session Q1",
      _source: "session",
      status: "pending",
      discipline: "Programming",
      type: "Multiple Choice",
      difficulty: "Beginner",
      language: "English",
    },
    // Import Question (Different uniqueId)
    {
      id: "i1",
      uniqueId: "uid2",
      text: "Import Q1",
      _source: "import",
      status: "accepted",
      discipline: "Programming",
      type: "Multiple Choice",
      difficulty: "Beginner",
      language: "English",
    },
    // Database Question
    {
      id: "d1",
      uniqueId: "uid3",
      text: "DB Q1",
      _source: "database",
      status: "rejected",
      discipline: "Programming",
      type: "True/False", // Different type
      difficulty: "Intermediate",
      language: "French",
    },
    // Duplicate of s1 but from import (Variant logic check)
    {
      id: "i2",
      uniqueId: "uid1", // Same as s1
      text: "Import Variant of S1",
      _source: "import",
      language: "Spanish",
    },
  ];

  it("should separate questions by source", () => {
    const { result } = renderHook(() =>
      useQuestionDerivedData(mockAllQuestions, PROPS_CONFIG)
    );

    expect(result.current.questions).toHaveLength(1); // s1
    expect(result.current.questions[0].id).toBe("s1");

    expect(result.current.historicalQuestions).toHaveLength(2); // i1, i2
    expect(result.current.databaseQuestions).toHaveLength(1); // d1
  });

  it("should map questions by uniqueId", () => {
    const { result } = renderHook(() =>
      useQuestionDerivedData(mockAllQuestions, PROPS_CONFIG)
    );

    const map = result.current.allQuestionsMap;
    expect(map.size).toBe(3); // uid1, uid2, uid3
    expect(map.get("uid1")).toHaveLength(2); // s1 (English) and i2 (Spanish)
    expect(map.get("uid2")).toHaveLength(1);
  });

  it("should correctly calculate translationMap", () => {
    const { result } = renderHook(() =>
      useQuestionDerivedData(mockAllQuestions, PROPS_CONFIG)
    );

    const map = result.current.translationMap;
    expect(map.get("uid1")).toEqual(new Set(["English", "Spanish"]));
    expect(map.get("uid3")).toEqual(new Set(["French"]));
  });

  it("should generate unifiedQuestions list (Canonical English)", () => {
    const { result } = renderHook(() =>
      useQuestionDerivedData(mockAllQuestions, PROPS_CONFIG)
    );

    const unified = result.current.unifiedQuestions;
    expect(unified).toHaveLength(3); // One per unique ID

    // For uid1, it should pick the English version (s1)
    const q1 = unified.find((q) => q.uniqueId === "uid1");
    expect(q1.text).toBe("Session Q1"); // s1
  });

  it("should calculate statistics correctly", () => {
    const { result } = renderHook(() =>
      useQuestionDerivedData(mockAllQuestions, PROPS_CONFIG)
    );

    expect(result.current.approvedCount).toBe(1);
    expect(result.current.rejectedCount).toBe(1);
    expect(result.current.pendingCount).toBe(1);
    expect(result.current.totalApproved).toBe(2); // accepted + pending
  });

  it("should verify target met status", () => {
    const { result } = renderHook(() =>
      useQuestionDerivedData(mockAllQuestions, PROPS_CONFIG)
    );
    expect(result.current.isTargetMet).toBe(false);
  });
});
