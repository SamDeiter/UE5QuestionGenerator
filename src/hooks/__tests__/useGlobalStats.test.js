/**
 * useGlobalStats Hook Unit Tests
 *
 * Tests the hook that fetches and caches global project statistics.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../../services/firebaseQueries", () => ({
  getQuestionStats: vi.fn(),
}));

vi.mock("../../services/questionCache", () => ({
  getCachedMetadata: vi.fn(),
  cacheMetadata: vi.fn(),
}));

vi.mock("../../utils/logger", () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../utils/constants", () => ({
  TIMING: {
    STATS_POLL_INTERVAL: 300000,
  },
}));

import { getQuestionStats } from "../../services/firebaseQueries";
import { getCachedMetadata, cacheMetadata } from "../../services/questionCache";
import { useGlobalStats } from "../useGlobalStats";

describe("useGlobalStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with null stats and loading true", () => {
    getQuestionStats.mockReturnValue(new Promise(() => {})); // never resolves
    getCachedMetadata.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useGlobalStats());

    expect(result.current.globalStats).toBeNull();
    expect(result.current.statsLoading).toBe(true);
  });

  it("should load from cache first for instant feedback", async () => {
    const cachedData = { totalQuestions: 100, byStatus: { accepted: 50 } };
    getCachedMetadata.mockResolvedValue(cachedData);
    getQuestionStats.mockResolvedValue(cachedData);

    const { result } = renderHook(() => useGlobalStats());

    await waitFor(() => {
      expect(result.current.globalStats).toEqual(cachedData);
    });

    expect(getCachedMetadata).toHaveBeenCalledWith("global_stats");
  });

  it("should fetch fresh data from Firestore and cache it", async () => {
    const freshData = { totalQuestions: 200, byStatus: { accepted: 120 } };
    getCachedMetadata.mockResolvedValue(null);
    getQuestionStats.mockResolvedValue(freshData);

    const { result } = renderHook(() => useGlobalStats());

    await waitFor(() => {
      expect(result.current.globalStats).toEqual(freshData);
      expect(result.current.statsLoading).toBe(false);
    });

    expect(cacheMetadata).toHaveBeenCalledWith("global_stats", freshData);
  });

  it("should handle Firestore errors gracefully", async () => {
    getCachedMetadata.mockResolvedValue(null);
    getQuestionStats.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useGlobalStats());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.statsLoading).toBe(false);
    });
  });

  it("should still show cached data when Firestore fails", async () => {
    const cachedData = { totalQuestions: 100 };
    getCachedMetadata.mockResolvedValue(cachedData);
    getQuestionStats.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useGlobalStats());

    await waitFor(() => {
      expect(result.current.globalStats).toEqual(cachedData);
    });
  });

  it("should expose a refreshStats function", async () => {
    getCachedMetadata.mockResolvedValue(null);
    getQuestionStats.mockResolvedValue({ totalQuestions: 10 });

    const { result } = renderHook(() => useGlobalStats());

    await waitFor(() => {
      expect(typeof result.current.refreshStats).toBe("function");
    });
  });
});
