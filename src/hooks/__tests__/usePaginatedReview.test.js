import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePaginatedReview } from "../usePaginatedReview";
import { getQuestionsPaginatedWithFilters } from "../../services/firebaseQueries";
import { APP_MODES } from "../../utils/constants";

vi.mock("../../services/firebaseQueries", () => ({
  getQuestionsPaginatedWithFilters: vi.fn(),
}));

vi.mock("../../utils/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const baseProps = {
  appMode: APP_MODES.REVIEW,
  filterMode: "pending",
  discipline: "",
  hasMemoryData: false,
  cleanDefault: true,
};

describe("usePaginatedReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does NOT query when not in review mode", () => {
    renderHook(() =>
      usePaginatedReview({ ...baseProps, appMode: APP_MODES.DATABASE })
    );
    expect(getQuestionsPaginatedWithFilters).not.toHaveBeenCalled();
  });

  it("does NOT query when the filter state is not the clean default", () => {
    renderHook(() => usePaginatedReview({ ...baseProps, cleanDefault: false }));
    expect(getQuestionsPaginatedWithFilters).not.toHaveBeenCalled();
  });

  it("does NOT query when the in-memory list is already populated", () => {
    renderHook(() => usePaginatedReview({ ...baseProps, hasMemoryData: true }));
    expect(getQuestionsPaginatedWithFilters).not.toHaveBeenCalled();
  });

  it("does NOT query for the 'all' filter mode (no verified index)", () => {
    renderHook(() => usePaginatedReview({ ...baseProps, filterMode: "all" }));
    expect(getQuestionsPaginatedWithFilters).not.toHaveBeenCalled();
  });

  it("loads + dedups the first page on a clean cold review load", async () => {
    getQuestionsPaginatedWithFilters.mockResolvedValueOnce({
      questions: [
        { uniqueId: "a", status: "pending" },
        { uniqueId: "b", status: "pending" },
        { uniqueId: "a", status: "pending" }, // duplicate uniqueId
      ],
      lastDoc: { id: "b" },
      hasMore: true,
    });

    const { result } = renderHook(() => usePaginatedReview(baseProps));

    await waitFor(() => expect(result.current.questions).toHaveLength(2));
    expect(result.current.hasMore).toBe(true);
    expect(getQuestionsPaginatedWithFilters).toHaveBeenCalledWith({
      status: "pending",
      discipline: null,
      pageSize: 25,
      lastDoc: null,
    });
  });

  it("appends the next page via fetchNextPage", async () => {
    getQuestionsPaginatedWithFilters
      .mockResolvedValueOnce({
        questions: [{ uniqueId: "a" }],
        lastDoc: { id: "a" },
        hasMore: true,
      })
      .mockResolvedValueOnce({
        questions: [{ uniqueId: "b" }],
        lastDoc: { id: "b" },
        hasMore: false,
      });

    const { result } = renderHook(() => usePaginatedReview(baseProps));
    await waitFor(() => expect(result.current.questions).toHaveLength(1));

    await act(async () => {
      result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.questions).toHaveLength(2));
    expect(result.current.hasMore).toBe(false);
  });

  it("passes the selected discipline through to the query", async () => {
    getQuestionsPaginatedWithFilters.mockResolvedValueOnce({
      questions: [],
      lastDoc: null,
      hasMore: false,
    });

    renderHook(() =>
      usePaginatedReview({ ...baseProps, discipline: "Look Dev" })
    );

    await waitFor(() =>
      expect(getQuestionsPaginatedWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ status: "pending", discipline: "Look Dev" })
      )
    );
  });
});
