/**
 * questionCache — DB_VERSION 2 upgrade path (Tier 3b).
 *
 * The v2 bump must drop & recreate the `questions` store (so it refills with
 * the compact index shape) while preserving the `meta` store (the
 * incremental-sync watermark). A regression here would either wipe the
 * watermark (forcing redundant full re-syncs) or leave heavy/light docs mixed.
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

describe("questionCache DB_VERSION 2 upgrade", () => {
  beforeEach(async () => {
    // Trigger getDB() → openDB() so the upgrade callback is captured.
    await getCacheStats();
  });

  it("opens at version 2", () => {
    expect(capturedVersion).toBe(2);
    expect(typeof capturedUpgrade).toBe("function");
  });

  it("fresh install (oldVersion 0): creates questions + meta, deletes nothing", () => {
    const db = makeFakeDb([]);
    capturedUpgrade(db, 0);
    expect(db.deleteObjectStore).not.toHaveBeenCalled();
    expect(db.createObjectStore).toHaveBeenCalledWith("questions", {
      keyPath: "uniqueId",
    });
    expect(db._stores.has("questions")).toBe(true);
    expect(db._stores.has("meta")).toBe(true);
  });

  it("v1 -> v2: drops & recreates `questions`, leaves `meta` untouched", () => {
    const db = makeFakeDb(["questions", "meta"]);
    capturedUpgrade(db, 1);
    // questions store dropped then recreated...
    expect(db.deleteObjectStore).toHaveBeenCalledWith("questions");
    expect(db.createObjectStore).toHaveBeenCalledWith("questions", {
      keyPath: "uniqueId",
    });
    // ...meta NOT dropped (watermark preserved) and not recreated.
    expect(db.deleteObjectStore).not.toHaveBeenCalledWith("meta");
    expect(db.createObjectStore).not.toHaveBeenCalledWith("meta");
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
    capturedUpgrade(db, 1);
    expect(handle.createIndex).toHaveBeenCalledWith("status", "status");
    expect(handle.createIndex).toHaveBeenCalledWith("discipline", "discipline");
    expect(handle.createIndex).toHaveBeenCalledWith(
      "firestoreUpdatedAt",
      "firestoreUpdatedAt"
    );
  });
});
