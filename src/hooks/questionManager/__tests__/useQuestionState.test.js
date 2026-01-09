import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuestionState } from "../useQuestionState";
import * as secureStorage from "../../../utils/secureStorage";
import { STORAGE_KEYS } from "../../../utils/constants";

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

describe("useQuestionState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with empty array if storage is empty", () => {
    secureStorage.getSecureItem.mockReturnValue(null);
    const config = { creatorName: "TestUser" };

    const { result } = renderHook(() => useQuestionState(config));

    expect(result.current[0]).toEqual([]);
    expect(secureStorage.getSecureItem).toHaveBeenCalledWith(
      STORAGE_KEYS.QUESTIONS
    );
  });

  it("should initialize with stored questions marked as session", () => {
    const storedQuestions = [{ id: "q1", text: "Test?" }];
    secureStorage.getSecureItem.mockReturnValue(storedQuestions);
    const config = {}; // No creatorName to prevent backfill effect

    const { result } = renderHook(() => useQuestionState(config));

    expect(result.current[0]).toEqual([
      { id: "q1", text: "Test?", _source: "session" },
    ]);
  });

  it("should sync changes to secureStorage (stripping _source)", () => {
    secureStorage.getSecureItem.mockReturnValue([]);
    const config = {}; // Prevent backfill

    const { result } = renderHook(() => useQuestionState(config));
    const [_, setAllQuestions] = result.current;

    act(() => {
      setAllQuestions([
        { id: "q1", text: "New", _source: "session" },
        { id: "q2", text: "Imported", _source: "import" }, // Should not be saved
      ]);
    });

    // Check second call (first is initial effect)
    // Actually the effect runs on every render/change.
    // The initial empty array also triggers useEfffect -> setSecureItem([], ...)

    // getSecureItem returns [], initial state is [], useEffect runs.
    expect(secureStorage.setSecureItem).toHaveBeenCalledWith(
      STORAGE_KEYS.QUESTIONS,
      []
    ); // First call

    // After update
    // We expect cleanQuestions to only contain session questions without _source
    const expectedStored = [{ id: "q1", text: "New" }];

    // Find the call with the updated data
    const calls = secureStorage.setSecureItem.mock.calls;
    const lastCall = calls[calls.length - 1];

    expect(lastCall[0]).toBe(STORAGE_KEYS.QUESTIONS);
    expect(lastCall[1]).toEqual(expectedStored);
  });

  it("should backfill creatorName for session questions", () => {
    const storedQuestions = [
      { id: "q1", text: "NoCreator" },
      { id: "q2", text: "HasCreator", creatorName: "Existing" },
    ];
    secureStorage.getSecureItem.mockReturnValue(storedQuestions);

    const config = { creatorName: "NewUser" };
    const { result } = renderHook(() => useQuestionState(config));

    // Wait for effect to update state
    // Effect runs: needsBackfill check

    // The hook initializes, then the effect runs.
    // We check the final state.

    // We might need to wait for the state update, but renderHook usually handles one cycle.
    // If it's inside useEffect with a state update, it triggers a re-render.

    // Let's assert on the result.current[0]
    // Note: renderHook returns a mutable ref to result.

    expect(result.current[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "q1",
          creatorName: "NewUser",
          _source: "session",
        }),
        expect.objectContaining({
          id: "q2",
          creatorName: "Existing",
          _source: "session",
        }),
      ])
    );
  });
});
