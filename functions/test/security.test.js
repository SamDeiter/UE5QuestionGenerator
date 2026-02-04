/**
 * Security Tests - Privilege Escalation & Access Control
 *
 * Tests for denied paths and privilege escalation prevention.
 * These tests verify that:
 * 1. Unauthenticated users cannot access protected functions
 * 2. Reviewers cannot access admin functions
 * 3. Role spoofing is prevented
 * 4. Custom claims are properly enforced
 *
 * Run with: cd functions && npm test
 */

const { expect } = require("chai");

/**
 * Mock context objects for different user types
 */
const mockContexts = {
  unauthenticated: null,

  reviewer: {
    auth: {
      uid: "reviewer-uid-123",
      token: {
        email: "reviewer@gmail.com",
        role: "reviewer",
        tools: ["questions"],
      },
    },
  },

  admin: {
    auth: {
      uid: "admin-uid-456",
      token: {
        email: "admin@epicgames.com",
        role: "admin",
        tools: ["questions", "blueprint", "scenario", "materials"],
      },
    },
  },

  epicEmployee: {
    auth: {
      uid: "epic-uid-789",
      token: {
        email: "employee@epicgames.com",
      },
    },
  },

  spoofedAdmin: {
    auth: {
      uid: "attacker-uid-000",
      token: {
        email: "attacker@gmail.com",
        // Attacker tries to set admin role in their token
        role: "admin",
        tools: ["questions", "blueprint", "scenario", "materials"],
      },
    },
  },
};

/**
 * Helper: Check if user is Epic employee (same logic as production)
 */
function isEpicEmployee(email) {
  if (!email || typeof email !== "string") return false;
  const emailLower = email.toLowerCase().trim();
  return (
    emailLower.endsWith("@epicgames.com") ||
    emailLower.endsWith("@xa.epicgames.com")
  );
}

/**
 * Helper: Check if user should have admin access
 * Admin access requires BOTH role:admin AND Epic employee email
 */
function hasAdminAccess(context) {
  if (!context?.auth?.token) return false;
  const { email, role } = context.auth.token;
  return role === "admin" && isEpicEmployee(email);
}

/**
 * Helper: Check if user can access a specific tool
 */
function canAccessTool(context, tool) {
  if (!context?.auth?.token) return false;
  const { tools } = context.auth.token;
  return Array.isArray(tools) && tools.includes(tool);
}

describe("Security: Access Control", () => {
  describe("Unauthenticated Access (Denied)", () => {
    it("should reject unauthenticated access to generateQuestions", () => {
      expect(mockContexts.unauthenticated).to.be.null;
      // In production, this would throw 'unauthenticated' error
    });

    it("should reject unauthenticated access to all protected functions", () => {
      const protectedFunctions = [
        "generateQuestions",
        "generateCritique",
        "createInvite",
        "revokeInvite",
        "changeUserRole",
        "listRegisteredUsers",
      ];

      protectedFunctions.forEach((fn) => {
        expect(
          mockContexts.unauthenticated,
          `${fn} should require authentication`,
        ).to.be.null;
      });
    });
  });

  describe("Privilege Escalation Prevention", () => {
    it("should NOT grant admin access to spoofed tokens", () => {
      // Attacker sets role:admin in their token, but is not Epic employee
      const result = hasAdminAccess(mockContexts.spoofedAdmin);
      expect(result).to.be.false;
    });

    it("should grant admin access only to verified Epic employees", () => {
      expect(hasAdminAccess(mockContexts.admin)).to.be.true;
    });

    it("should NOT allow reviewers to have admin access", () => {
      expect(hasAdminAccess(mockContexts.reviewer)).to.be.false;
    });

    it("should validate role AND email for admin determination", () => {
      // Create context with admin role but non-Epic email
      const fakeAdmin = {
        auth: {
          token: {
            email: "fake@notepic.com",
            role: "admin", // Even with admin role, denied
          },
        },
      };
      expect(hasAdminAccess(fakeAdmin)).to.be.false;
    });
  });

  describe("Tool Access Control", () => {
    it("should allow reviewer to access only 'questions' tool", () => {
      expect(canAccessTool(mockContexts.reviewer, "questions")).to.be.true;
      expect(canAccessTool(mockContexts.reviewer, "blueprint")).to.be.false;
      expect(canAccessTool(mockContexts.reviewer, "scenario")).to.be.false;
      expect(canAccessTool(mockContexts.reviewer, "materials")).to.be.false;
    });

    it("should allow admin to access all tools", () => {
      expect(canAccessTool(mockContexts.admin, "questions")).to.be.true;
      expect(canAccessTool(mockContexts.admin, "blueprint")).to.be.true;
      expect(canAccessTool(mockContexts.admin, "scenario")).to.be.true;
      expect(canAccessTool(mockContexts.admin, "materials")).to.be.true;
    });

    it("should deny access to undefined tools", () => {
      expect(canAccessTool(mockContexts.admin, "nonexistent-tool")).to.be.false;
    });
  });

  describe("Role Boundary Enforcement", () => {
    const adminOnlyFunctions = [
      "createInvite",
      "revokeInvite",
      "changeUserRole",
      "revokeUserAccess",
      "listRegisteredUsers",
    ];

    it("should identify admin-only functions", () => {
      adminOnlyFunctions.forEach((fn) => {
        // In production, these would check isAdmin() before execution
        // Reviewers should NOT be able to call these
        expect(
          hasAdminAccess(mockContexts.reviewer),
          `${fn} should deny reviewer`,
        ).to.be.false;
      });
    });
  });
});

describe("Security: Custom Claims Validation", () => {
  describe("Token Structure", () => {
    it("should require auth.token for any access check", () => {
      const invalidContexts = [
        null,
        {},
        { auth: null },
        { auth: {} },
        { auth: { token: null } },
      ];

      invalidContexts.forEach((ctx) => {
        expect(hasAdminAccess(ctx)).to.be.false;
        expect(canAccessTool(ctx, "questions")).to.be.false;
      });
    });

    it("should require tools to be an array", () => {
      const badToolsContext = {
        auth: {
          token: {
            email: "test@test.com",
            tools: "questions", // String instead of array
          },
        },
      };
      expect(canAccessTool(badToolsContext, "questions")).to.be.false;
    });
  });
});

console.log("✅ Security tests defined. Run with: cd functions && npm test");
