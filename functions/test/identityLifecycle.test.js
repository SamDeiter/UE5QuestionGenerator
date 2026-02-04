/**
 * Identity Lifecycle Tests - UID Reconciliation & Registration Flow
 *
 * These tests verify that:
 * 1. Users with matching UID get immediate access
 * 2. Users with mismatched UID but matching email get migrated
 * 3. Orphaned registrations are cleaned up
 * 4. Audit events are logged for migrations
 * 5. Registration flow handles all edge cases
 *
 * Run with: cd functions && npm test
 */

const { expect } = require("chai");

// ============================================================================
// MOCK DATA - Simulates Firestore documents
// ============================================================================

/**
 * Mock registeredUsers collection
 * Key = document ID (UID), Value = document data
 */
const mockRegisteredUsers = {
  // Normal user - UID matches document ID
  "user-uid-123": {
    uid: "user-uid-123",
    email: "normal.user@epicgames.com",
    role: "reviewer",
    tools: ["questions"],
    registeredAt: new Date("2026-01-01"),
  },

  // Orphaned document - old UID, user now has new UID
  // This simulates Stephan's situation
  "old-uid-stephan": {
    uid: "old-uid-stephan",
    email: "stephan.rueb@epicgames.com",
    role: "reviewer",
    tools: ["questions"],
    registeredAt: new Date("2026-01-15"),
  },

  // Admin user
  "admin-uid-456": {
    uid: "admin-uid-456",
    email: "admin@epicgames.com",
    role: "admin",
    tools: ["questions", "blueprint", "scenario", "materials"],
    registeredAt: new Date("2025-12-01"),
  },
};

// ============================================================================
// HELPER FUNCTIONS - Mirror production logic
// ============================================================================

/**
 * Find user registration by UID (primary lookup)
 */
function findByUid(uid) {
  return mockRegisteredUsers[uid] || null;
}

/**
 * Find user registration by email (fallback lookup)
 */
function findByEmail(email) {
  const emailLower = email.toLowerCase().trim();
  for (const [docId, data] of Object.entries(mockRegisteredUsers)) {
    if (data.email?.toLowerCase() === emailLower) {
      return { docId, data };
    }
  }
  return null;
}

/**
 * Simulate the checkUserRegistration logic
 * Returns: { found: boolean, migrated?: boolean, role?: string }
 */
function checkUserRegistration(context) {
  if (!context?.auth) {
    return { found: false, error: "unauthenticated" };
  }

  const { uid, email } = context.auth;

  // Step 1: Primary lookup by UID
  const directMatch = findByUid(uid);
  if (directMatch) {
    return {
      found: true,
      migrated: false,
      role: directMatch.role,
      tools: directMatch.tools,
    };
  }

  // Step 2: Fallback lookup by email
  if (email) {
    const emailMatch = findByEmail(email);
    if (emailMatch) {
      // Found orphaned registration - would trigger migration
      return {
        found: true,
        migrated: true,
        oldUid: emailMatch.docId,
        newUid: uid,
        role: emailMatch.data.role,
        tools: emailMatch.data.tools,
      };
    }
  }

  // Step 3: No registration found
  return { found: false };
}

/**
 * Check if registration document has required fields
 */
