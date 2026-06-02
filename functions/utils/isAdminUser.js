/**
 * Utility: Check if a user is an admin
 * Checks in order: Custom Claims (fastest) → registeredUsers → legacy admins collection
 */

const admin = require("firebase-admin");

const { getDb } = require("../db");
/**
 * Check if a user is an admin
 * Priority: 1) Auth custom claims, 2) registeredUsers doc, 3) legacy admins collection
 * @param {string} uid - User ID
 * @returns {Promise<boolean>} True if user is admin
 */
async function isAdminUser(uid) {
  if (!uid) return false;

  // 1. Check custom claims first (fastest — no Firestore read)
  try {
    const userRecord = await admin.auth().getUser(uid);
    const claims = userRecord.customClaims || {};
    if (claims.role === "admin" || claims.admin === true) {
      return true;
    }
  } catch (claimsError) {
    // Auth lookup failed — fall through to Firestore checks
    console.warn("[isAdminUser] Claims lookup failed:", claimsError.message);
  }

  const db = getDb();

  // 2. Check registeredUsers (canonical source of truth)
  try {
    const regDoc = await db.collection("registeredUsers").doc(uid).get();
    if (regDoc.exists) {
      const role = regDoc.data().role;
      if (role === "admin" || role === "super_admin" || role === "owner") {
        return true;
      }
    }
  } catch (regError) {
    console.warn("[isAdminUser] registeredUsers lookup failed:", regError.message);
  }

  // 3. Legacy admins collection (fallback — can be removed after full migration)
  try {
    const adminDoc = await db.collection("admins").doc(uid).get();
    return adminDoc.exists;
  } catch (adminError) {
    console.warn("[isAdminUser] admins lookup failed:", adminError.message);
    return false;
  }
}

module.exports = { isAdminUser };
