/**
 * Claims Short-Circuit Unit Tests
 *
 * Tests the JWT custom claims fast-path optimization added in perf commit 3320b675.
 * When claims.tools exists and is an array, checkToolAccess and checkUserRegistration
 * should return immediately WITHOUT any Firestore reads.
 *
 * Run with: cd functions && npm test
 */

const { expect } = require("chai");

// ============================================================================
// HELPERS — Mirror the claims short-circuit logic from production
// ============================================================================

/**
 * Simulates checkToolAccess claims fast-path.
 * Returns { shortCircuited, result } so we can verify the path taken.
 */
function checkToolAccessClaims(context, toolId) {
  if (!context?.auth) {
    return { shortCircuited: false, error: "unauthenticated" };
  }

  const claims = context.auth.token || {};

  // Claims short-circuit (zero Firestore reads)
  if (claims.tools && Array.isArray(claims.tools)) {
    return {
      shortCircuited: true,
      result: {
        hasAccess: claims.tools.includes(toolId),
        role: claims.role || "reviewer",
      },
    };
  }

  // Would normally fall through to Firestore
  return { shortCircuited: false, fallthrough: true };
}

/**
 * Simulates checkUserRegistration claims fast-path.
 */
function checkRegistrationClaims(context) {
  if (!context?.auth) {
    return { shortCircuited: false, error: "unauthenticated" };
  }

  const claims = context.auth.token || {};

  if (claims.role && claims.tools && Array.isArray(claims.tools)) {
    return {
      shortCircuited: true,
      result: {
        registered: true,
        role: claims.role,
        tools: claims.tools,
      },
    };
  }

  return { shortCircuited: false, fallthrough: true };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Claims Short-Circuit: checkToolAccess", () => {
  describe("Fast Path (claims present)", () => {
    it("should short-circuit when tools array exists in claims", () => {
      const context = {
        auth: {
          uid: "user-123",
          token: {
            email: "user@test.com",
            role: "reviewer",
            tools: ["questions"],
          },
        },
      };

      const check = checkToolAccessClaims(context, "questions");
      expect(check.shortCircuited).to.be.true;
      expect(check.result.hasAccess).to.be.true;
    });

    it("should deny access for tools not in claims", () => {
      const context = {
        auth: {
          uid: "user-123",
          token: {
            role: "reviewer",
            tools: ["questions"],
          },
        },
      };

      const check = checkToolAccessClaims(context, "blueprint");
      expect(check.shortCircuited).to.be.true;
      expect(check.result.hasAccess).to.be.false;
    });

    it("should default role to 'reviewer' if claims.role is missing", () => {
      const context = {
        auth: {
          uid: "user-123",
          token: {
            tools: ["questions"],
            // no role
          },
        },
      };

      const check = checkToolAccessClaims(context, "questions");
      expect(check.shortCircuited).to.be.true;
      expect(check.result.role).to.equal("reviewer");
    });

    it("should handle admin with multiple tools", () => {
      const context = {
        auth: {
          uid: "admin-456",
          token: {
            role: "admin",
            tools: ["questions", "blueprint", "scenario", "materials"],
          },
        },
      };

      expect(checkToolAccessClaims(context, "questions").result.hasAccess).to.be.true;
      expect(checkToolAccessClaims(context, "blueprint").result.hasAccess).to.be.true;
      expect(checkToolAccessClaims(context, "scenario").result.hasAccess).to.be.true;
      expect(checkToolAccessClaims(context, "materials").result.hasAccess).to.be.true;
      expect(checkToolAccessClaims(context, "nonexistent").result.hasAccess).to.be.false;
    });
  });

  describe("Fallthrough (no claims)", () => {
    it("should fall through to Firestore when tools is missing", () => {
      const context = {
        auth: {
          uid: "user-123",
          token: {
            email: "user@test.com",
            role: "reviewer",
            // no tools array
          },
        },
      };

      const check = checkToolAccessClaims(context, "questions");
      expect(check.shortCircuited).to.be.false;
      expect(check.fallthrough).to.be.true;
    });

    it("should fall through when tools is not an array", () => {
      const context = {
        auth: {
          uid: "user-123",
          token: {
            tools: "questions", // string, not array
          },
        },
      };

      const check = checkToolAccessClaims(context, "questions");
      expect(check.shortCircuited).to.be.false;
    });

    it("should fall through when token is empty", () => {
      const context = { auth: { uid: "user-123", token: {} } };
      const check = checkToolAccessClaims(context, "questions");
      expect(check.shortCircuited).to.be.false;
    });
  });

  describe("Edge Cases", () => {
    it("should reject unauthenticated context", () => {
      const check = checkToolAccessClaims(null, "questions");
      expect(check.error).to.equal("unauthenticated");
    });

    it("should handle empty tools array", () => {
      const context = {
        auth: {
          uid: "user-123",
          token: { role: "reviewer", tools: [] },
        },
      };

      const check = checkToolAccessClaims(context, "questions");
      expect(check.shortCircuited).to.be.true;
      expect(check.result.hasAccess).to.be.false;
    });
  });
});

describe("Claims Short-Circuit: checkUserRegistration", () => {
  it("should short-circuit when both role and tools exist in claims", () => {
    const context = {
      auth: {
        uid: "user-123",
        token: {
          role: "reviewer",
          tools: ["questions"],
        },
      },
    };

    const check = checkRegistrationClaims(context);
    expect(check.shortCircuited).to.be.true;
    expect(check.result.registered).to.be.true;
    expect(check.result.role).to.equal("reviewer");
    expect(check.result.tools).to.deep.equal(["questions"]);
  });

  it("should NOT short-circuit when role is missing", () => {
    const context = {
      auth: {
        uid: "user-123",
        token: {
          tools: ["questions"],
          // no role
        },
      },
    };

    const check = checkRegistrationClaims(context);
    expect(check.shortCircuited).to.be.false;
  });

  it("should NOT short-circuit when tools is missing", () => {
    const context = {
      auth: {
        uid: "user-123",
        token: {
          role: "reviewer",
          // no tools
        },
      },
    };

    const check = checkRegistrationClaims(context);
    expect(check.shortCircuited).to.be.false;
  });
});

console.log(
  "✅ Claims Short-Circuit tests defined. Run with: cd functions && npm test",
);
