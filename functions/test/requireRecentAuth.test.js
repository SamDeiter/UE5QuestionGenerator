/**
 * Unit tests for requireRecentAuth — the step-up auth gate applied to
 * destructive admin operations (changeUserRole, revokeUserAccess).
 */
const { expect } = require("chai");
const { requireRecentAuth } = require("../utils/requireRecentAuth");

const nowSec = () => Math.floor(Date.now() / 1000);

const ctx = (authTimeSec) => ({
  auth: {
    uid: "test-uid",
    token: { auth_time: authTimeSec },
  },
});

describe("requireRecentAuth", () => {
  it("allows when auth_time is recent (within window)", () => {
    expect(() => requireRecentAuth(ctx(nowSec() - 5 * 60), 30)).to.not.throw();
  });

  it("allows exactly at the boundary", () => {
    // Pad by a second so floating clock doesn't flake.
    expect(() => requireRecentAuth(ctx(nowSec() - 30 * 60 + 2), 30)).to.not.throw();
  });

  it("rejects when auth_time is older than maxAgeMinutes", () => {
    expect(() => requireRecentAuth(ctx(nowSec() - 60 * 60), 30)).to.throw(
      /recent authentication/i,
    );
  });

  it("includes auth/recent-login-required in HttpsError details", () => {
    try {
      requireRecentAuth(ctx(nowSec() - 60 * 60), 30);
      throw new Error("expected requireRecentAuth to throw");
    } catch (err) {
      expect(err.code).to.equal("failed-precondition");
      expect(err.details).to.include({ code: "auth/recent-login-required" });
    }
  });

  it("rejects unauthenticated context", () => {
    expect(() => requireRecentAuth({}, 30)).to.throw(/signed in/i);
    expect(() => requireRecentAuth(null, 30)).to.throw(/signed in/i);
  });

  it("rejects malformed auth_time", () => {
    const malformed = {
      auth: { uid: "x", token: { /* no auth_time */ } },
    };
    expect(() => requireRecentAuth(malformed, 30)).to.throw(
      /missing auth_time/i,
    );
  });

  it("respects different maxAgeMinutes values", () => {
    // 5 minutes old, 10-min window: pass
    expect(() => requireRecentAuth(ctx(nowSec() - 5 * 60), 10)).to.not.throw();
    // 5 minutes old, 1-min window: fail
    expect(() => requireRecentAuth(ctx(nowSec() - 5 * 60), 1)).to.throw(
      /recent authentication/i,
    );
  });
});
