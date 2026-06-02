/**
 * Bootstrap-admin allowlist.
 *
 * Some operations (create/revoke invites, run access migrations) need to
 * succeed before any Firestore admin records exist — there's a chicken-and-egg
 * problem where you can't grant admin to the first user without already being
 * admin. We resolve that by hardcoding a tiny allowlist of bootstrap emails
 * that are treated as admin regardless of Firestore state.
 *
 * Single source of truth — call sites used to duplicate this check four
 * times across createInvite, revokeInvite, and the two unifiedAccessMigration
 * functions. Keep this list small.
 *
 * To migrate this to Firebase functions config later:
 *   firebase functions:config:set admin.bootstrap_emails="email1,email2"
 * and switch BOOTSTRAP_ADMIN_EMAILS to read functions.config().admin.bootstrap_emails.
 */

const BOOTSTRAP_ADMIN_EMAILS = new Set([
  "samdeiter@epicgames.com",
]);

/**
 * @param {string|undefined|null} email - email from context.auth.token.email
 * @returns {boolean} true if the email is on the bootstrap allowlist
 */
const isBootstrapAdmin = (email) =>
  typeof email === "string" && BOOTSTRAP_ADMIN_EMAILS.has(email);

module.exports = { isBootstrapAdmin };
