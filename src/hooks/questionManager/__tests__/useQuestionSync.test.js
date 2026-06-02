import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuestionSync } from "../useQuestionSync";
import { saveQuestionToFirestore } from "../../../services/firebase";
import { subscribeToAllQuestions } from "../../../services/firebaseQueries";
import { STORAGE_KEYS, QUESTION_SOURCES } from "../../../utils/constants";

vi.mock("../../../services/firebase", () => ({
  saveQuestionToFirestore: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../../services/firebaseQueries", () => ({
  subscribeToAllQuestions: vi.fn(() => () => {}),
}));

vi.mock("../../../utils/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useQuestionSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should sync questions from storage event", () => {
    const setAllQuestions = vi.fn();
    renderHook(() => useQuestionSync([], setAllQuestions));

    const newQuestions = [{ id: 1, text: "foo" }];
    const event = new StorageEvent("storage", {
      key: STORAGE_KEYS.QUESTIONS,
      newValue: JSON.stringify(newQuestions),
    });

    // Dispatch event
    window.dispatchEvent(event);

    expect(setAllQuestions).toHaveBeenCalled();
    // Check the callback function passed to setAllQuestions
    const updateFn = setAllQuestions.mock.calls[0][0];

    // Existing state has database (keep) and session (replace)
    const prev = [
      { id: 99, _source: "database" },
      { id: 2, _source: QUESTION_SOURCES.SESSION },
    ];

    const result = updateFn(prev);

    // Should keep database, replace session with newQuestions
    expect(result).toHaveLength(2);

    // Verify database item is kept
    const dbItem = result.find((q) => q.id === 99);
    expect(dbItem).toBeDefined();

    // Verify session item is replaced
    const sessionItem = result.find((q) => q.id === 1);
    expect(sessionItem).toBeDefined();
    expect(sessionItem._source).toBe(QUESTION_SOURCES.SESSION);

    // Verify old session item is gone
    expect(result.find((q) => q.id === 2)).toBeUndefined();
  });

  it("should backup to cloud if questions are new", async () => {
    const { result } = renderHook(() => useQuestionSync([], vi.fn()));
    const { backupToCloud } = result.current;

    const newItems = [{ id: 1, uniqueId: "u1" }];
    await backupToCloud(newItems, QUESTION_SOURCES.SESSION);

    expect(saveQuestionToFirestore).toHaveBeenCalledWith(newItems[0]);
  });

  it("should NOT backup to cloud if target source is not session", async () => {
    const { result } = renderHook(() => useQuestionSync([], vi.fn()));
    const { backupToCloud } = result.current;

    const newItems = [{ id: 1, uniqueId: "u1" }];
    await backupToCloud(newItems, "database");

    expect(saveQuestionToFirestore).not.toHaveBeenCalled();
  });

  describe("realtime listener gating (PERF: avoid concurrent cold-load reads)", () => {
    it("does NOT open the realtime listener while the initial load is in progress", () => {
      renderHook(() => useQuestionSync([], vi.fn(), true));
      expect(subscribeToAllQuestions).not.toHaveBeenCalled();
    });

    it("opens the realtime listener once the initial load completes", () => {
      renderHook(() => useQuestionSync([], vi.fn(), false));
      expect(subscribeToAllQuestions).toHaveBeenCalledTimes(1);
    });

    it("subscribes when isInitialLoading flips from true to false", () => {
      const { rerender } = renderHook(
        ({ loading }) => useQuestionSync([], vi.fn(), loading),
        { initialProps: { loading: true } }
      );
      expect(subscribeToAllQuestions).not.toHaveBeenCalled();

      rerender({ loading: false });
      expect(subscribeToAllQuestions).toHaveBeenCalledTimes(1);
    });
  });
});
