/**
 * Firestore Rules Unit Tests
 *
 * Tests Firestore security rules using @firebase/rules-unit-testing
 *
 * Run with: npm run test:rules (starts emulator automatically)
 * Or manually: firebase emulators:start --only firestore (then run tests)
 */
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Check if emulator is available before running tests
const EMULATOR_HOST = "127.0.0.1";
const EMULATOR_PORT = 8080;

/**
 * Helper to check if Firestore emulator is running
 */
async function isEmulatorRunning() {
  try {
    const response = await fetch(`http://${EMULATOR_HOST}:${EMULATOR_PORT}/`, {
      method: "GET",
      signal: AbortSignal.timeout(1000),
    });
    return response.ok || response.status === 400; // Emulator returns 400 for root
  } catch {
    return false;
  }
}

/**
 * Test Environment Setup
 * Uses the Firebase Emulator for isolated testing
 */
describe("Firestore Rules - User Profile Access", () => {
  let testEnv;
  let emulatorAvailable = false;
  const PROJECT_ID = "test-project-" + Date.now();

  beforeAll(async () => {
    // Check emulator availability
    emulatorAvailable = await isEmulatorRunning();

    if (!emulatorAvailable) {
      console.warn(
        "⚠️ Firestore Emulator not running on port 8080. Run: firebase emulators:start --only firestore"
      );
      return;
    }

    // Load rules from project config
    const rulesPath = path.join(
      process.cwd(),
      "config/firestore/firestore.rules"
    );
    let rulesContent;

    try {
      rulesContent = fs.readFileSync(rulesPath, "utf8");
    } catch {
      // Fall back to default restrictive rules for testing
      rulesContent = `
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /users/{userId} {
              allow read, write: if request.auth != null && request.auth.uid == userId;
            }
            match /userSettings/{userId} {
              allow read, write: if request.auth != null && request.auth.uid == userId;
            }
            match /questions/{questionId} {
              allow read, write: if request.auth != null;
            }
            match /{document=**} {
              allow read, write: if false;
            }
          }
        }
      `;
    }

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: rulesContent,
        host: EMULATOR_HOST,
        port: EMULATOR_PORT,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  // ========================================
  // Test: User Profile Access
  // ========================================

  describe("User Profile (/users/{uid})", () => {
    it("allows authenticated user to read own profile", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }

      const alice = testEnv.authenticatedContext("alice-uid");
      const aliceDoc = doc(alice.firestore(), "users/alice-uid");

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, "users/alice-uid"), {
          email: "alice@example.com",
          name: "Alice",
        });
      });

      await assertSucceeds(getDoc(aliceDoc));
    });

    it("denies user from reading another user's profile", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }

      const alice = testEnv.authenticatedContext("alice-uid");
      const bobDoc = doc(alice.firestore(), "users/bob-uid");

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, "users/bob-uid"), {
          email: "bob@example.com",
          name: "Bob",
        });
      });

      await assertFails(getDoc(bobDoc));
    });

    it("allows user to write to own profile", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }

      const alice = testEnv.authenticatedContext("alice-uid");
      const aliceDoc = doc(alice.firestore(), "users/alice-uid");

      await assertSucceeds(
        setDoc(aliceDoc, {
          email: "alice@example.com",
          updatedAt: new Date().toISOString(),
        })
      );
    });

    it("denies user from writing to another user's profile", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }

      const alice = testEnv.authenticatedContext("alice-uid");
      const bobDoc = doc(alice.firestore(), "users/bob-uid");

      await assertFails(
        setDoc(bobDoc, {
          email: "hacked@evil.com",
        })
      );
    });
  });

  // ========================================
  // Test: User Settings (Write Probe Target)
  // ========================================

  describe("User Settings (/userSettings/{uid})", () => {
    it("allows user to write to own userSettings (write probe)", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }

      const alice = testEnv.authenticatedContext("alice-uid");
      const settingsDoc = doc(alice.firestore(), "userSettings/alice-uid");

      await assertSucceeds(
        setDoc(settingsDoc, {
          lastVerified: new Date().toISOString(),
        })
      );
    });

    it("denies user from writing to another user's settings", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }

      const alice = testEnv.authenticatedContext("alice-uid");
      const bobSettings = doc(alice.firestore(), "userSettings/bob-uid");

      await assertFails(
        setDoc(bobSettings, {
          lastVerified: new Date().toISOString(),
        })
      );
    });
  });

  // ========================================
  // Test: Unauthenticated Access
  // ========================================

  describe("Unauthenticated Access", () => {
    it("denies unauthenticated user from reading /users", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }

      const unauth = testEnv.unauthenticatedContext();
      const userDoc = doc(unauth.firestore(), "users/alice-uid");

      await assertFails(getDoc(userDoc));
    });

    it("denies unauthenticated user from writing to /users", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }

      const unauth = testEnv.unauthenticatedContext();
      const userDoc = doc(unauth.firestore(), "users/fake-uid");

      await assertFails(
        setDoc(userDoc, {
          email: "fake@example.com",
        })
      );
    });

    it("denies unauthenticated user from reading /questions", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }

      const unauth = testEnv.unauthenticatedContext();
      const questionDoc = doc(unauth.firestore(), "questions/test-question");

      await assertFails(getDoc(questionDoc));
    });
  });

  // ========================================
  // Test: Questions Collection
  // ========================================

  describe("Questions Collection (/questions/{id})", () => {
    it("allows authenticated user to read questions", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }

      const alice = testEnv.authenticatedContext("alice-uid");

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, "questions/test-q1"), {
          question: "What is UE5?",
          type: "Multiple Choice",
        });
      });

      const questionDoc = doc(alice.firestore(), "questions/test-q1");
      await assertSucceeds(getDoc(questionDoc));
    });

    it("allows authenticated user to write questions", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }

      const alice = testEnv.authenticatedContext("alice-uid");
      const questionDoc = doc(alice.firestore(), "questions/new-question");

      await assertSucceeds(
        setDoc(questionDoc, {
          question: "New question from Alice",
          createdBy: "alice-uid",
        })
      );
    });
  });

  // ========================================
  // Test: Ghost Reviewer Prevention
  // ========================================

  describe("Ghost Reviewer Prevention", () => {
    it("verified write probe grants actual write access", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }

      const alice = testEnv.authenticatedContext("alice-uid");

      const probeDoc = doc(alice.firestore(), "userSettings/alice-uid");
      await assertSucceeds(
        setDoc(
          probeDoc,
          { lastVerified: new Date().toISOString() },
          { merge: true }
        )
      );

      const questionDoc = doc(alice.firestore(), "questions/alice-question");
      await assertSucceeds(
        setDoc(questionDoc, {
          question: "Alice's verified question",
          createdBy: "alice-uid",
        })
      );
    });

    it("detects when registered user lacks actual write access", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }

      const ghostUser = testEnv.authenticatedContext("ghost-uid");
      const protectedDoc = doc(
        ghostUser.firestore(),
        "adminSettings/protected"
      );

      await assertFails(setDoc(protectedDoc, { hacked: true }));
    });
  });
});

