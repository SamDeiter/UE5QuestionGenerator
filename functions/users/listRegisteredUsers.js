const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { isAdminUser } = require("../utils/isAdminUser");

/**
 * Cloud Function: listRegisteredUsers
 * Returns list of all registered users (ADMIN ONLY)
 */
exports.listRegisteredUsers = functions
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

    const db = admin.firestore();

    try {
      const usersSnapshot = await db
        .collection("registeredUsers")
        .orderBy("registeredAt", "desc")
        .limit(100) // Safety limit
        .get();

      const users = usersSnapshot.docs.map((doc) => {
        const userData = doc.data();
        return {
          ...userData,
          registeredAt:
            userData.registeredAt?.toDate?.()?.toISOString() ||
            userData.registeredAt,
        };
      });

      return { users };
    } catch (error) {
      console.error("Error listing users:", error);
      throw new functions.https.HttpsError("internal", "Failed to list users");
    }
  });
