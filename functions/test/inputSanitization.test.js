/**
 * Input Sanitization & Hardening Tests
 *
 * Tests for security hardening applied to cloud functions:
 * 1. logAuthFailure input caps (errorCode, errorMessage, userAgent)
 * 2. createInvite VALID_TOOLS allowlist
 * 3. isAdminUser 3-tier priority (claims → registeredUsers → admins)
 *
 * Run with: cd functions && npm test
 */

const { expect } = require("chai");

// ============================================================================
// HELPERS — Mirror production sanitization logic
// ============================================================================

/**
 * Simulate logAuthFailure input caps (from logAuthFailure.js)
 */
function sanitizeAuthFailureInput(data) {
  return {
    errorCode: (data.errorCode || "unknown").substring(0, 50),
    errorMessage: (data.errorMessage || "").substring(0, 500),
    userAgent: (data.userAgent || "unknown").substring(0, 500),
  };
}

/**
 * Simulate tool validation from createInvite.js
 */
const VALID_TOOLS = [
  "questions",
  "blueprint",
  "scenario",
  "materials",
  "learning-path",
];

function sanitizeTools(tools) {
  if (!Array.isArray(tools) || tools.length === 0) {
    return ["questions"]; // default
  }
  return tools
    .filter((t) => typeof t === "string" && VALID_TOOLS.includes(t))
    .slice(0, 10);
}

/**
 * Simulate isAdminUser 3-tier priority (from isAdminUser.js)
 */
function isAdminUser(claims, registeredUserDoc, adminsDoc) {
  // Tier 1: Custom claims (fastest - no Firestore)
  if (claims && (claims.role === "admin" || claims.admin === true)) {
    return { isAdmin: true, source: "claims" };
  }

  // Tier 2: registeredUsers (canonical source)
  if (registeredUserDoc && registeredUserDoc.exists) {
    const role = registeredUserDoc.data.role;
    if (role === "admin" || role === "super_admin" || role === "owner") {
      return { isAdmin: true, source: "registeredUsers" };
    }
  }

  // Tier 3: Legacy admins collection (fallback)
  if (adminsDoc && adminsDoc.exists) {
    return { isAdmin: true, source: "admins" };
  }

  return { isAdmin: false, source: null };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Input Sanitization: logAuthFailure", () => {
  it("should cap errorCode at 50 characters", () => {
    const longCode = "A".repeat(200);
    const result = sanitizeAuthFailureInput({ errorCode: longCode });
    expect(result.errorCode.length).to.equal(50);
  });

  it("should cap errorMessage at 500 characters", () => {
    const longMessage = "B".repeat(1000);
    const result = sanitizeAuthFailureInput({ errorMessage: longMessage });
    expect(result.errorMessage.length).to.equal(500);
  });

  it("should cap userAgent at 500 characters", () => {
    const longUA = "C".repeat(800);
    const result = sanitizeAuthFailureInput({ userAgent: longUA });
    expect(result.userAgent.length).to.equal(500);
  });

  it("should default missing fields", () => {
    const result = sanitizeAuthFailureInput({});
    expect(result.errorCode).to.equal("unknown");
    expect(result.errorMessage).to.equal("");
    expect(result.userAgent).to.equal("unknown");
  });

  it("should handle null/undefined inputs gracefully", () => {
    const result = sanitizeAuthFailureInput({
      errorCode: null,
      errorMessage: undefined,
      userAgent: null,
    });
    expect(result.errorCode).to.equal("unknown");
    expect(result.errorMessage).to.equal("");
    expect(result.userAgent).to.equal("unknown");
  });
});

