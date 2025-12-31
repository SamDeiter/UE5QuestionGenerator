import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePendingCount } from "../usePendingCount";

// Mock console.log to suppress debug output during tests
vi.spyOn(console, "log").mockImplementation(() => {});

describe("usePendingCount", () => {
  it("should return 0 for an empty map", () => {
    const { result } = renderHook(() => usePendingCount(new Map()));
    expect(result.current).toBe(0);
  });

  it("should count pending questions correctly", () => {
    const questionsMap = new Map([
      ["q1", [{ uniqueId: "q1", status: "pending", language: "English" }]],
      ["q2", [{ uniqueId: "q2", status: "pending", language: "English" }]],
      ["q3", [{ uniqueId: "q3", status: "accepted", language: "English" }]],
    ]);

    const { result } = renderHook(() => usePendingCount(questionsMap));
    expect(result.current).toBe(2);
  });

  it("should treat questions without status as pending", () => {
    const questionsMap = new Map([
      ["q1", [{ uniqueId: "q1", language: "English" }]], // no status = pending
      ["q2", [{ uniqueId: "q2", status: undefined }]], // undefined = pending
    ]);

    const { result } = renderHook(() => usePendingCount(questionsMap));
    expect(result.current).toBe(2);
  });

  it("should not count accepted or rejected questions", () => {
    const questionsMap = new Map([
      ["q1", [{ uniqueId: "q1", status: "accepted", language: "English" }]],
      ["q2", [{ uniqueId: "q2", status: "rejected", language: "English" }]],
      ["q3", [{ uniqueId: "q3", status: "deleted", language: "English" }]],
    ]);

    const { result } = renderHook(() => usePendingCount(questionsMap));
    expect(result.current).toBe(0);
  });

  it("should use English variant for status when multiple languages exist", () => {
    const questionsMap = new Map([
      [
        "q1",
        [
          { uniqueId: "q1", status: "accepted", language: "Chinese" },
          { uniqueId: "q1", status: "pending", language: "English" }, // This one counts
        ],
      ],
    ]);

    const { result } = renderHook(() => usePendingCount(questionsMap));
    expect(result.current).toBe(1);
  });

  it("should use first variant if no English version exists", () => {
    const questionsMap = new Map([
      [
        "q1",
        [
          { uniqueId: "q1", status: "pending", language: "Japanese" }, // First = canonical
          { uniqueId: "q1", status: "accepted", language: "Korean" },
        ],
      ],
    ]);

    const { result } = renderHook(() => usePendingCount(questionsMap));
    expect(result.current).toBe(1);
  });

  it("should memoize the count based on map reference", () => {
    const questionsMap = new Map([
      ["q1", [{ uniqueId: "q1", status: "pending" }]],
    ]);

    const { result, rerender } = renderHook(({ map }) => usePendingCount(map), {
      initialProps: { map: questionsMap },
    });

    const initialCount = result.current;

    // Rerender with same map reference - should be memoized
    rerender({ map: questionsMap });
    expect(result.current).toBe(initialCount);
  });
});
