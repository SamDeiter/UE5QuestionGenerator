/**
 * rateLimitState - Tests for rate limit state manager
 * Tests the reactive state management pattern
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getRateLimitStatus,
  setRateLimitState,
  clearRateLimitState,
  subscribeToRateLimitState,
} from "../rateLimitState";

describe("rateLimitState", () => {
  beforeEach(() => {
    // Clear state between tests
    clearRateLimitState();
  });

  describe("getRateLimitStatus", () => {
    it("returns not limited by default", () => {
      const status = getRateLimitStatus();
      expect(status.isLimited).toBe(false);
      expect(status.remainingSeconds).toBe(0);
    });

    it("returns limited status when set", () => {
      const futureTime = Date.now() + 30000; // 30 seconds from now
      setRateLimitState(true, futureTime);

      const status = getRateLimitStatus();
      expect(status.isLimited).toBe(true);
      expect(status.remainingSeconds).toBeGreaterThan(0);
      expect(status.retryAfter).toBe(futureTime);
    });

    it("returns not limited when time has passed", () => {
      const pastTime = Date.now() - 1000; // 1 second ago
      setRateLimitState(true, pastTime);

      const status = getRateLimitStatus();
      expect(status.isLimited).toBe(false);
      expect(status.remainingSeconds).toBe(0);
    });
  });

  describe("setRateLimitState", () => {
    it("updates isLimited flag", () => {
      setRateLimitState(true, Date.now() + 10000);
      expect(getRateLimitStatus().isLimited).toBe(true);
    });

    it("stores retryAfter timestamp", () => {
      const timestamp = Date.now() + 60000;
      setRateLimitState(true, timestamp);
      expect(getRateLimitStatus().retryAfter).toBe(timestamp);
    });
  });

  describe("clearRateLimitState", () => {
    it("clears limited state", () => {
      setRateLimitState(true, Date.now() + 10000);
      clearRateLimitState();

      const status = getRateLimitStatus();
      expect(status.isLimited).toBe(false);
      expect(status.retryAfter).toBe(0);
    });
  });

  describe("subscribeToRateLimitState", () => {
    it("calls callback when state changes", () => {
      const callback = vi.fn();
      subscribeToRateLimitState(callback);

      setRateLimitState(true, Date.now() + 10000);

      expect(callback).toHaveBeenCalled();
    });

    it("returns unsubscribe function", () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToRateLimitState(callback);

      // First call should work
      setRateLimitState(true, Date.now() + 10000);
      expect(callback).toHaveBeenCalledTimes(1);

      // Unsubscribe and set again
      unsubscribe();
      clearRateLimitState();

      // Callback should not be called again
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("multiple subscribers receive updates", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      subscribeToRateLimitState(callback1);
      subscribeToRateLimitState(callback2);

      setRateLimitState(true, Date.now() + 10000);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it("passes status to callback", () => {
      const callback = vi.fn();
      subscribeToRateLimitState(callback);

      const futureTime = Date.now() + 30000;
      setRateLimitState(true, futureTime);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isLimited: true,
          retryAfter: futureTime,
        })
      );
    });
  });
});
