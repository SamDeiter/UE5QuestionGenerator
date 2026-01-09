import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useQuestionSync } from "../useQuestionSync";
import * as firebaseService from "../../../services/firebase";
import { STORAGE_KEYS } from "../../../utils/constants";

vi.mock("../../../services/firebase", () => ({
  saveQuestionToFirestore: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../../utils/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useQuestionSync", () => {
  let setAllQuestions;

  beforeEach(() => {
    setAllQuestions = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should sync questions from storage event", () => {
    renderHook(() => useQuestionSync([], setAllQuestions));

    const newQuestions = [{ id: "sync1", text: "Synced" }];
    const event = new StorageEvent("storage", {
      key: STORAGE_KEYS.QUESTIONS,
      newValue: JSON.stringify(newQuestions),
    });

    window.dispatchEvent(event);

    expect(setAllQuestions).toHaveBeenCalled();
    // We expect the function passed to setAllQuestions to be called
    // But since setAllQuestions is a mock, we inspect the call argument if it's a function
    const updateFn = setAllQuestions.mock.calls[0][0];
    const prev = [{ id: "existing", _source: "import" }];
    const result = updateFn(prev);

    expect(result).toHaveLength(2); // existing + synced
    expect(result[1]).toEqual({
      id: "sync1",
      text: "Synced",
      _source: "session",
    });
  });

  it("should backupToCloud for session questions", async () => {
    const { result } = renderHook(() => useQuestionSync([], setAllQuestions));
    const { backupToCloud } = result.current;

    const newItems = [
      { id: "q1", uniqueId: "u1" },
      { id: "q2", uniqueId: "u2" },
    ];

    await backupToCloud(newItems, "session");

    expect(firebaseService.saveQuestionToFirestore).toHaveBeenCalledTimes(2);
    expect(firebaseService.saveQuestionToFirestore).toHaveBeenCalledWith(
      newItems[0]
    );
  });

  it("should NOT backupToCloud for non-session questions", async () => {
    const { result } = renderHook(() => useQuestionSync([], setAllQuestions));
    const { backupToCloud } = result.current;

    const newItems = [{ id: "q1" }];

    await backupToCloud(newItems, "import");

    expect(firebaseService.saveQuestionToFirestore).not.toHaveBeenCalled();
  });
});
