/**
 * Question Repository Unit Tests
 *
 * Tests the questionRepository facade layer.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the underlying modules
vi.mock("../../firebaseQueries", () => ({
  getQuestionsFromFirestore: vi.fn(),
  getAllQuestionsFromFirestore: vi.fn(),
  subscribeToAllQuestions: vi.fn(),
  getQuestionsPaginated: vi.fn(),
  getQuestionsPaginatedWithFilters: vi.fn(),
  deleteQuestionFromFirestore: vi.fn(),
  clearAllQuestionsFromFirestore: vi.fn(),
  deleteSoftDeletedQuestionsFromFirestore: vi.fn(),
  invalidateQuestionsCache: vi.fn(),
}));

vi.mock("../../firebaseSave", () => ({
  saveQuestionToFirestore: vi.fn(),
  batchSaveQuestions: vi.fn(),
}));

import * as firebaseQueries from "../../firebaseQueries";
import * as firebaseSave from "../../firebaseSave";
import { questions } from "../questionRepository";

describe("questionRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // getAll
  // ============================================================
  describe("getAll", () => {
    it("calls getAllQuestionsFromFirestore with default options", async () => {
      const mockQuestions = [{ id: "q1" }, { id: "q2" }];
      firebaseQueries.getAllQuestionsFromFirestore.mockResolvedValue(
        mockQuestions
      );

      const result = await questions.getAll();

      expect(firebaseQueries.getAllQuestionsFromFirestore).toHaveBeenCalledWith(
        undefined,
        false,
        undefined
      );
      expect(result).toEqual(mockQuestions);
    });

    it("passes limit option", async () => {
      firebaseQueries.getAllQuestionsFromFirestore.mockResolvedValue([]);

      await questions.getAll({ limit: 10 });

      expect(firebaseQueries.getAllQuestionsFromFirestore).toHaveBeenCalledWith(
        undefined,
        false,
        10
      );
    });

    it("passes forceRefresh option", async () => {
      firebaseQueries.getAllQuestionsFromFirestore.mockResolvedValue([]);

      await questions.getAll({ forceRefresh: true });

      expect(firebaseQueries.getAllQuestionsFromFirestore).toHaveBeenCalledWith(
        undefined,
        true,
        undefined
      );
    });

    it("propagates errors", async () => {
      const error = new Error("Firestore error");
      firebaseQueries.getAllQuestionsFromFirestore.mockRejectedValue(error);

      await expect(questions.getAll()).rejects.toThrow("Firestore error");
    });
  });

  // ============================================================
  // getForCurrentUser
  // ============================================================
  describe("getForCurrentUser", () => {
    it("is bound to getQuestionsFromFirestore", () => {
      expect(questions.getForCurrentUser).toBe(
        firebaseQueries.getQuestionsFromFirestore
      );
    });
  });

  // ============================================================
  // subscribe
  // ============================================================
  describe("subscribe", () => {
    it("calls subscribeToAllQuestions with callback", () => {
      const callback = vi.fn();
      const unsubscribe = vi.fn();
      firebaseQueries.subscribeToAllQuestions.mockReturnValue(unsubscribe);

      const result = questions.subscribe(callback);

      expect(firebaseQueries.subscribeToAllQuestions).toHaveBeenCalledWith(
        callback,
        undefined
      );
      expect(result).toBe(unsubscribe);
    });

    it("passes maxResults option", () => {
      const callback = vi.fn();
      firebaseQueries.subscribeToAllQuestions.mockReturnValue(vi.fn());

      questions.subscribe(callback, { maxResults: 50 });

      expect(firebaseQueries.subscribeToAllQuestions).toHaveBeenCalledWith(
        callback,
        50
      );
    });
  });

  // ============================================================
  // getPaginated
  // ============================================================
  describe("getPaginated", () => {
    it("calls getQuestionsPaginated with default options", async () => {
      const mockResult = { questions: [], lastDoc: null, hasMore: false };
      firebaseQueries.getQuestionsPaginated.mockResolvedValue(mockResult);

      await questions.getPaginated("user-123");

      expect(firebaseQueries.getQuestionsPaginated).toHaveBeenCalledWith(
        "user-123",
        20, // DEFAULT_PAGE_SIZE
        null
      );
    });

    it("uses custom limit and lastDoc", async () => {
      const lastDoc = { id: "doc-5" };
      firebaseQueries.getQuestionsPaginated.mockResolvedValue({});

      await questions.getPaginated("user-123", { limit: 10, lastDoc });

      expect(firebaseQueries.getQuestionsPaginated).toHaveBeenCalledWith(
        "user-123",
        10,
        lastDoc
      );
    });
  });

  // ============================================================
  // getFiltered
  // ============================================================
  describe("getFiltered", () => {
    it("calls getQuestionsPaginatedWithFilters", async () => {
      firebaseQueries.getQuestionsPaginatedWithFilters.mockResolvedValue({});

      await questions.getFiltered({
        status: "pending",
        discipline: "Blueprint",
      });

      expect(
        firebaseQueries.getQuestionsPaginatedWithFilters
      ).toHaveBeenCalledWith({
        status: "pending",
        discipline: "Blueprint",
        pageSize: 20,
        lastDoc: null,
        orderByField: "firestoreUpdatedAt",
        orderDirection: "desc",
      });
    });
  });

  // ============================================================
  // getByStatus
  // ============================================================
  describe("getByStatus", () => {
    it("calls getQuestionsPaginatedWithFilters with status", async () => {
      firebaseQueries.getQuestionsPaginatedWithFilters.mockResolvedValue({});

      await questions.getByStatus("approved");

      expect(
        firebaseQueries.getQuestionsPaginatedWithFilters
      ).toHaveBeenCalledWith({ status: "approved" });
    });
  });

  // ============================================================
  // save
  // ============================================================
  describe("save", () => {
    it("is bound to saveQuestionToFirestore", () => {
      expect(questions.save).toBe(firebaseSave.saveQuestionToFirestore);
    });
  });

  // ============================================================
  // saveBatch
  // ============================================================
  describe("saveBatch", () => {
    it("is bound to batchSaveQuestions", () => {
      expect(questions.saveBatch).toBe(firebaseSave.batchSaveQuestions);
    });
  });

  // ============================================================
  // delete
  // ============================================================
  describe("delete", () => {
    it("is bound to deleteQuestionFromFirestore", () => {
      expect(questions.delete).toBe(
        firebaseQueries.deleteQuestionFromFirestore
      );
    });
  });

  // ============================================================
  // deleteAll
  // ============================================================
  describe("deleteAll", () => {
    it("is bound to clearAllQuestionsFromFirestore", () => {
      expect(questions.deleteAll).toBe(
        firebaseQueries.clearAllQuestionsFromFirestore
      );
    });
  });

  // ============================================================
  // invalidateCache
  // ============================================================
  describe("invalidateCache", () => {
    it("is bound to invalidateQuestionsCache", () => {
      expect(questions.invalidateCache).toBe(
        firebaseQueries.invalidateQuestionsCache
      );
    });
  });
});
