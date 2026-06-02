const { expect } = require("chai");
const {
  isEpicDomain,
  isEmailVerified,
  isTrustedEpicIdentity,
} = require("../utils/identityGuard");

// Helper: build a decoded-ID-token-shaped object.
const token = ({ email, verified, provider } = {}) => ({
  email,
  email_verified: verified,
  firebase: provider ? { sign_in_provider: provider } : undefined,
});

describe("identityGuard", () => {
  describe("isEpicDomain", () => {
    it("accepts epicgames.com and xa.epicgames.com (case-insensitive)", () => {
      expect(isEpicDomain("user@epicgames.com")).to.equal(true);
      expect(isEpicDomain("user@xa.epicgames.com")).to.equal(true);
      expect(isEpicDomain("USER@EpicGames.com")).to.equal(true);
    });

    it("rejects other domains and malformed input", () => {
      expect(isEpicDomain("user@gmail.com")).to.equal(false);
      expect(isEpicDomain("user@evil-epicgames.com")).to.equal(false);
      expect(isEpicDomain("notanemail")).to.equal(false);
      expect(isEpicDomain("")).to.equal(false);
      expect(isEpicDomain(null)).to.equal(false);
      expect(isEpicDomain(undefined)).to.equal(false);
    });
  });

  describe("isEmailVerified", () => {
    it("is true only when email_verified === true", () => {
      expect(isEmailVerified(token({ verified: true }))).to.equal(true);
    });

    it("is false for unverified, missing, or non-boolean values", () => {
      expect(isEmailVerified(token({ verified: false }))).to.equal(false);
      expect(isEmailVerified(token({}))).to.equal(false);
      expect(isEmailVerified({ email_verified: "true" })).to.equal(false);
      expect(isEmailVerified(null)).to.equal(false);
      expect(isEmailVerified(undefined)).to.equal(false);
    });
  });

  describe("isTrustedEpicIdentity", () => {
    it("accepts a verified Google SSO Epic identity", () => {
      expect(
        isTrustedEpicIdentity(
          token({
            email: "dev@epicgames.com",
            verified: true,
            provider: "google.com",
          }),
        ),
      ).to.equal(true);
    });

    it("REJECTS an unverified email/password account claiming an Epic email (the H1 attack)", () => {
      expect(
        isTrustedEpicIdentity(
          token({
            email: "attacker@epicgames.com",
            verified: false,
            provider: "password",
          }),
        ),
      ).to.equal(false);
    });

    it("rejects a verified password account claiming an Epic email (provider must be google.com)", () => {
      expect(
        isTrustedEpicIdentity(
          token({
            email: "attacker@epicgames.com",
            verified: true,
            provider: "password",
          }),
        ),
      ).to.equal(false);
    });

    it("rejects a verified Google account on a non-Epic domain", () => {
      expect(
        isTrustedEpicIdentity(
          token({
            email: "person@gmail.com",
            verified: true,
            provider: "google.com",
          }),
        ),
      ).to.equal(false);
    });

    it("rejects when the provider claim is missing", () => {
      expect(
        isTrustedEpicIdentity(
          token({ email: "dev@epicgames.com", verified: true }),
        ),
      ).to.equal(false);
    });

    it("rejects null/undefined tokens", () => {
      expect(isTrustedEpicIdentity(null)).to.equal(false);
      expect(isTrustedEpicIdentity(undefined)).to.equal(false);
    });
  });
});