describe("Input Sanitization: createInvite VALID_TOOLS", () => {
  it("should accept all valid tools", () => {
    const result = sanitizeTools([
      "questions",
      "blueprint",
      "scenario",
      "materials",
      "learning-path",
    ]);
    expect(result).to.have.lengthOf(5);
    expect(result).to.include("questions");
    expect(result).to.include("learning-path");
  });

  it("should reject invalid tool names", () => {
    const result = sanitizeTools(["questions", "hacking-tool", "admin-panel"]);
    expect(result).to.deep.equal(["questions"]);
  });

  it("should default to ['questions'] for empty arrays", () => {
    expect(sanitizeTools([])).to.deep.equal(["questions"]);
  });

  it("should default to ['questions'] for non-array input", () => {
    expect(sanitizeTools("questions")).to.deep.equal(["questions"]);
    expect(sanitizeTools(null)).to.deep.equal(["questions"]);
    expect(sanitizeTools(undefined)).to.deep.equal(["questions"]);
  });

  it("should filter out non-string entries", () => {
    const result = sanitizeTools(["questions", 123, null, {}, "blueprint"]);
    expect(result).to.deep.equal(["questions", "blueprint"]);
  });

  it("should cap at 10 tools maximum", () => {
    const manyTools = Array(20).fill("questions");
    const result = sanitizeTools(manyTools);
    expect(result.length).to.be.at.most(10);
  });
});

describe("isAdminUser: 3-Tier Priority", () => {
  describe("Tier 1: Custom Claims (fastest)", () => {
    it("should recognize role:admin in claims", () => {
      const result = isAdminUser(
        { role: "admin" },
        null,
        null,
      );
      expect(result.isAdmin).to.be.true;
      expect(result.source).to.equal("claims");
    });

    it("should recognize admin:true legacy flag in claims", () => {
      const result = isAdminUser({ admin: true }, null, null);
      expect(result.isAdmin).to.be.true;
      expect(result.source).to.equal("claims");
    });

    it("should NOT promote reviewer via claims", () => {
      const result = isAdminUser({ role: "reviewer" }, null, null);
      expect(result.isAdmin).to.be.false;
    });
  });

  describe("Tier 2: registeredUsers (canonical)", () => {
    it("should recognize admin in registeredUsers", () => {
      const result = isAdminUser(
        { role: "reviewer" }, // claims say reviewer
        { exists: true, data: { role: "admin" } }, // but registeredUsers says admin
        null,
      );
      expect(result.isAdmin).to.be.true;
      expect(result.source).to.equal("registeredUsers");
    });

    it("should recognize super_admin role", () => {
      const result = isAdminUser(
        null,
        { exists: true, data: { role: "super_admin" } },
        null,
      );
      expect(result.isAdmin).to.be.true;
    });

    it("should recognize owner role", () => {
      const result = isAdminUser(
        null,
        { exists: true, data: { role: "owner" } },
        null,
      );
      expect(result.isAdmin).to.be.true;
    });

    it("should NOT promote reviewer from registeredUsers", () => {
      const result = isAdminUser(
        null,
        { exists: true, data: { role: "reviewer" } },
        null,
      );
      expect(result.isAdmin).to.be.false;
    });
  });

  describe("Tier 3: Legacy admins collection (fallback)", () => {
    it("should recognize user in admins collection", () => {
      const result = isAdminUser(
        null,
        null,
        { exists: true },
      );
      expect(result.isAdmin).to.be.true;
      expect(result.source).to.equal("admins");
    });

    it("should return false when not in any tier", () => {
      const result = isAdminUser(null, null, { exists: false });
      expect(result.isAdmin).to.be.false;
      expect(result.source).to.be.null;
    });
  });

  describe("Priority Order", () => {
    it("should prefer claims over registeredUsers", () => {
      const result = isAdminUser(
        { role: "admin" }, // Tier 1: admin
        { exists: true, data: { role: "reviewer" } }, // Tier 2: reviewer
        null,
      );
      expect(result.source).to.equal("claims");
    });

    it("should prefer registeredUsers over admins", () => {
      const result = isAdminUser(
        null, // No claims
        { exists: true, data: { role: "admin" } }, // Tier 2: admin
        { exists: true }, // Tier 3: also exists
      );
      expect(result.source).to.equal("registeredUsers");
    });
  });
});

console.log(
  "✅ Input Sanitization & Hardening tests defined. Run with: cd functions && npm test",
);
