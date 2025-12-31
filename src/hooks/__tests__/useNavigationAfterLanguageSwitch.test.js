import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNavigationAfterLanguageSwitch } from "../useNavigationAfterLanguageSwitch";

// Mock console.log to suppress debug output during tests
vi.spyOn(console, "log").mockImplementation(() => {});

describe("useNavigationAfterLanguageSwitch", () => {
  it("should not navigate when pendingNavigationUniqueId is null", () => {
    const setCurrentReviewIndex = vi.fn();
    const setPendingNavigationUniqueId = vi.fn();

    renderHook(() =>
      useNavigationAfterLanguageSwitch({
        pendingNavigationUniqueId: null,
        uniqueFilteredQuestions: [{ uniqueId: "q1" }],
        setCurrentReviewIndex,
        setPendingNavigationUniqueId,
      })
    );

    expect(setCurrentReviewIndex).not.toHaveBeenCalled();
    expect(setPendingNavigationUniqueId).not.toHaveBeenCalled();
  });

  it("should not navigate when questions array is empty", () => {
    const setCurrentReviewIndex = vi.fn();
    const setPendingNavigationUniqueId = vi.fn();

    renderHook(() =>
      useNavigationAfterLanguageSwitch({
        pendingNavigationUniqueId: "q1",
        uniqueFilteredQuestions: [],
        setCurrentReviewIndex,
        setPendingNavigationUniqueId,
      })
    );

    expect(setCurrentReviewIndex).not.toHaveBeenCalled();
    expect(setPendingNavigationUniqueId).not.toHaveBeenCalled();
  });

  it("should navigate to the correct index when question is found", () => {
    const setCurrentReviewIndex = vi.fn();
    const setPendingNavigationUniqueId = vi.fn();

    renderHook(() =>
      useNavigationAfterLanguageSwitch({
        pendingNavigationUniqueId: "q2",
        uniqueFilteredQuestions: [
          { uniqueId: "q1" },
          { uniqueId: "q2" }, // index 1
          { uniqueId: "q3" },
        ],
        setCurrentReviewIndex,
        setPendingNavigationUniqueId,
      })
    );

    expect(setCurrentReviewIndex).toHaveBeenCalledWith(1);
    expect(setPendingNavigationUniqueId).toHaveBeenCalledWith(null);
  });

  it("should clear pending navigation even when question is not found", () => {
    const setCurrentReviewIndex = vi.fn();
    const setPendingNavigationUniqueId = vi.fn();

    renderHook(() =>
      useNavigationAfterLanguageSwitch({
        pendingNavigationUniqueId: "non-existent",
        uniqueFilteredQuestions: [{ uniqueId: "q1" }],
        setCurrentReviewIndex,
        setPendingNavigationUniqueId,
      })
    );

    // Should NOT set index since question not found
    expect(setCurrentReviewIndex).not.toHaveBeenCalled();
    // But SHOULD clear the pending navigation
    expect(setPendingNavigationUniqueId).toHaveBeenCalledWith(null);
  });

  it("should navigate to first question (index 0) when first item matches", () => {
    const setCurrentReviewIndex = vi.fn();
    const setPendingNavigationUniqueId = vi.fn();

    renderHook(() =>
      useNavigationAfterLanguageSwitch({
        pendingNavigationUniqueId: "q1",
        uniqueFilteredQuestions: [
          { uniqueId: "q1" }, // index 0
          { uniqueId: "q2" },
        ],
        setCurrentReviewIndex,
        setPendingNavigationUniqueId,
      })
    );

    expect(setCurrentReviewIndex).toHaveBeenCalledWith(0);
    expect(setPendingNavigationUniqueId).toHaveBeenCalledWith(null);
  });

  it("should trigger navigation when pendingNavigationUniqueId changes", () => {
    const setCurrentReviewIndex = vi.fn();
    const setPendingNavigationUniqueId = vi.fn();

    const questions = [{ uniqueId: "q1" }, { uniqueId: "q2" }];

    const { rerender } = renderHook(
      ({ pendingId }) =>
        useNavigationAfterLanguageSwitch({
          pendingNavigationUniqueId: pendingId,
          uniqueFilteredQuestions: questions,
          setCurrentReviewIndex,
          setPendingNavigationUniqueId,
        }),
      { initialProps: { pendingId: null } }
    );

    expect(setCurrentReviewIndex).not.toHaveBeenCalled();

    // Simulate language switch by setting a pending navigation
    rerender({ pendingId: "q2" });

    expect(setCurrentReviewIndex).toHaveBeenCalledWith(1);
    expect(setPendingNavigationUniqueId).toHaveBeenCalledWith(null);
  });
});
