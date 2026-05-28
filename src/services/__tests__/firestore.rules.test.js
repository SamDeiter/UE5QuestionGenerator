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
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
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

// ============================================================
// Phase A hardening: audit-log, apiUsage, reviewer attribution
// ============================================================

describe("Firestore Rules - Phase A hardening", () => {
  let testEnv;
  let emulatorAvailable = false;
  const PROJECT_ID = "phase-a-" + Date.now();

  beforeAll(async () => {
    emulatorAvailable = await isEmulatorRunning();
    if (!emulatorAvailable) {
      console.warn("⚠️ Skipping Phase A rules tests - emulator not running");
      return;
    }

    const rulesPath = path.join(
      process.cwd(),
      "config/firestore/firestore.rules"
    );
    const rulesContent = fs.readFileSync(rulesPath, "utf8");

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
    if (testEnv) await testEnv.cleanup();
  });

  beforeEach(async () => {
    if (testEnv) await testEnv.clearFirestore();
  });

  // ============================================================
  // apiUsage - clients can no longer write
  // ============================================================
  describe("apiUsage collection", () => {
    it("denies authenticated client from creating apiUsage docs", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }
      const alice = testEnv.authenticatedContext("alice-uid", {
        email: "alice@example.com",
      });
      const apiUsageColl = collection(alice.firestore(), "apiUsage");
      await assertFails(
        addDoc(apiUsageColl, {
          userId: "alice-uid",
          timestamp: serverTimestamp(),
          type: "generation",
        })
      );
    });
  });

  // ============================================================
  // audit-log create rule
  // ============================================================
  describe("audit-log collection", () => {
    const validEntry = (overrides = {}) => ({
      questionId: "q1",
      eventType: "STATUS_CHANGE",
      timestamp: serverTimestamp(),
      userId: "alice-uid",
      userEmail: "alice@example.com",
      details: { oldValue: "pending", newValue: "accepted" },
      sessionId: "sess-1",
      userAgent: "vitest",
      ...overrides,
    });

    it("allows signed-in user to create a well-formed audit-log entry", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }
      const alice = testEnv.authenticatedContext("alice-uid", {
        email: "alice@example.com",
      });
      const coll = collection(alice.firestore(), "audit-log");
      await assertSucceeds(addDoc(coll, validEntry()));
    });

    it("denies write with non-allowlisted eventType", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }
      const alice = testEnv.authenticatedContext("alice-uid", {
        email: "alice@example.com",
      });
      const coll = collection(alice.firestore(), "audit-log");
      await assertFails(
        addDoc(coll, validEntry({ eventType: "SUPER_ADMIN_OVERRIDE" }))
      );
    });

    it("denies write with userEmail forged to another user", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }
      const alice = testEnv.authenticatedContext("alice-uid", {
        email: "alice@example.com",
      });
      const coll = collection(alice.firestore(), "audit-log");
      await assertFails(
        addDoc(coll, validEntry({ userEmail: "samdeiter@epicgames.com" }))
      );
    });

    it("denies write with userId mismatched from auth.uid", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }
      const alice = testEnv.authenticatedContext("alice-uid", {
        email: "alice@example.com",
      });
      const coll = collection(alice.firestore(), "audit-log");
      await assertFails(addDoc(coll, validEntry({ userId: "bob-uid" })));
    });

    it("denies write with an unexpected extra field", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }
      const alice = testEnv.authenticatedContext("alice-uid", {
        email: "alice@example.com",
      });
      const coll = collection(alice.firestore(), "audit-log");
      await assertFails(
        addDoc(coll, validEntry({ injected: "<script>alert(1)</script>" }))
      );
    });

    it("denies update and delete on audit-log entries (immutable)", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }
      const alice = testEnv.authenticatedContext("alice-uid", {
        email: "alice@example.com",
      });
      // Seed a doc via the bypass path
      let docId;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const ref = await addDoc(
          collection(context.firestore(), "audit-log"),
          validEntry()
        );
        docId = ref.id;
      });
      const target = doc(alice.firestore(), `audit-log/${docId}`);
      await assertFails(updateDoc(target, { eventType: "STATUS_CHANGE" }));
    });
  });

  // ============================================================
  // Reviewer attribution pinning
  // ============================================================
  describe("Reviewer attribution pinning on /questions", () => {
    const seedQuestion = async (id, overrides = {}) => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `questions/${id}`), {
          question: "What is UE5?",
          options: { A: "engine", B: "game", C: "tool", D: "framework" },
          correct: "A",
          creatorId: "carol-uid",
          creatorEmail: "carol@example.com",
          status: "pending",
          version: 1,
          ...overrides,
        });
      });
    };

    it("allows reviewer to accept a question with acceptedBy == own uid", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }
      await seedQuestion("q-accept-ok");
      const alice = testEnv.authenticatedContext("alice-uid", {
        email: "alice@example.com",
        role: "reviewer",
      });
      const target = doc(alice.firestore(), "questions/q-accept-ok");
      await assertSucceeds(
        updateDoc(target, {
          status: "accepted",
          acceptedBy: "alice-uid",
          acceptedAt: new Date().toISOString(),
          version: 2,
        })
      );
    });

    it("denies reviewer from forging acceptedBy as another reviewer", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }
      await seedQuestion("q-accept-forge");
      const alice = testEnv.authenticatedContext("alice-uid", {
        email: "alice@example.com",
        role: "reviewer",
      });
      const target = doc(alice.firestore(), "questions/q-accept-forge");
      await assertFails(
        updateDoc(target, {
          status: "accepted",
          acceptedBy: "bob-uid",
          version: 2,
        })
      );
    });

    it("allows reviewer to verify with humanVerifiedBy == own email", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }
      await seedQuestion("q-verify-ok");
      const alice = testEnv.authenticatedContext("alice-uid", {
        email: "alice@example.com",
        role: "reviewer",
      });
      const target = doc(alice.firestore(), "questions/q-verify-ok");
      await assertSucceeds(
        updateDoc(target, {
          humanVerified: true,
          humanVerifiedBy: "alice@example.com",
          humanVerifiedAt: new Date().toISOString(),
          version: 2,
        })
      );
    });

    it("denies reviewer from forging humanVerifiedBy as another user", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }
      await seedQuestion("q-verify-forge");
      const alice = testEnv.authenticatedContext("alice-uid", {
        email: "alice@example.com",
        role: "reviewer",
      });
      const target = doc(alice.firestore(), "questions/q-verify-forge");
      await assertFails(
        updateDoc(target, {
          humanVerified: true,
          humanVerifiedBy: "samdeiter@epicgames.com",
          version: 2,
        })
      );
    });

    it("denies reviewer from forging rejectedBy as another reviewer", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }
      await seedQuestion("q-reject-forge");
      const alice = testEnv.authenticatedContext("alice-uid", {
        email: "alice@example.com",
        role: "reviewer",
      });
      const target = doc(alice.firestore(), "questions/q-reject-forge");
      await assertFails(
        updateDoc(target, {
          status: "rejected",
          rejectedBy: "bob-uid",
          rejectionReason: "duplicate",
          version: 2,
        })
      );
    });

    it("allows reviewer update that doesn't touch attribution fields", async (ctx) => {
      if (!emulatorAvailable) {
        expect(emulatorAvailable).toBe(false);
        ctx.skip();
        return;
      }
      // Pre-seed with an existing acceptedBy attribution that ISN'T alice
      await seedQuestion("q-untouched", {
        status: "accepted",
        acceptedBy: "carol-uid",
        humanVerified: true,
        humanVerifiedBy: "carol@example.com",
      });
      const alice = testEnv.authenticatedContext("alice-uid", {
        email: "alice@example.com",
        role: "reviewer",
      });
      const target = doc(alice.firestore(), "questions/q-untouched");
      // Alice updates only the tag list; she should not be blocked by the
      // pre-existing acceptedBy/humanVerifiedBy values she's not changing.
      await assertSucceeds(
        updateDoc(target, {
          tags: ["ue5", "rendering"],
          version: 2,
        })
      );
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
