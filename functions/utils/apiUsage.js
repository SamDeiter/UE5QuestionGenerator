/**
 * Utility: Log API usage for analytics
 * Extracted from index.js during modularization
 */

const admin = require("firebase-admin");

/**
 * Log API usage for rate limiting and analytics
 */
async function logApiUsage(userId, data) {
  const db = admin.firestore();
  await db.collection("apiUsage").add({
    userId,
    ...data,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}


module.exports = { logApiUsage };
