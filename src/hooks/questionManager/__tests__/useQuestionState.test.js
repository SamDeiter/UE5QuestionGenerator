import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuestionState } from "../useQuestionState";
import { resetQuestionStore } from "../../../store/questionStore";
import { getLocalPref, setLocalPref } from "../../../utils/localPrefs";
import { STORAGE_KEYS, QUESTION_SOURCES } from "../../../utils/constants";

// Mock dependencies
vi.mock("../../../utils/localPrefs", () => ({
  getLocalPref: vi.fn(),
  setLocalPref: vi.fn(),
}));

vi.mock("../../../utils/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../utils/constants", () => ({
  STORAGE_KEYS: {
    QUESTIONS: "questions_key",
  },
  QUESTION_SOURCES: {
    SESSION: "session",
  },
}));

describe("useQuestionState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // State now lives in a module-level store; reset it so each case starts
    // from the same empty baseline the old per-mount useState gave us.
    resetQuestionStore();
  });

  it("should initialize with empty array if storage is empty", () => {
    getLocalPref.mockReturnValue(null);
    const { result } = renderHook(() => useQuestionState({}));
    const [allQuestions] = result.current;
    expect(allQuestions).toEqual([]);
  });

  it("should initialize with session questions from storage", async () => {
    const mockSaved = [{ id: 1, text: "foo" }];
    getLocalPref.mockReturnValue(mockSaved);
    const { result } = renderHook(() => useQuestionState({}));

    await waitFor(() => {
      const [allQuestions] = result.current;
      expect(allQuestions).toHaveLength(1);
      expect(allQuestions[0]).toEqual({
        ...mockSaved[0],
        _source: QUESTION_SOURCES.SESSION,
      });
    });
  });

  it("should persist session questions to storage on change", () => {
    getLocalPref.mockReturnValue([]);
    const { result } = renderHook(() => useQuestionState({}));
    const [, setAllQuestions] = result.current;

    const newQ = { id: 2, text: "bar", _source: QUESTION_SOURCES.SESSION };
    act(() => {
      setAllQuestions([newQ]);
    });

    expect(setLocalPref).toHaveBeenCalledWith(
      STORAGE_KEYS.QUESTIONS,
      [{ id: 2, text: "bar" }] // _source should be removed
    );
  });

  it("should not persist non-session questions", () => {
    getLocalPref.mockReturnValue([]);
    const { result } = renderHook(() => useQuestionState({}));
    const [, setAllQuestions] = result.current;

    const dbQ = { id: 3, text: "baz", _source: "database" };
    act(() => {
      setAllQuestions([dbQ]);
    });

    // Should filter out database q, leaving empty array
    expect(setLocalPref).toHaveBeenCalledWith(STORAGE_KEYS.QUESTIONS, []);
  });

  it("should backfill creatorName if missing for session questions", async () => {
    const mockSaved = [{ id: 1, question: "test" }]; // Missing creatorName, implies session when loaded
    getLocalPref.mockReturnValue(mockSaved);

    const config = { creatorName: "Alice" };
    const { result } = renderHook(() => useQuestionState(config));

    // The hook runs effects, so it should be updated
    await waitFor(() => {
      const [allQuestions] = result.current;
      expect(allQuestions[0]).toBeDefined();
      expect(allQuestions[0].creatorName).toBe("Alice");
      expect(allQuestions[0]._source).toBe(QUESTION_SOURCES.SESSION);
    });
  });

  it("should NOT backfill creatorName if already present", async () => {
    const mockSaved = [{ id: 1, question: "test", creatorName: "Bob" }];
    getLocalPref.mockReturnValue(mockSaved);

    const config = { creatorName: "Alice" };
    const { result } = renderHook(() => useQuestionState(config));

    await waitFor(() => {
      const [allQuestions] = result.current;
      expect(allQuestions[0]).toBeDefined();
      expect(allQuestions[0].creatorName).toBe("Bob");
    });
  });
});
