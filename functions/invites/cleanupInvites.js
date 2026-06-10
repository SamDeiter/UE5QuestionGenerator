const functions = require("firebase-functions");
const { getDb } = require("../db");
const { isAdminUser } = require("../utils/isAdminUser");
const { isBootstrapAdmin } = require("../utils/bootstrapAdmin");

/**
 * Cloud Function: cleanupInvites
 * Deletes invite documents that were never used (currentUses === 0).
 * Expired and revoked invites that were actually consumed are kept as history.
 * ADMIN ONLY
 */
exports.cleanupInvites = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }

    const isAdmin = await isAdminUser(context.auth.uid);
    const isOwner = isBootstrapAdmin(context.auth.token.email);

    if (!isAdmin && !isOwner) {
      throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }

    const db = getDb();
    const snap = await db.collection("invites").get();

    const toDelete = [];
    snap.forEach((doc) => {
      const d = doc.data();
      if (!d.currentUses || d.currentUses === 0) {
        toDelete.push(doc.ref);
      }
    });

    for (const ref of toDelete) {
      await ref.delete();
    }

    console.log(
      `cleanupInvites: deleted ${toDelete.length} unused invites, kept ${snap.size - toDelete.length}`
    );

    return {
      success: true,
      deleted: toDelete.length,
      kept: snap.size - toDelete.length,
    };
  });
