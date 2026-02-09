/**
 * useTokenUsage Hook Unit Tests
 *
 * Tests the hook that fetches and caches per-user token usage data.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../../services/firebaseQueries", () => ({
  getUserTokenUsageAggregated: vi.fn(),
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
    ANALYTICS_REFRESH_MS: 30000,
  },
}));

import { getUserTokenUsageAggregated } from "../../services/firebaseQueries";
import { getCachedMetadata, cacheMetadata } from "../../services/questionCache";
import { useTokenUsage } from "../useTokenUsage";

describe("useTokenUsage", () => {
  const mockUserId = "test-user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with zero values", () => {
    getCachedMetadata.mockReturnValue(new Promise(() => {}));
    getUserTokenUsageAggregated.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTokenUsage(mockUserId));

    expect(result.current.inputTokens).toBe(0);
    expect(result.current.outputTokens).toBe(0);
    expect(result.current.totalCost).toBe(0);
    expect(result.current.questionCount).toBe(0);
  });

  it("should not fetch when userId is undefined", () => {
    const { result } = renderHook(() => useTokenUsage(undefined));

    expect(getUserTokenUsageAggregated).not.toHaveBeenCalled();
    expect(result.current.totalCost).toBe(0);
  });

  it("should load from cache first for instant header", async () => {
    const cachedUsage = {
      inputTokens: 5000,
      outputTokens: 3000,
      totalCost: 0.08,
      questionCount: 10,
    };
    getCachedMetadata.mockResolvedValue(cachedUsage);
    getUserTokenUsageAggregated.mockResolvedValue({
      estimatedInputTokens: 5500,
      estimatedOutputTokens: 3200,
      totalCost: 0.09,
      questionCount: 11,
    });

    renderHook(() => useTokenUsage(mockUserId));

    await waitFor(() => {
      expect(getCachedMetadata).toHaveBeenCalledWith(
        `token_usage_${mockUserId}`
      );
    });
  });

  it("should fetch fresh data and cache it", async () => {
    const freshUsage = {
      estimatedInputTokens: 10000,
      estimatedOutputTokens: 8000,
      totalCost: 0.18,
      questionCount: 25,
    };
    getCachedMetadata.mockResolvedValue(null);
    getUserTokenUsageAggregated.mockResolvedValue(freshUsage);

    const { result } = renderHook(() => useTokenUsage(mockUserId));

    await waitFor(() => {
      expect(result.current.inputTokens).toBe(10000);
      expect(result.current.outputTokens).toBe(8000);
      expect(result.current.totalCost).toBe(0.18);
      expect(result.current.questionCount).toBe(25);
    });

    expect(cacheMetadata).toHaveBeenCalledWith(
      `token_usage_${mockUserId}`,
      expect.objectContaining({
        inputTokens: 10000,
        outputTokens: 8000,
      })
    );
  });

  it("should handle Firestore errors gracefully", async () => {
    getCachedMetadata.mockResolvedValue(null);
    getUserTokenUsageAggregated.mockRejectedValue(
      new Error("Permission denied")
    );

    const { result } = renderHook(() => useTokenUsage(mockUserId));

    // Should not crash, stays at defaults
    await waitFor(() => {
      expect(result.current.totalCost).toBe(0);
    });
  });

  it("should use user-scoped cache keys", async () => {
    getCachedMetadata.mockResolvedValue(null);
    getUserTokenUsageAggregated.mockResolvedValue({});

    renderHook(() => useTokenUsage("user-abc"));

    await waitFor(() => {
      expect(getCachedMetadata).toHaveBeenCalledWith("token_usage_user-abc");
    });
  });
});
