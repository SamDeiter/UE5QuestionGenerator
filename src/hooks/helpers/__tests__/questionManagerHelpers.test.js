import { describe, it, expect } from "vitest";
import {
  findQuestionById,
  validateDocumentId,
  needsCreatorBackfill,
  buildStatusUpdate,
  isDeleteStatus,
  estimateReviewStartTime,
} from "../questionManagerHelpers";

describe("questionManagerHelpers", () => {
  describe("validateDocumentId", () => {
    it("should accept valid string IDs", () => {
      const result = validateDocumentId({ id: "abc123" });
      expect(result.isValid).toBe(true);
      expect(result.docId).toBe("abc123");
    });

    it("should convert numeric IDs to strings", () => {
      const result = validateDocumentId({ id: 12345 });
      expect(result.isValid).toBe(true);
      expect(result.docId).toBe("12345");
    });

    it("should fall back to uniqueId if id is missing", () => {
      const result = validateDocumentId({ uniqueId: "unique-abc" });
      expect(result.isValid).toBe(true);
      expect(result.docId).toBe("unique-abc");
    });

    it("should reject null/undefined IDs", () => {
      const result = validateDocumentId({});
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Question has invalid ID");
    });
  });

  describe("needsCreatorBackfill", () => {
    it("should return true for missing creatorName", () => {
      expect(needsCreatorBackfill({})).toBe(true);
    });

    it("should return true for N/A", () => {
      expect(needsCreatorBackfill({ creatorName: "N/A" })).toBe(true);
    });

    it("should return true for Unknown", () => {
      expect(needsCreatorBackfill({ creatorName: "Unknown" })).toBe(true);
    });

    it("should return false for valid name", () => {
      expect(needsCreatorBackfill({ creatorName: "John Doe" })).toBe(false);
    });
  });

  describe("buildStatusUpdate", () => {
    const baseQuestion = {
      id: "q1",
      text: "Test question",
      status: "pending",
      critique: { score: 75 },
    };

    it("should set accepted status and clear critique", () => {
      const result = buildStatusUpdate(baseQuestion, "accepted");
      expect(result.status).toBe("accepted");
      expect(result.critique).toBeNull();
      expect(result.acceptedAt).toBeTruthy();
    });

    it("should set rejected status with reason", () => {
      const result = buildStatusUpdate(baseQuestion, "rejected", "Too easy");
      expect(result.status).toBe("rejected");
      expect(result.rejectionReason).toBe("Too easy");
      expect(result.rejectedAt).toBeTruthy();
    });

    it("should preserve critique for pending status", () => {
      const result = buildStatusUpdate(baseQuestion, "pending");
      expect(result.critique).toEqual({ score: 75 });
    });
  });

  describe("isDeleteStatus", () => {
    it("should return true for deleted", () => {
      expect(isDeleteStatus("deleted")).toBe(true);
    });

    it("should return false for other statuses", () => {
      expect(isDeleteStatus("accepted")).toBe(false);
      expect(isDeleteStatus("pending")).toBe(false);
      expect(isDeleteStatus("rejected")).toBe(false);
    });
  });

  describe("estimateReviewStartTime", () => {
    it("should return a timestamp ~30 seconds ago", () => {
      const result = new Date(estimateReviewStartTime()).getTime();
      const expected = Date.now() - 30000;
      // Allow 1 second tolerance
      expect(Math.abs(result - expected)).toBeLessThan(1000);
    });
  });

  describe("findQuestionById", () => {
    const questions = [{ id: "q2", text: "Q2" }];
    const historical = [{ id: "q3", text: "Q3" }];

    it("should find in allQuestionsMap by uniqueId key", () => {
      // Map key is uniqueId, function looks up by that key then finds by id in variants
      const mapWithVariants = new Map([
        ["uid1", [{ id: "q1", uniqueId: "uid1", text: "Q1" }]],
      ]);
      // Pass the uniqueId as first arg since that's the map key
      const result = findQuestionById("uid1", mapWithVariants, [], []);
      expect(result).not.toBeNull();
      expect(result.text).toBe("Q1");
    });

    it("should find in questions array", () => {
      const result = findQuestionById("q2", new Map(), questions, []);
      expect(result.text).toBe("Q2");
    });

    it("should find in historical array", () => {
      const result = findQuestionById("q3", new Map(), [], historical);
      expect(result.text).toBe("Q3");
    });

    it("should return null if not found", () => {
      const result = findQuestionById("q99", new Map(), [], []);
      expect(result).toBeNull();
    });
  });
});
