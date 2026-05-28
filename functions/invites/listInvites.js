const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { isAdminUser } = require("../utils/isAdminUser");
const { isBootstrapAdmin } = require("../utils/bootstrapAdmin");

/**
 * Cloud Function: listInvites
 * Returns every invite in the `invites` collection for the Admin Panel's
 * Invite Management view (ADMIN ONLY).
 *
 * Why this function exists separately from a direct Firestore read on the
 * client: the `invites` collection's Firestore security rules deny ordinary
 * client reads (invite codes are sensitive — a client-side query would let
 * any authenticated user enumerate codes). The Cloud Function runs with
 * admin privileges, gates on isAdminUser/owner-email, and returns the docs
 * shaped for the UI.
 *
 * Returned shape per item is the raw doc data plus the document id as
 * `code` (which is already the doc id from createInvite). The client at
 * src/components/admin/InviteManagement.jsx reads:
 *   code, currentUses, expiresAt, forEmail, maxUses, note, role, type
 */
exports.listInvites = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    const isAdmin = await isAdminUser(context.auth.uid);
    // Single-source bootstrap allowlist (matches createInvite, revokeInvite,
    // and the access migrations). Previously hardcoded inline here, which
    // is exactly the drift the helper was created to prevent.
    const isOwner = isBootstrapAdmin(context.auth.token.email);

    if (!isAdmin && !isOwner) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required",
      );
    }

    try {
      const db = admin.firestore();
      // Order newest-first so the most relevant invites surface at the top
      // of the Admin UI. `createdAt` is set unconditionally by createInvite,
      // so this ordering is safe for every doc the function emits.
      const snapshot = await db
        .collection("invites")
        .orderBy("createdAt", "desc")
        .limit(500)
        .get();

      const invites = [];
      snapshot.forEach((doc) => {
        const docData = doc.data();
        // The doc id IS the invite code (see createInvite). Including it
        // explicitly under `code` defends against any older docs that
        // might be missing the field on the document body itself.
        invites.push({
          code: doc.id,
          ...docData,
        });
      });

      console.log(
        `listInvites: returned ${invites.length} invite(s) to ${context.auth.token.email}`,
      );
      return { invites };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("Error listing invites:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to list invites",
      );
    }
  });
