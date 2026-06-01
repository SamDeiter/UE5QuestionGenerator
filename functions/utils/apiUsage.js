/**
 * Utility: Log API usage for analytics
 * Extracted from index.js during modularization
 */

const admin = require("firebase-admin");

const { getDb } = require("../db");
/**
 * Log API usage for rate limiting and analytics
 */
async function logApiUsage(userId, data) {
  const db = getDb();
  await db.collection("apiUsage").add({
    userId,
    ...data,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}


module.exports = { logApiUsage };
