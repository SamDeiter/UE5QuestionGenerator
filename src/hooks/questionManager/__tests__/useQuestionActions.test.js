import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuestionActions } from "../useQuestionActions";
import * as firebaseService from "../../../services/firebase";
import * as agentsService from "../../../agents";
import * as analyticsStore from "../../../utils/analyticsStore";
import { QUESTION_SOURCES, QUESTION_STATUS } from "../../../utils/constants";

// Mocks
vi.mock("../../../services/firebase", () => ({
  saveQuestionToFirestore: vi.fn(),
  deleteQuestionFromFirestore: vi.fn(),
}));

vi.mock("../../../agents", () => ({
  getAgents: vi.fn(),
}));

vi.mock("../../../utils/analyticsStore", () => ({
  logQuestion: vi.fn(),
}));

vi.mock("../../../utils/normalizeQuestion", () => ({
  completeReviewTracking: (q) => q, // Identity for simplicity
}));

vi.mock("../../../utils/questionHelpers", () => ({
  filterDuplicateQuestions: (newItems, current) => newItems, // Pass through
}));

vi.mock("../../../utils/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useQuestionActions", () => {
  let setAllQuestions;
  let backupToCloud;
  let showMessage;
  let allQuestionsMap;
  const config = {
    creatorName: "Tester",
    userId: "u123",
    userEmail: "test@example.com",
  };

  beforeEach(() => {
    setAllQuestions = vi.fn();
    backupToCloud = vi.fn();
    showMessage = vi.fn();
    allQuestionsMap = new Map();
    vi.clearAllMocks();
  });

  it("should add questions and trigger backup", async () => {
    const { result } = renderHook(() =>
      useQuestionActions(
        [],
        setAllQuestions,
        allQuestionsMap,
        backupToCloud,
        showMessage,
        config
      )
    );

    const newItems = [{ id: "new1", text: "New Q" }];

    await act(async () => {
      await result.current.addQuestions(newItems, QUESTION_SOURCES.SESSION);
    });

    expect(backupToCloud).toHaveBeenCalledWith(
      newItems,
      QUESTION_SOURCES.SESSION
    );
    // setAllQuestions called with update function
    const updateFn = setAllQuestions.mock.calls[0][0];
    const prev = [];
    const next = updateFn(prev);
    expect(next).toHaveLength(1);
    expect(next[0]._source).toBe(QUESTION_SOURCES.SESSION);
  });

  it("should handle updateQuestionInState", () => {
    const { result } = renderHook(() =>
      useQuestionActions(
        [],
        setAllQuestions,
        allQuestionsMap,
        backupToCloud,
        showMessage,
        config
      )
    );

    act(() => {
      result.current.updateQuestionInState("q1", { text: "Updated" });
    });

    const updateFn = setAllQuestions.mock.calls[0][0];
    const prev = [
      { id: "q1", text: "Original", _source: QUESTION_SOURCES.SESSION },
    ];
    const next = updateFn(prev);

    expect(next[0].text).toBe("Updated");
  });

  it("should delete question when status is deleted", async () => {
    const q1 = { id: "q1", uniqueId: "u1", _source: QUESTION_SOURCES.SESSION };
    allQuestionsMap.set("q1", [q1]); // Helper map

    const { result } = renderHook(() =>
      useQuestionActions(
        [q1],
        setAllQuestions,
        allQuestionsMap,
        backupToCloud,
        showMessage,
        config
      )
    );

    await act(async () => {
      await result.current.handleUpdateStatus("q1", QUESTION_STATUS.DELETED);
    });

    expect(firebaseService.deleteQuestionFromFirestore).toHaveBeenCalledWith(
      "u1"
    );
    expect(analyticsStore.logQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ status: QUESTION_STATUS.DELETED })
    );

    // State update checks
    const updateFn = setAllQuestions.mock.calls[0][0];
    const next = updateFn([q1]);
    expect(next).toHaveLength(0);
  });

  it("should move question to new source", async () => {
    const q1 = {
      id: "q1",
      uniqueId: "u1",
      _source: QUESTION_SOURCES.DATABASE,
      status: QUESTION_STATUS.ACCEPTED,
    };
    allQuestionsMap.set("q1", [q1]);

    firebaseService.saveQuestionToFirestore.mockResolvedValue({
      queued: false,
    });

    const { result } = renderHook(() =>
      useQuestionActions(
        [q1],
        setAllQuestions,
        allQuestionsMap,
        backupToCloud,
        showMessage,
        config
      )
    );

    await act(async () => {
      await result.current.moveQuestion("q1", QUESTION_SOURCES.SESSION, {
        status: QUESTION_STATUS.PENDING,
      });
    });

    expect(firebaseService.saveQuestionToFirestore).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "q1",
        _source: QUESTION_SOURCES.SESSION,
        status: QUESTION_STATUS.PENDING,
      })
    );

    // State update checks
    const updateFn = setAllQuestions.mock.calls.find((call) =>
      call[0].toString().includes("map")
    )?.[0];
    // moveQuestion uses updateQuestionInState which uses .map
    // But updateQuestionInState is passed 'setAllQuestions'.
    // In hook `updateQuestionInState` calls `setAllQuestions((prev) => ...)`
    // Note: Use `setAllQuestions.mock.calls` to find the call.
    // The implementation: updateQuestionInState uses `prev.findIndex`.
    // Actually my implementation of `moveQuestion` calls `updateQuestionInState`.
    // `updateQuestionInState` calls `setAllQuestions`.
  });

  it("should save accepted question to firestore", async () => {
    const q1 = {
      id: "q1",
      uniqueId: "u1",
      _source: QUESTION_SOURCES.SESSION,
      status: QUESTION_STATUS.PENDING,
    };
    allQuestionsMap.set("q1", [q1]);

    firebaseService.saveQuestionToFirestore.mockResolvedValue({
      queued: false,
    });

    const { result } = renderHook(() =>
      useQuestionActions(
        [q1],
        setAllQuestions,
        allQuestionsMap,
        backupToCloud,
        showMessage,
        config
      )
    );

    await act(async () => {
      await result.current.handleUpdateStatus("q1", QUESTION_STATUS.ACCEPTED);
    });

    expect(firebaseService.saveQuestionToFirestore).toHaveBeenCalledWith(
      expect.objectContaining({ status: QUESTION_STATUS.ACCEPTED })
    );
    expect(showMessage).toHaveBeenCalledWith(
      expect.stringContaining(QUESTION_STATUS.ACCEPTED),
      expect.any(Number)
    );
  });

  it("should use saveGuardAgent if available", async () => {
    const q1 = { id: "q1", uniqueId: "u1", version: 1 };
    allQuestionsMap.set("q1", [q1]);

    const saveGuardMock = {
      saveQuestion: vi.fn().mockResolvedValue({ success: true, newVersion: 2 }),
    };
    agentsService.getAgents.mockReturnValue({ saveGuardAgent: saveGuardMock });

    const { result } = renderHook(() =>
      useQuestionActions(
        [q1],
        setAllQuestions,
        allQuestionsMap,
        backupToCloud,
        showMessage,
        config
      )
    );

    await act(async () => {
      await result.current.handleUpdateQuestion("q1", { text: "Edited" });
    });

    expect(saveGuardMock.saveQuestion).toHaveBeenCalled();
    expect(result.current.questionVersions.get("q1")).toBe(2);
  });
  it("should replace questions for a specific source", () => {
    const { result } = renderHook(() =>
      useQuestionActions(
        [],
        setAllQuestions,
        allQuestionsMap,
        backupToCloud,
        showMessage,
        config
      )
    );

    const newSet = [{ id: "db1", _source: QUESTION_SOURCES.DATABASE }];

    act(() => {
      result.current.replaceQuestions(newSet, QUESTION_SOURCES.DATABASE);
    });

    const updateFn = setAllQuestions.mock.calls[0][0];
    const prev = [
      { id: "s1", _source: "session" },
      { id: "dbOld", _source: QUESTION_SOURCES.DATABASE },
    ];
    const next = updateFn(prev);

    // Should keep session, remove old database, add new database
    expect(next).toHaveLength(2);
    expect(next.find((q) => q.id === "s1")).toBeDefined();
    expect(next.find((q) => q.id === "db1")).toBeDefined();
    expect(next.find((q) => q.id === "dbOld")).toBeUndefined();
  });

  it("should bulk delete questions", () => {
    const { result } = renderHook(() =>
      useQuestionActions(
        [],
        setAllQuestions,
        allQuestionsMap,
        backupToCloud,
        showMessage,
        config
      )
    );

    act(() => {
      result.current.bulkDeleteQuestions(["del1", "del2"]);
    });

    const updateFn = setAllQuestions.mock.calls[0][0];
    const prev = [
      { id: "keep1" },
      { id: "del1" },
      { id: "del2" },
      { id: "keep2" },
    ];
    const next = updateFn(prev);

    expect(next).toHaveLength(2);
    expect(next.map((n) => n.id)).toEqual(["keep1", "keep2"]);
  });
});
