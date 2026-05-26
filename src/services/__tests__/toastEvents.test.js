/**
 * Toast Events Service Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { subscribeToToasts, emitToast, toastError } from "../toastEvents";

describe("toastEvents", () => {
  let callback;
  let unsubscribe;

  beforeEach(() => {
    callback = vi.fn();
  });

  afterEach(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  describe("subscribeToToasts", () => {
    it("returns an unsubscribe function", () => {
      unsubscribe = subscribeToToasts(callback);
      expect(typeof unsubscribe).toBe("function");
    });

    it("receives emitted toasts", () => {
      unsubscribe = subscribeToToasts(callback);
      emitToast("Test message", "info");
      expect(callback).toHaveBeenCalledWith("Test message", "info", undefined);
    });

    it("stops receiving after unsubscribe", () => {
      unsubscribe = subscribeToToasts(callback);
      unsubscribe();
      emitToast("Test message", "info");
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("emitToast", () => {
    it("emits to all subscribers", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const unsub1 = subscribeToToasts(callback1);
      const unsub2 = subscribeToToasts(callback2);

      emitToast("Broadcast", "success");

      expect(callback1).toHaveBeenCalledWith("Broadcast", "success", undefined);
      expect(callback2).toHaveBeenCalledWith("Broadcast", "success", undefined);

      unsub1();
      unsub2();
    });

    it("defaults to error type", () => {
      unsubscribe = subscribeToToasts(callback);
      emitToast("Error message");
      expect(callback).toHaveBeenCalledWith(
        "Error message",
        "error",
        undefined
      );
    });

    it("passes duration parameter", () => {
      unsubscribe = subscribeToToasts(callback);
      emitToast("Timed message", "info", 5000);
      expect(callback).toHaveBeenCalledWith("Timed message", "info", 5000);
    });
  });

  describe("helper functions", () => {
    beforeEach(() => {
      unsubscribe = subscribeToToasts(callback);
    });

    it("toastError emits error type", () => {
      toastError("Error!");
      expect(callback).toHaveBeenCalledWith("Error!", "error", undefined);
    });

    it("toastError passes duration", () => {
      toastError("Quick toast", 1000);
      expect(callback).toHaveBeenCalledWith("Quick toast", "error", 1000);
    });
  });
});
