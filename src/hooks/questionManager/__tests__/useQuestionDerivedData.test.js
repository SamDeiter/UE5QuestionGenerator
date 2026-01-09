import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useQuestionDerivedData } from "../useQuestionDerivedData";
vi.mock("../../../utils/constants", () => ({
  CATEGORY_KEYS: [
    "Easy MC",
    "Easy T/F",
    "Medium MC",
    "Medium T/F",
    "Hard MC",
    "Hard T/F",
  ],
  TARGET_PER_CATEGORY: 5,
  TARGET_TOTAL: 30,
  QUESTION_SOURCES: {
    SESSION: "session",
    IMPORT: "import",
    DATABASE: "database",
  },
  QUESTION_STATUS: {
    ACCEPTED: "accepted",
    REJECTED: "rejected",
    PENDING: "pending",
  },
  TIMING: {
    DEBOUNCE_DELAY: 300,
  },
}));

// No need to import real constants if we mocked them fully above, but if we did, we'd use vi.mock logic
// But since we are mocking the module, the import below would get the mock.
import {
  CATEGORY_KEYS,
  TARGET_PER_CATEGORY,
  QUESTION_SOURCES,
  QUESTION_STATUS,
} from "../../../utils/constants";

describe("useQuestionDerivedData", () => {
  const mockConfig = {
    discipline: "Math",
    difficulty: "Easy",
    type: "Multiple Choice",
  };

  const mockQuestions = [
    {
      id: 1,
      uniqueId: "u1",
      _source: QUESTION_SOURCES.SESSION,
      status: QUESTION_STATUS.PENDING,
      difficulty: "Easy",
      type: "Multiple Choice",
      discipline: "Math",
      created: "2023-01-01",
    },
    {
      id: 2,
      uniqueId: "u2",
      _source: QUESTION_SOURCES.IMPORT,
      status: QUESTION_STATUS.ACCEPTED,
      difficulty: "Easy",
      type: "Multiple Choice",
      discipline: "Math",
      created: "2023-01-02",
    },
    {
      id: 3,
      uniqueId: "u3",
      _source: QUESTION_SOURCES.DATABASE,
      status: QUESTION_STATUS.REJECTED,
      difficulty: "Hard",
      type: "True/False",
      discipline: "Science",
      created: "2023-01-03",
    },
    {
      id: 4,
      uniqueId: "u1",
      _source: QUESTION_SOURCES.SESSION,
      language: "Spanish",
      status: QUESTION_STATUS.PENDING,
      created: "2023-01-01",
    }, // Variant of u1
  ];

  it("should filter questions by source", () => {
    const { result } = renderHook(() =>
      useQuestionDerivedData(mockQuestions, mockConfig)
    );

    expect(result.current.questions).toHaveLength(2); // id 1 and 4
    expect(result.current.historicalQuestions).toHaveLength(1); // id 2
    expect(result.current.databaseQuestions).toHaveLength(1); // id 3
  });

  it("should group questions into maps correctly", () => {
    const { result } = renderHook(() =>
      useQuestionDerivedData(mockQuestions, mockConfig)
    );

    const { allQuestionsMap, translationMap } = result.current;

    expect(allQuestionsMap.get("u1")).toHaveLength(2);
    expect(allQuestionsMap.get("u2")).toHaveLength(1);

    expect(translationMap.get("u1").has("English")).toBe(true);
    expect(translationMap.get("u1").has("Spanish")).toBe(true);
  });

  it("should create a unified questions list (canonical only)", () => {
    const { result } = renderHook(() =>
      useQuestionDerivedData(mockQuestions, mockConfig)
    );

    const { unifiedQuestions } = result.current;
    // u1 (English), u2, u3. u1 Spanish is not canonical.
    expect(unifiedQuestions).toHaveLength(3);

    const ids = unifiedQuestions.map((q) => q.id);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect(ids).toContain(3);
    expect(ids).not.toContain(4);
  });

  it("should sort unified questions by date descending", () => {
    const { result } = renderHook(() =>
      useQuestionDerivedData(mockQuestions, mockConfig)
    );
    const { unifiedQuestions } = result.current;

    // Dates: u3 (Jan 3), u2 (Jan 2), u1 (Jan 1)
    expect(unifiedQuestions[0].id).toBe(3);
    expect(unifiedQuestions[1].id).toBe(2);
    expect(unifiedQuestions[2].id).toBe(1);
  });

  it("should calculate correct counts", () => {
    const { result } = renderHook(() =>
      useQuestionDerivedData(mockQuestions, mockConfig)
    );

    expect(result.current.approvedCount).toBe(1); // id 2
    expect(result.current.rejectedCount).toBe(1); // id 3

    // pending: id 1 (status 'pending').
    // Note: id 4 is filtered out of unified list as logic is based on unifiedQuestions
    expect(result.current.pendingCount).toBe(1);
  });

  it("should calculate approvedCounts by category correctly", () => {
    const { result } = renderHook(() =>
      useQuestionDerivedData(mockQuestions, mockConfig)
    );

    // Logic counts accepted AND pending/null status
    // id 1 is Pending, Easy, MC, Math
    // id 2 is Accepted, Easy, MC, Math
    // Both match the category "Easy MC" and discipline "Math"

    const key = "Easy MC";
    expect(result.current.approvedCounts[key]).toBe(2);
  });

  it("should determine if target is met", () => {
    const configMet = {
      ...mockConfig,
      difficulty: "Easy",
      type: "Multiple Choice",
    };

    // If TARGET_PER_CATEGORY is small, it might pass. It's likely > 1.
    // Let's assume default is e.g. 5, so 1 < 5 -> false.
    const { result } = renderHook(() =>
      useQuestionDerivedData(mockQuestions, configMet)
    );
    if (TARGET_PER_CATEGORY > 1) {
      expect(result.current.isTargetMet).toBe(false);
    }
  });
});
