/**
 * questionCache — DB_VERSION upgrade path tests.
 *
 * v2 bump: drop & recreate `questions` store for compact index shape while
 *          preserving the `meta` store (incremental-sync watermark).
 * v3 bump: drop & recreate `questions` store, switching keyPath from
 *          "uniqueId" to "id" so all language variants coexist in the cache
 *          (previously they collided at the same key, losing all but one).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let capturedUpgrade = null;
let capturedVersion = null;

vi.mock("idb", () => ({
  openDB: vi.fn((name, version, opts) => {
    capturedVersion = version;
    capturedUpgrade = opts.upgrade;
    return Promise.resolve({
      // minimal surface for getCacheStats() to resolve without throwing
      count: vi.fn(() => Promise.resolve(0)),
      get: vi.fn(() => Promise.resolve(null)),
    });
  }),
}));

vi.mock("../../utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
}));

vi.mock("../../utils/constants", () => ({
  FIRESTORE_LIMITS: { CACHE_TTL_MS: 300000 },
}));

import { getCacheStats } from "../questionCache";

/** A fake IDBDatabase that records store create/delete operations. */
const makeFakeDb = (existing = []) => {
  const stores = new Set(existing);
  return {
    _stores: stores,
    created: [],
    deleted: [],
    objectStoreNames: { contains: (n) => stores.has(n) },
    createObjectStore: vi.fn((name) => {
      stores.add(name);
      return { createIndex: vi.fn() };
    }),
    deleteObjectStore: vi.fn((name) => {
      stores.delete(name);
    }),
  };
};

describe("questionCache DB_VERSION 3 upgrade", () => {
  beforeEach(async () => {
    // Trigger getDB() → openDB() so the upgrade callback is captured.
    await getCacheStats();
  });

  it("opens at version 3", () => {
    expect(capturedVersion).toBe(3);
    expect(typeof capturedUpgrade).toBe("function");
  });

  it("fresh install (oldVersion 0): creates questions + meta, deletes nothing", () => {
    const db = makeFakeDb([]);
    capturedUpgrade(db, 0);
    expect(db.deleteObjectStore).not.toHaveBeenCalled();
    expect(db.createObjectStore).toHaveBeenCalledWith("questions", {
      keyPath: "id",
    });
    expect(db._stores.has("questions")).toBe(true);
    expect(db._stores.has("meta")).toBe(true);
  });

  it("v2 -> v3: drops & recreates `questions` with new keyPath, leaves `meta` untouched", () => {
    const db = makeFakeDb(["questions", "meta"]);
    capturedUpgrade(db, 2);
    // questions store dropped then recreated with "id" keyPath
    expect(db.deleteObjectStore).toHaveBeenCalledWith("questions");
    expect(db.createObjectStore).toHaveBeenCalledWith("questions", {
      keyPath: "id",
    });
    // meta NOT dropped (watermark preserved) and not recreated
    expect(db.deleteObjectStore).not.toHaveBeenCalledWith("meta");
    expect(db.createObjectStore).not.toHaveBeenCalledWith("meta");
    expect(db._stores.has("questions")).toBe(true);
    expect(db._stores.has("meta")).toBe(true);
  });

  it("v1 -> v3: drops & recreates `questions`, leaves `meta` untouched", () => {
    const db = makeFakeDb(["questions", "meta"]);
    capturedUpgrade(db, 1);
    expect(db.deleteObjectStore).toHaveBeenCalledWith("questions");
    expect(db.createObjectStore).toHaveBeenCalledWith("questions", {
      keyPath: "id",
    });
    expect(db.deleteObjectStore).not.toHaveBeenCalledWith("meta");
    expect(db._stores.has("questions")).toBe(true);
    expect(db._stores.has("meta")).toBe(true);
  });

  it("recreated questions store gets its indexes", () => {
    const db = makeFakeDb(["questions", "meta"]);
    // capture the store handle to assert indexes
    let handle;
    db.createObjectStore.mockImplementation(() => {
      handle = { createIndex: vi.fn() };
      return handle;
    });
    capturedUpgrade(db, 2);
    expect(handle.createIndex).toHaveBeenCalledWith("status", "status");
    expect(handle.createIndex).toHaveBeenCalledWith("discipline", "discipline");
    expect(handle.createIndex).toHaveBeenCalledWith(
      "firestoreUpdatedAt",
      "firestoreUpdatedAt"
    );
  });
});
