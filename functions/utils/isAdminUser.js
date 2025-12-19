/**
 * Utility: Check if a user is an admin
 * Extracted from index.js during modularization
 */

const admin = require("firebase-admin");

/**
 * Check if a user is an admin (from Firestore admins collection)
 * @param {string} uid - User ID
 * @returns {Promise<boolean>} True if user is admin
 */
async function isAdminUser(uid) {
  if (!uid) return false;
  const db = admin.firestore();
  const adminDoc = await db.collection("admins").doc(uid).get();
  return adminDoc.exists;
}

module.exports = { isAdminUser };