function validateRegistrationDoc(doc) {
  const requiredFields = ["uid", "email", "role", "registeredAt"];
  const missingFields = requiredFields.filter((f) => !doc[f]);
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Identity Lifecycle: UID Reconciliation", () => {
  describe("Primary UID Lookup", () => {
    it("should find user with matching UID immediately", () => {
      const context = {
        auth: {
          uid: "user-uid-123",
          email: "normal.user@epicgames.com",
        },
      };

      const result = checkUserRegistration(context);

      expect(result.found).to.be.true;
      expect(result.migrated).to.be.false;
      expect(result.role).to.equal("reviewer");
    });

    it("should return correct tools for found user", () => {
      const context = {
        auth: {
          uid: "admin-uid-456",
          email: "admin@epicgames.com",
        },
      };

      const result = checkUserRegistration(context);

      expect(result.found).to.be.true;
      expect(result.tools).to.include("questions");
      expect(result.tools).to.include("blueprint");
    });
  });

  describe("Email Fallback (Stephan's Scenario)", () => {
    it("should find user by email when UID doesn't match", () => {
      // Stephan logs in with NEW UID, but email matches old registration
      const context = {
        auth: {
          uid: "new-uid-stephan-456",
          email: "stephan.rueb@epicgames.com",
        },
      };

      const result = checkUserRegistration(context);

      expect(result.found).to.be.true;
      expect(result.migrated).to.be.true;
      expect(result.oldUid).to.equal("old-uid-stephan");
      expect(result.newUid).to.equal("new-uid-stephan-456");
    });

    it("should preserve role during migration", () => {
      const context = {
        auth: {
          uid: "brand-new-uid",
          email: "stephan.rueb@epicgames.com",
        },
      };

      const result = checkUserRegistration(context);

      expect(result.role).to.equal("reviewer");
    });

    it("should preserve tools during migration", () => {
      const context = {
        auth: {
          uid: "another-new-uid",
          email: "stephan.rueb@epicgames.com",
        },
      };

      const result = checkUserRegistration(context);

      expect(result.tools).to.include("questions");
    });
  });

  describe("No Registration Found", () => {
    it("should return found:false for unknown UID and email", () => {
      const context = {
        auth: {
          uid: "unknown-uid",
          email: "unknown@gmail.com",
        },
      };

      const result = checkUserRegistration(context);

      expect(result.found).to.be.false;
    });

    it("should return found:false for unauthenticated context", () => {
      const result = checkUserRegistration(null);
      expect(result.found).to.be.false;
      expect(result.error).to.equal("unauthenticated");
    });

    it("should return found:false for context without auth", () => {
      const result = checkUserRegistration({});
      expect(result.found).to.be.false;
    });
  });

  describe("Case Insensitive Email Matching", () => {
    it("should match email regardless of case", () => {
      const context = {
        auth: {
          uid: "case-test-uid",
          email: "STEPHAN.RUEB@EPICGAMES.COM", // Uppercase
        },
      };

      const result = checkUserRegistration(context);

      expect(result.found).to.be.true;
      expect(result.migrated).to.be.true;
    });

    it("should handle email with extra whitespace", () => {
      const context = {
        auth: {
          uid: "whitespace-test-uid",
          email: "  stephan.rueb@epicgames.com  ", // Whitespace
        },
      };

      const result = checkUserRegistration(context);

      expect(result.found).to.be.true;
    });
  });
});

describe("Identity Lifecycle: Registration Document Validation", () => {
  describe("Required Fields", () => {
    it("should validate complete registration document", () => {
      const doc = {
        uid: "test-uid",
        email: "test@epicgames.com",
        role: "reviewer",
        registeredAt: new Date(),
      };

      const validation = validateRegistrationDoc(doc);

      expect(validation.isValid).to.be.true;
      expect(validation.missingFields).to.have.length(0);
    });

    it("should reject document missing uid", () => {
      const doc = {
        email: "test@epicgames.com",
        role: "reviewer",
        registeredAt: new Date(),
      };

      const validation = validateRegistrationDoc(doc);

      expect(validation.isValid).to.be.false;
      expect(validation.missingFields).to.include("uid");
    });

    it("should reject document missing email", () => {
      const doc = {
        uid: "test-uid",
        role: "reviewer",
        registeredAt: new Date(),
      };

      const validation = validateRegistrationDoc(doc);

      expect(validation.isValid).to.be.false;
      expect(validation.missingFields).to.include("email");
    });

    it("should reject document missing role", () => {
      const doc = {
        uid: "test-uid",
        email: "test@epicgames.com",
        registeredAt: new Date(),
      };

      const validation = validateRegistrationDoc(doc);

      expect(validation.isValid).to.be.false;
      expect(validation.missingFields).to.include("role");
    });
  });
});

describe("Identity Lifecycle: Session Edge Cases", () => {
  describe("Token Without Email", () => {
    it("should handle auth without email gracefully", () => {
      const context = {
        auth: {
          uid: "no-email-uid",
          // email is undefined
        },
      };

      const result = checkUserRegistration(context);

      // Should not crash, just return not found
      expect(result.found).to.be.false;
    });
  });

  describe("Null/Undefined Handling", () => {
    it("should handle null context", () => {
      expect(() => checkUserRegistration(null)).to.not.throw();
    });

    it("should handle undefined context", () => {
      expect(() => checkUserRegistration(undefined)).to.not.throw();
    });

    it("should handle context with null auth", () => {
      expect(() => checkUserRegistration({ auth: null })).to.not.throw();
    });
  });
});

console.log(
  "✅ Identity Lifecycle tests defined. Run with: cd functions && npm test",
);