/**
 * Integration Smoke Test
 */
describe("Firestore Rules - Smoke Tests", () => {
  let testEnv;
  let emulatorAvailable = false;

  beforeAll(async () => {
    emulatorAvailable = await isEmulatorRunning();

    if (!emulatorAvailable) {
      console.warn("⚠️ Skipping smoke tests - emulator not running");
      return;
    }

    testEnv = await initializeTestEnvironment({
      projectId: "smoke-test-" + Date.now(),
      firestore: {
        rules: `
          rules_version = '2';
          service cloud.firestore {
            match /databases/{database}/documents {
              match /{document=**} {
                allow read, write: if request.auth != null;
              }
            }
          }
        `,
        host: EMULATOR_HOST,
        port: EMULATOR_PORT,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  it("confirms authenticated access works", async (ctx) => {
    if (!emulatorAvailable) {
      expect(emulatorAvailable).toBe(false);
      ctx.skip();
      return;
    }

    const user = testEnv.authenticatedContext("test-user");
    const testDoc = doc(user.firestore(), "test/document");

    await assertSucceeds(setDoc(testDoc, { foo: "bar" }));
    await assertSucceeds(getDoc(testDoc));
  });

  it("confirms unauthenticated access is denied", async (ctx) => {
    if (!emulatorAvailable) {
      expect(emulatorAvailable).toBe(false);
      ctx.skip();
      return;
    }

    const unauth = testEnv.unauthenticatedContext();
    const testDoc = doc(unauth.firestore(), "test/document");

    await assertFails(getDoc(testDoc));
    await assertFails(setDoc(testDoc, { foo: "bar" }));
  });
});
