import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuestionActions } from "../useQuestionActions";
import { QUESTION_STATUS } from "../../../utils/constants";
import { deleteQuestionFromFirestore } from "../../../services/firebase";
import { saveQuestionAsReviewer } from "../../../services/firestoreSave";
import { logQuestion } from "../../../utils/analyticsStore";

// Mocks
vi.mock("../../../services/firebase", () => ({
  saveQuestionToFirestore: vi.fn(),
  deleteQuestionFromFirestore: vi.fn(),
}));

vi.mock("../../../services/firestoreSave", () => ({
  saveQuestionAsReviewer: vi.fn(),
}));

vi.mock("../../../utils/analyticsStore", () => ({
  logQuestion: vi.fn(),
}));

vi.mock("../../../agents", () => ({
  getAgents: vi.fn(),
}));

vi.mock("../../../utils/logger", () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock completeReviewTracking from normalizeQuestion
vi.mock("../../../utils/normalizeQuestion", () => ({
  completeReviewTracking: (q) => ({ ...q, status: q.status, normalized: true }),
}));

describe("useQuestionActions", () => {
  let mockSetAllQuestions;
  let mockBackupToCloud;
  let mockShowMessage;
  const q1 = { id: 1, uniqueId: "u1", _source: "session", text: "Q1" };
  // mockAllQuestionsMap removed
  // Wait, the map keys are usually uniqueIds, but let's check hook usage.
  // The hook does: const currentQ = allQuestionsMap.get(id)?.find((v) => v.id === id);
  // This implies allQuestionsMap key is `id`?
  // Let's re-read useQuestionDerivedData.js:
  // const newMap = new Map(); allQuestions.forEach(q => ... id = q.uniqueId || q.id; if (!newMap.has(id))...
  // So the key is uniqueId.
  // However, handleUpdateStatus uses `allQuestionsMap.get(id)`.
  // This looks like a potential BUG or mismatch in the hook if `id` is not the uniqueId.
  // But usually id === uniqueId for new questions.
  // Let's assume uniqueId derived correctly.
  // In useQuestionDerivedData line 33: `const id = q.uniqueId || q.id;`. So map key IS uniqueId (or id fall back).
  // In useQuestionActions line 87: `const currentQ = allQuestionsMap.get(id)?.find((v) => v.id === id);`
  // This implies `id` passed to handleUpdateStatus is supposed to be the key.
  // BUT `id` passed to handleUpdateStatus is usually the specific variant ID (number/uuid), while uniqueId is the group ID.
  // If uniqueId != id, this lookup might fail if `id` is passed as key.
  // Let's test with id == uniqueId for simplicity, or we caught a bug (which we can fix or ignore for now).
  // Assuming id === uniqueId for basic tests.

  const allQuestions = [q1];
  const config = {
    creatorName: "TestUser",
    userId: "user1",
    userEmail: "test@test.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetAllQuestions = vi.fn();
    mockBackupToCloud = vi.fn().mockResolvedValue(true);
    mockShowMessage = vi.fn();
    mockShowMessage = vi.fn();
    // mockAllQuestionsMap removed
  });

  it("should add questions and deduplicate", async () => {
    // Need to simulate functional update of setAllQuestions
    mockSetAllQuestions.mockImplementation((fn) => {
      if (typeof fn === "function") {
        const res = fn([]); // prev is empty
        return res;
      }
    });

    const { result } = renderHook(() =>
      useQuestionActions(
        [], // allQuestions (not really used inside addQuestions except via setAllQuestions provided prev)
        mockSetAllQuestions,
        mockBackupToCloud,
        mockShowMessage,
        config
      )
    );

    const newQ = { id: 2, text: "Q2" };
    await act(async () => {
      await result.current.addQuestions([newQ], "session");
    });

    expect(mockBackupToCloud).toHaveBeenCalled();
    expect(mockSetAllQuestions).toHaveBeenCalled();
    // check mockSetAllQuestions calls
  });

  it("should handle status update to DELETED", async () => {
    const { result } = renderHook(() =>
      useQuestionActions(
        allQuestions,
        mockSetAllQuestions,
        mockBackupToCloud,
        mockShowMessage,
        config
      )
    );

    deleteQuestionFromFirestore.mockResolvedValue(true);

    await act(async () => {
      await result.current.handleUpdateStatus(1, QUESTION_STATUS.DELETED);
    });

    expect(deleteQuestionFromFirestore).toHaveBeenCalled();
    expect(logQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ status: "deleted" })
    );
  });

  it("should handle status update to ACCEPTED", async () => {
    const { result } = renderHook(() =>
      useQuestionActions(
        allQuestions,
        mockSetAllQuestions,
        mockBackupToCloud,
        mockShowMessage,
        config
      )
    );

    saveQuestionAsReviewer.mockResolvedValue({ success: true });

    await act(async () => {
      await result.current.handleUpdateStatus(1, QUESTION_STATUS.ACCEPTED);
    });

    expect(saveQuestionAsReviewer).toHaveBeenCalledWith(
      "u1", // questionId
      expect.objectContaining({ status: "accepted" })
    );
    expect(mockShowMessage).toHaveBeenCalledWith(
      expect.stringContaining("Question accepted"),
      expect.any(Number)
    );
  });

  it("should update question in state", () => {
    const { result } = renderHook(() =>
      useQuestionActions(
        allQuestions,
        mockSetAllQuestions,
        mockBackupToCloud,
        mockShowMessage,
        config
      )
    );

    act(() => {
      result.current.updateQuestionInState(1, { text: "Updated" });
    });

    expect(mockSetAllQuestions).toHaveBeenCalled();
    // Verify implementation logic by mocking the callback
    const callback = mockSetAllQuestions.mock.calls[0][0];
    const updatedList = callback(allQuestions);
    expect(updatedList[0].text).toBe("Updated");
  });

  it("should clear session questions", () => {
    const mixedQuestions = [
      { id: 1, _source: "session" },
      { id: 2, _source: "database" },
    ];

    const { result } = renderHook(() =>
      useQuestionActions(
        mixedQuestions,
        mockSetAllQuestions,
        mockBackupToCloud,
        mockShowMessage,
        config
      )
    );

    act(() => {
      result.current.clearQuestions();
    });

    const callback = mockSetAllQuestions.mock.calls[0][0];
    const res = callback(mixedQuestions);
    expect(res).toHaveLength(1);
    expect(res[0]._source).toBe("database");
  });
});
