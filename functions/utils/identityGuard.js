/**
 * Identity guards — prove a caller actually owns the email/identity they
 * present BEFORE any role is granted.
 *
 * SECURITY: Firebase email/password signup lets a client create an account
 * asserting ANY email address, created with `email_verified: false`. So
 * `token.email` alone is an unverified *claim*, not proof. Granting access on
 * the claim lets an outsider assert `someone@epicgames.com` and inherit
 * domain/invite access they were never given. These helpers are the single
 * source of truth for "is this identity trustworthy enough to grant on."
 *
 * `token` here is the decoded ID token: `context.auth.token` inside an
 * onCall handler (a Firebase DecodedIdToken). Pure functions — no I/O — so
 * they're unit-tested directly in test/identityGuard.test.js.
 */

const EPIC_DOMAINS = ["epicgames.com", "xa.epicgames.com"];

/**
 * @param {string|undefined|null} email
 * @returns {string} lowercased domain part, or "" if unparseable
 */
function emailDomain(email) {
  return (email || "").toLowerCase().split("@")[1] || "";
}

/**
 * Is the email on an Epic domain? (Domain check only — says nothing about
 * whether the caller actually owns the address.)
 * @param {string|undefined|null} email
 * @returns {boolean}
 */
function isEpicDomain(email) {
  return EPIC_DOMAINS.includes(emailDomain(email));
}

/**
 * Has the caller proven control of their email address?
 * @param {object|undefined|null} token - decoded ID token (context.auth.token)
 * @returns {boolean}
 */
function isEmailVerified(token) {
  return !!token && token.email_verified === true;
}

/**
 * Is this a trustworthy Epic identity eligible for the domain auto-grant?
 *
 * Requires ALL of: Epic-domain email, a verified email, AND sign-in via Google
 * SSO — the only provider that actually proves Epic-Workspace ownership. An
 * email/password account claiming `@epicgames.com` fails here even if it
 * somehow had email_verified, because it isn't a Google identity.
 *
 * @param {object|undefined|null} token - decoded ID token (context.auth.token)
 * @returns {boolean}
 */
function isTrustedEpicIdentity(token) {
  if (!token) return false;
  const provider = token.firebase && token.firebase.sign_in_provider;
  return (
    isEpicDomain(token.email) &&
    token.email_verified === true &&
    provider === "google.com"
  );
}

module.exports = {
  EPIC_DOMAINS,
  isEpicDomain,
  isEmailVerified,
  isTrustedEpicIdentity,
};
