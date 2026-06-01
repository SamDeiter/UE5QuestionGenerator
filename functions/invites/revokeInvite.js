const functions = require("firebase-functions");
const { getDb } = require("../db");
const admin = require("firebase-admin");
const { isAdminUser } = require("../utils/isAdminUser");
const { isBootstrapAdmin } = require("../utils/bootstrapAdmin");

/**
 * Cloud Function: revokeInvite
 * Revokes an invite code (ADMIN ONLY)
 */
exports.revokeInvite = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    const isAdmin = await isAdminUser(context.auth.uid);
    const isOwner = isBootstrapAdmin(context.auth.token.email);

    if (!isAdmin && !isOwner) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required",
      );
    }

    const { code } = data;
    if (!code)
      throw new functions.https.HttpsError("invalid-argument", "Code required");

    try {
      const db = getDb();
      const inviteRef = db.collection("invites").doc(code);
      const inviteDoc = await inviteRef.get();

      if (!inviteDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Invite not found");
      }

      await inviteRef.update({
        isActive: false,
        revokedAt: admin.firestore.Timestamp.now(),
        revokedBy: context.auth.uid,
      });

      console.log(`Invite ${code} revoked by ${context.auth.token.email}`);
      return { success: true };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("Error revoking invite:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to revoke invite",
      );
    }
  });
