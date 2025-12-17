/**
 * Additional Cloud Functions for Admin Panel
 *
 * Add these to your existing functions/index.js file
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// List all registered users (Admin only)
exports.listRegisteredUsers = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in"
    );
  }

  const userDoc = await admin
    .firestore()
    .collection("users")
    .doc(context.auth.uid)
    .get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin access required"
    );
  }

  // Get all registered users
  const usersSnapshot = await admin
    .firestore()
    .collection("users")
    .orderBy("registeredAt", "desc")
    .get();

  const users = [];
  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    users.push({
      uid: doc.id,
      email: data.email,
      role: data.role || "user",
      registeredAt: data.registeredAt,
      inviteCode: data.inviteCode,
    });
  });

  return { users };
});

// List all invites (Admin only)
exports.listInvites = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in"
    );
  }

  const userDoc = await admin
    .firestore()
    .collection("users")
    .doc(context.auth.uid)
    .get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin access required"
    );
  }

  // Get active invites (not revoked, not expired)
  const now = new Date();
  const invitesSnapshot = await admin
    .firestore()
    .collection("invites")
    .where("revoked", "==", false)
    .orderBy("createdAt", "desc")
    .get();

  const invites = [];
  invitesSnapshot.forEach((doc) => {
    const data = doc.data();
    const expiresAt = data.expiresAt?.toDate();

    // Only include if not expired
    if (expiresAt && expiresAt > now) {
      invites.push({
        code: doc.id,
        role: data.role || "user",
        maxUses: data.maxUses,
        used: data.usedCount || 0,
        expiresAt: expiresAt.toISOString(),
        note: data.note || "",
        createdAt: data.createdAt?.toDate().toISOString(),
      });
    }
  });

  return { invites };
});

// Revoke user access (Admin only)
exports.revokeUserAccess = functions.https.onCall(async (data, context) => {
  const { userId } = data;

  // Verify admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in"
    );
  }

  const adminDoc = await admin
    .firestore()
    .collection("users")
    .doc(context.auth.uid)
    .get();
  if (!adminDoc.exists || adminDoc.data().role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin access required"
    );
  }

  // Don't allow revoking your own access
  if (userId === context.auth.uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Cannot revoke your own access"
    );
  }

  // Delete user document
  await admin.firestore().collection("users").doc(userId).delete();

  // Disable Firebase Auth account
  await admin.auth().updateUser(userId, { disabled: true });

  return { success: true };
});

// Change user role (Admin only)
exports.changeUserRole = functions.https.onCall(async (data, context) => {
  const { userId, role } = data;

  // Verify admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in"
    );
  }

  const adminDoc = await admin
    .firestore()
    .collection("users")
    .doc(context.auth.uid)
    .get();
  if (!adminDoc.exists || adminDoc.data().role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin access required"
    );
  }

  // Don't allow changing your own role
  if (userId === context.auth.uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Cannot change your own role"
    );
  }

  // Validate role
  if (!["user", "admin"].includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid role");
  }

  // Update user role
  await admin.firestore().collection("users").doc(userId).update({
    role: role,
    roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, role };
});
