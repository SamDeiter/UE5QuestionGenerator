import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuestionManager } from "../useQuestionManager";
import * as useQuestionStateModule from "../questionManager/useQuestionState";
import * as useQuestionDerivedDataModule from "../questionManager/useQuestionDerivedData";
import * as useQuestionSyncModule from "../questionManager/useQuestionSync";
import * as useQuestionActionsModule from "../questionManager/useQuestionActions";

// Mock sub-hooks
vi.mock("../questionManager/useQuestionState", () => ({
  useQuestionState: vi.fn(),
}));
vi.mock("../questionManager/useQuestionDerivedData", () => ({
  useQuestionDerivedData: vi.fn(),
}));
vi.mock("../questionManager/useQuestionSync", () => ({
  useQuestionSync: vi.fn(),
}));
vi.mock("../questionManager/useQuestionActions", () => ({
  useQuestionActions: vi.fn(),
}));

describe("useQuestionManager", () => {
  const mockConfig = { creatorName: "Test" };
  const mockShowMessage = vi.fn();
  const mockSetAllQuestions = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock returns
    useQuestionStateModule.useQuestionState.mockReturnValue([
      [],
      mockSetAllQuestions,
    ]);

    useQuestionDerivedDataModule.useQuestionDerivedData.mockReturnValue({
      unifiedQuestions: [],
      allQuestionsMap: new Map(),
    });

    useQuestionSyncModule.useQuestionSync.mockReturnValue({
      backupToCloud: vi.fn(),
    });

    useQuestionActionsModule.useQuestionActions.mockReturnValue({
      addQuestions: vi.fn(),
      updateQuestionInState: vi.fn(),
      handleUpdateStatus: vi.fn(),
      clearQuestions: vi.fn(),
      setDeleteConfirmId: vi.fn(),
      replaceQuestions: vi.fn(),
      bulkDeleteQuestions: vi.fn(),
      moveQuestion: vi.fn(),
    });
  });

  it("should assemble API from sub-hooks", () => {
    const { result } = renderHook(() =>
      useQuestionManager(mockConfig, mockShowMessage)
    );

    // Verify properties from Derived Data
    expect(result.current).toHaveProperty("unifiedQuestions");

    // Verify properties from Actions
    expect(result.current).toHaveProperty("addQuestions");
    expect(result.current).toHaveProperty("clearQuestions");
    expect(result.current).toHaveProperty("replaceQuestions");
    expect(result.current).toHaveProperty("bulkDeleteQuestions");
    expect(result.current).toHaveProperty("moveQuestion");

    // Verify Legacy methods are present
    expect(result.current).toHaveProperty("handleDelete");
  });

  it("handleDelete should call setDeleteConfirmId from actions", () => {
    const mockSetDeleteConfirmId = vi.fn();
    useQuestionActionsModule.useQuestionActions.mockReturnValue({
      setDeleteConfirmId: mockSetDeleteConfirmId,
      // ... need other props if spread?
      addQuestions: vi.fn(),
      updateQuestionInState: vi.fn(),
    });

    const { result } = renderHook(() =>
      useQuestionManager(mockConfig, mockShowMessage)
    );

    result.current.handleDelete("q1");
    expect(mockSetDeleteConfirmId).toHaveBeenCalledWith("q1");
  });
});
