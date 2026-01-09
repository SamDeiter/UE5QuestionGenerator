import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuestionState } from "../useQuestionState";
import { getSecureItem, setSecureItem } from "../../../utils/secureStorage";
import { STORAGE_KEYS, QUESTION_SOURCES } from "../../../utils/constants";

// Mock dependencies
vi.mock("../../../utils/secureStorage", () => ({
  getSecureItem: vi.fn(),
  setSecureItem: vi.fn(),
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
  });

  it("should initialize with empty array if storage is empty", () => {
    getSecureItem.mockReturnValue(null);
    const { result } = renderHook(() => useQuestionState({}));
    const [allQuestions] = result.current;
    expect(allQuestions).toEqual([]);
  });

  it("should initialize with session questions from storage", async () => {
    const mockSaved = [{ id: 1, text: "foo" }];
    getSecureItem.mockReturnValue(mockSaved);
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
    getSecureItem.mockReturnValue([]);
    const { result } = renderHook(() => useQuestionState({}));
    const [, setAllQuestions] = result.current;

    const newQ = { id: 2, text: "bar", _source: QUESTION_SOURCES.SESSION };
    act(() => {
      setAllQuestions([newQ]);
    });

    expect(setSecureItem).toHaveBeenCalledWith(
      STORAGE_KEYS.QUESTIONS,
      [{ id: 2, text: "bar" }] // _source should be removed
    );
  });

  it("should not persist non-session questions", () => {
    getSecureItem.mockReturnValue([]);
    const { result } = renderHook(() => useQuestionState({}));
    const [, setAllQuestions] = result.current;

    const dbQ = { id: 3, text: "baz", _source: "database" };
    act(() => {
      setAllQuestions([dbQ]);
    });

    // Should filter out database q, leaving empty array
    expect(setSecureItem).toHaveBeenCalledWith(STORAGE_KEYS.QUESTIONS, []);
  });

  it("should backfill creatorName if missing for session questions", async () => {
    const mockSaved = [{ id: 1, question: "test" }]; // Missing creatorName, implies session when loaded
    getSecureItem.mockReturnValue(mockSaved);

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
    getSecureItem.mockReturnValue(mockSaved);

    const config = { creatorName: "Alice" };
    const { result } = renderHook(() => useQuestionState(config));

    await waitFor(() => {
      const [allQuestions] = result.current;
      expect(allQuestions[0]).toBeDefined();
      expect(allQuestions[0].creatorName).toBe("Bob");
    });
  });
});
