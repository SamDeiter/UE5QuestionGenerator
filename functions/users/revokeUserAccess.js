const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { isAdminUser } = require("../utils/isAdminUser");
const { requireRecentAuth } = require("../utils/requireRecentAuth");

/**
 * Cloud Function: revokeUserAccess
 * Revokes a user's access (ADMIN ONLY)
 *
 * This function:
 * 1. Disables the user in Firebase Auth
 * 2. Removes them from admins collection if present
 * 3. Deletes their registeredUsers document
 * 4. Revokes all refresh tokens
 */
exports.revokeUserAccess = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    // ADMIN CHECK
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required",
      );
    }

    // Step-up auth: revoking access deletes Firestore records and disables
    // a user; this needs recent proof of possession.
    requireRecentAuth(context, 30);

    const { userId } = data;
    if (!userId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "User ID is required",
      );
    }

    // Prevent self-revocation
    if (userId === context.auth.uid) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Cannot revoke your own access",
      );
    }

    const db = admin.firestore();

    try {
      // 1. Disable in Firebase Auth
      await admin.auth().updateUser(userId, {
        disabled: true,
      });

      // 2. Remove from admins if present
      await db.collection("admins").doc(userId).delete();

      // 3. DELETE from registeredUsers (permanently remove)
      await db.collection("registeredUsers").doc(userId).delete();

      // 4. Revoke refresh tokens
      await admin.auth().revokeRefreshTokens(userId);

      console.log(
        `User ${userId} access revoked and deleted by ${context.auth.uid}`,
      );

      return { success: true };
    } catch (error) {
      console.error("Error revoking user access:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to revoke user access",
      );
    }
  });
