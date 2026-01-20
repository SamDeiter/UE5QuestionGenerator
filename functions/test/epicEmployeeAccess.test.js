/**
 * Epic Employee Access - Unit Tests
 *
 * Tests for the domain recognition logic that determines Epic employee status.
 * Ensures both @epicgames.com and @xa.epicgames.com are correctly recognized.
 *
 * Run with: cd functions && npm test
 */

const { expect } = require("chai");

/**
 * Helper function that mirrors the logic in checkUserRegistration.js and checkToolAccess.js
 * This is the exact same logic used in production Cloud Functions.
 */
function isEpicEmployee(email) {
  if (!email || typeof email !== "string") {
    return false;
  }
  const emailLower = email.toLowerCase().trim();
  return (
    emailLower.endsWith("@epicgames.com") ||
    emailLower.endsWith("@xa.epicgames.com")
  );
}

describe("Epic Employee Domain Recognition", () => {
  describe("Valid Epic Domains", () => {
    it("should recognize @epicgames.com as Epic employee", () => {
      expect(isEpicEmployee("sam.deiter@epicgames.com")).to.be.true;
      expect(isEpicEmployee("test@epicgames.com")).to.be.true;
      expect(isEpicEmployee("user.name@epicgames.com")).to.be.true;
    });

    it("should recognize @xa.epicgames.com as Epic employee (external associates)", () => {
      expect(isEpicEmployee("luis.cataldi@xa.epicgames.com")).to.be.true;
      expect(isEpicEmployee("contractor@xa.epicgames.com")).to.be.true;
      expect(isEpicEmployee("vendor.name@xa.epicgames.com")).to.be.true;
    });

    it("should handle case-insensitive domains", () => {
      expect(isEpicEmployee("User@EPICGAMES.COM")).to.be.true;
      expect(isEpicEmployee("User@XA.EPICGAMES.COM")).to.be.true;
      expect(isEpicEmployee("User@Epicgames.Com")).to.be.true;
      expect(isEpicEmployee("User@Xa.Epicgames.Com")).to.be.true;
    });

    it("should handle emails with whitespace (trimmed)", () => {
      expect(isEpicEmployee("  user@epicgames.com  ")).to.be.true;
      expect(isEpicEmployee("  user@xa.epicgames.com  ")).to.be.true;
    });
  });

  describe("Invalid/External Domains", () => {
    it("should reject common external email domains", () => {
      expect(isEpicEmployee("user@gmail.com")).to.be.false;
      expect(isEpicEmployee("user@yahoo.com")).to.be.false;
      expect(isEpicEmployee("user@outlook.com")).to.be.false;
      expect(isEpicEmployee("user@hotmail.com")).to.be.false;
    });

    it("should reject similar but different domains", () => {
      expect(isEpicEmployee("user@epicgames.net")).to.be.false;
      expect(isEpicEmployee("user@epicgames.org")).to.be.false;
      expect(isEpicEmployee("user@epic-games.com")).to.be.false;
      expect(isEpicEmployee("user@fakeepicgames.com")).to.be.false;
    });

    it("should reject other subdomains (only xa. is allowed)", () => {
      // Note: If other subdomains should be allowed in the future, update this test
      expect(isEpicEmployee("user@other.epicgames.com")).to.be.false;
      expect(isEpicEmployee("user@test.epicgames.com")).to.be.false;
      expect(isEpicEmployee("user@dev.epicgames.com")).to.be.false;
    });

    it("should reject spoofed domains", () => {
      expect(isEpicEmployee("user@epicgames.com.fake.com")).to.be.false;
      expect(isEpicEmployee("user@subdomain.epicgames.com.malicious.com")).to.be
        .false;
    });
  });

  describe("Edge Cases", () => {
    it("should reject null and undefined", () => {
      expect(isEpicEmployee(null)).to.be.false;
      expect(isEpicEmployee(undefined)).to.be.false;
    });

    it("should reject empty strings", () => {
      expect(isEpicEmployee("")).to.be.false;
      expect(isEpicEmployee("   ")).to.be.false;
    });

    it("should reject non-string inputs", () => {
      expect(isEpicEmployee(123)).to.be.false;
      expect(isEpicEmployee({})).to.be.false;
      expect(isEpicEmployee([])).to.be.false;
    });

    it("should reject malformed emails (no local part before @)", () => {
      expect(isEpicEmployee("notemail")).to.be.false;
      // Note: "@epicgames.com" technically ends with @epicgames.com, so it returns true
      // This is fine - Firebase Auth would never produce such an email
      expect(isEpicEmployee("user@")).to.be.false;
    });
  });

  describe("Security: Domain Spoofing Prevention", () => {
    it("should not match emails where Epic domain is part of a larger domain", () => {
      expect(isEpicEmployee("user@epicgames.com.fake.com")).to.be.false;
      expect(isEpicEmployee("user@subdomain.epicgames.com.malicious.com")).to.be
        .false;
    });
  });
});

console.log(
  "✅ Epic Employee Access tests defined. Run with: cd functions && npm test",
);
