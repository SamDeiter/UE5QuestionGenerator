const functions = require("firebase-functions");
const { getDb } = require("../db");
const admin = require("firebase-admin");
const { isAdminUser } = require("../utils/isAdminUser");
const { requireRecentAuth } = require("../utils/requireRecentAuth");

/**
 * Cloud Function: changeUserRole
 * Changes a user's role (ADMIN ONLY)
 */
exports.changeUserRole = functions
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

    // Step-up auth: changing roles is privilege-escalation territory.
    // A stolen-tab session with a long-lived token can't promote someone
    // without recent proof of possession.
    requireRecentAuth(context, 30);

    const { userId, role } = data;
    if (!userId || !role) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "User ID and Role are required",
      );
    }

    if (!["user", "admin", "reviewer"].includes(role)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid role");
    }

    // Prevent changing own role (safety check)
    if (userId === context.auth.uid) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Cannot change your own role",
      );
    }

    const db = getDb();

    try {
      // Update registeredUsers collection
      await db.collection("registeredUsers").doc(userId).update({
        role: role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.uid,
      });

      // Sync custom claims for fast role checks in security rules
      try {
        await admin.auth().setCustomUserClaims(userId, { role });
        console.log(`✅ Custom claims synced for user ${userId}: role=${role}`);
      } catch (claimsError) {
        console.error("Failed to sync custom claims:", claimsError);
        // Continue - Firestore is the source of truth
      }

      // Update admins collection
      if (role === "admin") {
        await db.collection("admins").doc(userId).set(
          {
            email: "unknown",
            isAdmin: true,
            promotedAt: admin.firestore.FieldValue.serverTimestamp(),
            promotedBy: context.auth.uid,
          },
          { merge: true },
        );
      } else {
        // Demote - remove from admins
        await db.collection("admins").doc(userId).delete();
      }

      console.log(
        `User ${userId} role changed to ${role} by ${context.auth.uid}`,
      );

      return { success: true };
    } catch (error) {
      console.error("Error changing user role:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to change user role",
      );
    }
  });
