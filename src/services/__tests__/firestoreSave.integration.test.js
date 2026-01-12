/**
 * firestoreSave.integration.test.js
 *
 * Integration tests for Firestore save permissions.
 * Tests that the typed save functions correctly filter fields
 * and that reviewers cannot update forbidden fields.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveQuestionAsOwner,
  saveQuestionAsReviewer,
  saveQuestionStatusUpdate,
} from "../firestoreSave";
import { REVIEWER_ALLOWED_FIELDS } from "../../utils/constants";

// Mock Firebase
vi.mock("../firebase", () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock("../firebaseAuth", () => ({
  auth: {
    currentUser: {
      uid: "test-user-123",
      email: "test@example.com",
    },
  },
}));

// Mock Firestore functions
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({ id: "test-doc" })),
  setDoc: (...args) => mockSetDoc(...args),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000 }),
  },
}));

vi.mock("../../utils/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Firestore Save Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("REVIEWER_ALLOWED_FIELDS constant", () => {
    it("should include all status-related fields", () => {
      const statusFields = [
        "status",
        "acceptedAt",
        "acceptedBy",
        "rejectedAt",
        "rejectedBy",
        "rejectionReason",
      ];
      statusFields.forEach((field) => {
        expect(REVIEWER_ALLOWED_FIELDS).toContain(field);
      });
    });

    it("should include all review tracking fields", () => {
      const reviewFields = [
        "reviewerName",
        "reviewDuration",
        "reviewCompletedAt",
        "reviewStartedAt",
        "reviewedBy",
        "reviewedAt",
      ];
      reviewFields.forEach((field) => {
        expect(REVIEWER_ALLOWED_FIELDS).toContain(field);
      });
    });

    it("should NOT include content fields that reviewers cannot modify", () => {
      const forbiddenFields = [
        "question",
        "options",
        "correct",
        "tags",
        "discipline",
        "difficulty",
        "creatorId",
        "creatorEmail",
      ];
      forbiddenFields.forEach((field) => {
        expect(REVIEWER_ALLOWED_FIELDS).not.toContain(field);
      });
    });
  });

  describe("saveQuestionAsReviewer", () => {
    it("should only save allowed fields", async () => {
      const updates = {
        status: "accepted",
        acceptedAt: "2024-01-01",
        acceptedBy: "reviewer@test.com",
        // Forbidden fields that should be filtered out
        question: "This should not be saved",
        options: { A: "a", B: "b" },
        creatorId: "hacker-id",
      };

      await saveQuestionAsReviewer("test-question-id", updates);

      expect(mockSetDoc).toHaveBeenCalled();
      const savedPayload = mockSetDoc.mock.calls[0][1];

      // Should include allowed fields
      expect(savedPayload.status).toBe("accepted");
      expect(savedPayload.acceptedAt).toBe("2024-01-01");
      expect(savedPayload.acceptedBy).toBe("reviewer@test.com");

      // Should NOT include forbidden fields
      expect(savedPayload.question).toBeUndefined();
      expect(savedPayload.options).toBeUndefined();
      expect(savedPayload.creatorId).toBeUndefined();
    });

    it("should add firestoreUpdatedAt timestamp", async () => {
      await saveQuestionAsReviewer("test-id", { status: "pending" });

      const savedPayload = mockSetDoc.mock.calls[0][1];
      expect(savedPayload.firestoreUpdatedAt).toBeDefined();
    });

    it("should return success on successful save", async () => {
      const result = await saveQuestionAsReviewer("test-id", {
        status: "accepted",
      });
      expect(result.success).toBe(true);
    });

    it("should return error on failed save", async () => {
      mockSetDoc.mockRejectedValueOnce(new Error("Permission denied"));

      const result = await saveQuestionAsReviewer("test-id", {
        status: "accepted",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
    });

    it("should reject if questionId is missing", async () => {
      const result = await saveQuestionAsReviewer(null, { status: "accepted" });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing questionId");
    });
  });

  describe("saveQuestionAsOwner", () => {
    it("should save all fields including content", async () => {
      const question = {
        uniqueId: "test-id",
        question: "What is UE5?",
        options: { A: "a", B: "b", C: "c", D: "d" },
        correct: "A",
        status: "pending",
        creatorId: "owner-123",
      };

      await saveQuestionAsOwner(question);

      const savedPayload = mockSetDoc.mock.calls[0][1];

      // Should include ALL fields
      expect(savedPayload.question).toBe("What is UE5?");
      expect(savedPayload.options).toEqual({ A: "a", B: "b", C: "c", D: "d" });
      expect(savedPayload.correct).toBe("A");
      expect(savedPayload.creatorId).toBe("owner-123");
    });

    it("should add creatorId if missing", async () => {
      const question = {
        uniqueId: "test-id",
        question: "Test",
        // No creatorId
      };

      await saveQuestionAsOwner(question);

      const savedPayload = mockSetDoc.mock.calls[0][1];
      expect(savedPayload.creatorId).toBe("test-user-123");
      expect(savedPayload.creatorEmail).toBe("test@example.com");
    });
  });

  describe("saveQuestionStatusUpdate", () => {
    it("should delegate to saveQuestionAsReviewer", async () => {
      const result = await saveQuestionStatusUpdate("test-id", "accepted", {
        acceptedBy: "reviewer@test.com",
        reviewerName: "Test Reviewer",
      });

      expect(mockSetDoc).toHaveBeenCalled();
      const savedPayload = mockSetDoc.mock.calls[0][1];

      expect(savedPayload.status).toBe("accepted");
      expect(savedPayload.acceptedBy).toBe("reviewer@test.com");
      expect(savedPayload.reviewerName).toBe("Test Reviewer");
    });
  });
});
