/**
 * Utility: Rate limiting helper function
 * OPTIMIZED: Uses counter-based sliding window instead of scan-based approach
 *
 * Old approach: Query all apiUsage docs for user in last minute = O(n) reads
 * New approach: Single counter document with window reset = O(1) read/write
 */

const admin = require("firebase-admin");

// Constants for rate limiting
const WINDOW_MS = 60 * 1000; // 1 minute window
const RATE_LIMITS = {
  generation: 10, // 10 requests per minute
  critique: 20, // 20 critiques per minute
  export: 5, // 5 exports per minute
  import: 3, // 3 imports per minute
};

/**
 * Optimized rate limiting using counter document with sliding window
 * @param {string} userId - User ID to check
 * @param {string} type - Request type: 'generation', 'critique', 'export', 'import'
 * @returns {Promise<{allowed: boolean, message?: string}>}
 */
async function checkRateLimit(userId, type = "generation") {
  const db = admin.firestore();
  const counterRef = db.collection("rateLimits").doc(`${userId}_${type}`);
  const limit = RATE_LIMITS[type] || 10;
  const now = Date.now();

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterRef);
      const data = doc.exists ? doc.data() : { windowStart: now, count: 0 };

      // Reset window if expired
      if (now - data.windowStart > WINDOW_MS) {
        transaction.set(counterRef, { windowStart: now, count: 1 });
        return { allowed: true };
      }

      // Check limit
      if (data.count >= limit) {
        const resetIn = Math.ceil((data.windowStart + WINDOW_MS - now) / 1000);
        return {
          allowed: false,
          message: `Rate limit: ${limit}/${type}/min. Try again in ${resetIn}s.`,
        };
      }

      // Increment counter
      transaction.update(counterRef, {
        count: admin.firestore.FieldValue.increment(1),
      });
      return { allowed: true };
    });

    return result;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open to avoid blocking legitimate requests on error
    return { allowed: true };
  }
}

module.exports = { checkRateLimit, RATE_LIMITS };
