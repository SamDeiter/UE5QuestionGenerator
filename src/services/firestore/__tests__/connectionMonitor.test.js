/**
 * Connection Monitor Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../firebaseSave", () => ({
  getConnectionStatus: vi.fn(),
  getQueueDetails: vi.fn(),
  getQueuedQuestionIds: vi.fn(),
  triggerManualSync: vi.fn(),
  subscribeToConnectionStatus: vi.fn(),
}));

import * as firebaseSave from "../../firebaseSave";
import {
  getConnectionStatus,
  getQueueDetails,
  getQueuedIds,
  triggerManualSync,
  subscribeToConnectionStatus,
  isQuestionQueued,
} from "../connectionMonitor";

describe("connectionMonitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getConnectionStatus", () => {
    it("is bound to firebaseSave.getConnectionStatus", () => {
      expect(getConnectionStatus).toBe(firebaseSave.getConnectionStatus);
    });
  });

  describe("getQueueDetails", () => {
    it("is bound to firebaseSave.getQueueDetails", () => {
      expect(getQueueDetails).toBe(firebaseSave.getQueueDetails);
    });
  });

  describe("getQueuedIds", () => {
    it("is bound to firebaseSave.getQueuedQuestionIds", () => {
      expect(getQueuedIds).toBe(firebaseSave.getQueuedQuestionIds);
    });
  });

  describe("triggerManualSync", () => {
    it("is bound to firebaseSave.triggerManualSync", () => {
      expect(triggerManualSync).toBe(firebaseSave.triggerManualSync);
    });
  });

  describe("subscribeToConnectionStatus", () => {
    it("is bound to firebaseSave.subscribeToConnectionStatus", () => {
      expect(subscribeToConnectionStatus).toBe(
        firebaseSave.subscribeToConnectionStatus
      );
    });
  });

  describe("isQuestionQueued", () => {
    it("returns true if question is in queue", () => {
      firebaseSave.getQueuedQuestionIds.mockReturnValue(
        new Set(["q1", "q2", "q3"])
      );

      expect(isQuestionQueued("q2")).toBe(true);
    });

    it("returns false if question is not in queue", () => {
      firebaseSave.getQueuedQuestionIds.mockReturnValue(new Set(["q1"]));

      expect(isQuestionQueued("q999")).toBe(false);
    });

    it("returns false for empty queue", () => {
      firebaseSave.getQueuedQuestionIds.mockReturnValue(new Set());

      expect(isQuestionQueued("q1")).toBe(false);
    });
  });
});
