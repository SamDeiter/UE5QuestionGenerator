/**
 * Utility: Rate limiting helper function
 * Extracted from index.js during modularization
 */

const admin = require("firebase-admin");

/**
 * Rate limiting helper
 * Checks if user has exceeded rate limits
 */
async function checkRateLimit(userId, type = "generation") {
  const db = admin.firestore();
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;

  // Get user's recent API calls
  const recentCalls = await db
    .collection("apiUsage")
    .where("userId", "==", userId)
    .where("timestamp", ">", new Date(oneMinuteAgo))
    .get();

  const callCount = recentCalls.size;

  // Rate limits (adjust as needed)
  const RATE_LIMITS = {
    generation: 10, // 10 requests per minute
    critique: 20, // 20 critiques per minute
  };

  const limit = RATE_LIMITS[type] || 10;

  if (callCount >= limit) {
    return {
      allowed: false,
      message: `You can make ${limit} ${type} requests per minute. Please wait.`,
    };
  }

  return { allowed: true };
}


module.exports = { checkRateLimit };
