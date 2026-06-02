/**
 * firebaseQueries — Tier 3b read-switch + on-demand full-doc resolver.
 *
 * Covers the parts that make the compact-index mode correct and reversible:
 *   • getFullQuestionDoc keys on the DOC ID and always reads `questions`,
 *   • it memoizes, and invalidateFullDocMemo evicts,
 *   • getFullQuestionDocs drops misses,
 *   • hydrateQuestionDetails is a no-op while USE_INDEX is false (the shipped
 *     default), and
 *   • the bulk delta read targets `questions` under the shipped flag.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeDb = { __db: true };

// --- firebase/firestore mock -------------------------------------------------
const getDoc = vi.fn();
const getDocs = vi.fn();
const doc = vi.fn((db, coll, id) => ({ __doc: true, coll, id }));
const collection = vi.fn((db, coll) => ({ __coll: true, coll }));

vi.mock("firebase/firestore", () => ({
  query: vi.fn((...args) => ({ __query: true, args })),
  where: vi.fn((f, op, v) => ({ __where: [f, op, v] })),
  orderBy: vi.fn((f, dir) => ({ __orderBy: [f, dir] })),
  limit: vi.fn((n) => ({ __limit: n })),
  startAfter: vi.fn((c) => ({ __startAfter: c })),
  documentId: vi.fn(() => "__name__"),
  onSnapshot: vi.fn(),
  Timestamp: { fromMillis: vi.fn((ms) => ({ __ts: ms })) },
  getDoc: (...a) => getDoc(...a),
  getDocs: (...a) => getDocs(...a),
  doc: (...a) => doc(...a),
  collection: (...a) => collection(...a),
}));

vi.mock("../../utils/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../utils/constants", () => ({
  TIMING: { CACHE_TTL_MS: 300000 },
  FIRESTORE_LIMITS: { FULL_SYNC_COUNT: 25000, DEFAULT_PAGE_SIZE: 50 },
  QUESTION_SOURCES: { DATABASE: "database", IMPORT: "import" },
  INDEX_OMITTED_FIELDS: [
    "sourceExcerpt",
    "sourceUrl",
    "explanation",
    "groundingSources",
    "editHistory",
  ],
}));

vi.mock("../../utils/firestoreHelpers", () => ({
  toMillis: vi.fn(() => 0),
}));

vi.mock("../firebaseAuth", () => ({
  auth: { currentUser: { uid: "tester" } },
  firebaseConfig: { projectId: "test" },
}));

vi.mock("../firebaseSave", () => ({
  getDb: vi.fn(() => fakeDb),
}));

vi.mock("../questionCache", () => ({
  getCachedQuestions: vi.fn(),
  cacheQuestions: vi.fn(),
  isCacheValid: vi.fn(),
  clearCache: vi.fn(),
  updateCachedQuestion: vi.fn(),
  deleteCachedQuestion: vi.fn(),
  setLastSyncTime: vi.fn(),
}));

vi.mock("../../utils/questionDocParser", () => ({
  parseQuestionDoc: vi.fn((raw) => ({
    valid: true,
    errors: [],
    question: { ...raw, id: raw.id },
  })),
}));

vi.mock("../../utils/listenerTracker", () => ({
  registerListener: vi.fn(() => "lid"),
  unregisterListener: vi.fn(),
}));

import {
  USE_INDEX,
  getFullQuestionDoc,
  getFullQuestionDocs,
  hydrateQuestionDetails,
  invalidateFullDocMemo,
  getQuestionsUpdatedSince,
} from "../firebaseQueries";

const snap = (id, exists, data) => ({
  exists: () => exists,
  id,
  data: () => data,
});

describe("firebaseQueries Tier 3b", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // memo persists across tests in-module; evict known ids used below.
    invalidateFullDocMemo(
      "uid-1",
      "uid-1_Korean",
      "miss",
      "uid-a",
      "uid-b",
      "memo-1"
    );
  });

  it("ships with USE_INDEX disabled", () => {
    expect(USE_INDEX).toBe(false);
  });

  describe("getFullQuestionDoc", () => {
    it("reads the `questions` collection by the given DOC ID", async () => {
      getDoc.mockResolvedValueOnce(snap("uid-1_Korean", true, { q: 1 }));
      const result = await getFullQuestionDoc("uid-1_Korean");
      expect(doc).toHaveBeenCalledWith(fakeDb, "questions", "uid-1_Korean");
      expect(result.id).toBe("uid-1_Korean");
    });

    it("returns null when the doc is missing", async () => {
      getDoc.mockResolvedValueOnce(snap("miss", false, null));
      expect(await getFullQuestionDoc("miss")).toBeNull();
    });

    it("returns null for a falsy id without hitting Firestore", async () => {
      expect(await getFullQuestionDoc(undefined)).toBeNull();
      expect(getDoc).not.toHaveBeenCalled();
    });

    it("memoizes: a second call does not re-fetch", async () => {
      getDoc.mockResolvedValueOnce(snap("memo-1", true, { q: 1 }));
      await getFullQuestionDoc("memo-1");
      await getFullQuestionDoc("memo-1");
      expect(getDoc).toHaveBeenCalledTimes(1);
    });

    it("invalidateFullDocMemo forces a re-fetch", async () => {
      getDoc.mockResolvedValue(snap("uid-1", true, { q: 1 }));
      await getFullQuestionDoc("uid-1");
      invalidateFullDocMemo("uid-1");
      await getFullQuestionDoc("uid-1");
      expect(getDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe("getFullQuestionDocs", () => {
    it("drops docs that don't resolve", async () => {
      getDoc
        .mockResolvedValueOnce(snap("uid-a", true, { q: "a" }))
        .mockResolvedValueOnce(snap("uid-b", false, null));
      const res = await getFullQuestionDocs(["uid-a", "uid-b"]);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe("uid-a");
    });

    it("returns [] for empty input", async () => {
      expect(await getFullQuestionDocs([])).toEqual([]);
      expect(getDoc).not.toHaveBeenCalled();
    });
  });

  describe("hydrateQuestionDetails", () => {
    it("is a no-op (returns the same list) while USE_INDEX is false", async () => {
      const list = [{ id: "uid-1", question: "Q" }];
      const out = await hydrateQuestionDetails(list);
      expect(out).toBe(list); // same reference — no fetch, no copy
      expect(getDoc).not.toHaveBeenCalled();
    });
  });

  describe("read-collection wiring (flag = false)", () => {
    it("getQuestionsUpdatedSince reads from `questions`", async () => {
      getDocs.mockResolvedValueOnce({ forEach: () => {} });
      await getQuestionsUpdatedSince(1000);
      expect(collection).toHaveBeenCalledWith(fakeDb, "questions");
    });
  });
});
