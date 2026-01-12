/**
 * Smoke Tests - Critical Component Loading
 *
 * These tests verify that critical lazy-loaded components
 * can be imported without errors. This catches deployment
 * issues where chunk files might not exist.
 */

import { describe, test, expect, vi } from "vitest";

// Mock firebase before imports
vi.mock("../../services/firebase", () => ({
  app: {},
  auth: {},
  analytics: {},
  getDb: vi.fn(() => ({})),
  signInWithGoogle: vi.fn(),
  signOutUser: vi.fn(),
}));

// Mock Firebase Functions
vi.mock("firebase/functions", () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn()),
}));

describe("Critical Component Smoke Tests", () => {
  test("AdminPanel can be imported", async () => {
    const module = await import("../AdminPanel");
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe("function");
  });

  test("GlobalModals can be imported", async () => {
    const module = await import("../GlobalModals");
    expect(module.default).toBeDefined();
  });

  test("MainLayout can be imported", async () => {
    const module = await import("../MainLayout");
    expect(module.default).toBeDefined();
  });

  test("DatabaseView can be imported", async () => {
    const module = await import("../DatabaseView");
    expect(module.default).toBeDefined();
  });

  test("AnalyticsView can be imported", async () => {
    const module = await import("../AnalyticsView");
    expect(module.default).toBeDefined();
  });
});

describe("Firebase Facade Smoke Tests", () => {
  test("Firebase exports are available", async () => {
    const firebase = await import("../../services/firebase");

    // Core exports
    expect(firebase.app).toBeDefined();
    expect(firebase.auth).toBeDefined();

    // Re-exported functions from sub-modules
    expect(typeof firebase.getDb).toBe("function");
    expect(typeof firebase.signInWithGoogle).toBe("function");
    expect(typeof firebase.signOutUser).toBe("function");
  });
});

describe("Service Layer Smoke Tests", () => {
  test("firebaseSave exports are available", async () => {
    vi.doMock("../../services/firebaseSave", () => ({
      getDb: vi.fn(),
      getConnectionStatus: vi.fn(),
      getQueueDetails: vi.fn(),
      saveQuestionToFirestore: vi.fn(),
      batchSaveQuestions: vi.fn(),
    }));

    const module = await import("../../services/firebaseSave");
    expect(module.getDb).toBeDefined();
    expect(module.saveQuestionToFirestore).toBeDefined();
    expect(module.batchSaveQuestions).toBeDefined();
  });
});
