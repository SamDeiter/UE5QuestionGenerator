/**
 * Rate Limiter Middleware for Cloud Functions
 * Implements token bucket algorithm using Firestore rateLimits collection
 *
 * Limits:
 * - 10 AI requests per hour per user
 * - 100 AI requests per day per user
 * - 3 requests in 10 seconds burst allowance
 */

const admin = require("firebase-admin");
const functions = require("firebase-functions");

// Rate limit configuration
const RATE_LIMITS = {
  AI_HOURLY: {
    tokens: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    burstTokens: 3,
    burstWindowMs: 10 * 1000, // 10 seconds
  },
  AI_DAILY: {
    tokens: 100,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
};

/**
 * Check if user has exceeded rate limit
 * @param {string} userId - The authenticated user's UID
 * @param {string} limitType - Type of limit (e.g., 'AI_HOURLY', 'AI_DAILY')
 * @returns {Promise<{allowed: boolean, resetAt?: Date}>}
 */
async function checkRateLimit(userId, limitType) {
  const limit = RATE_LIMITS[limitType];
  if (!limit) {
    throw new Error(`Unknown limit type: ${limitType}`);
  }

  const db = admin.firestore();
  const rateLimitRef = db
    .collection("rateLimits")
    .doc(`${userId}_${limitType}`);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const now = Date.now();

      if (!doc.exists) {
        // First request - create counter
        transaction.set(rateLimitRef, {
          userId,
          limitType,
          tokenCount: limit.tokens - 1,
          lastRefill: now,
          windowStart: now,
        });
        return { allowed: true };
      }

      const data = doc.data();
      const elapsed = now - data.windowStart;

      // Check if window has expired - refill tokens
      if (elapsed >= limit.windowMs) {
        transaction.update(rateLimitRef, {
          tokenCount: limit.tokens - 1,
          windowStart: now,
          lastRefill: now,
        });
        return { allowed: true };
      }

      // Check burst limit if configured
      if (limit.burstTokens && limit.burstWindowMs) {
        const burstElapsed = now - (data.lastBurst || 0);
        if (
          burstElapsed < limit.burstWindowMs &&
          (data.burstCount || 0) >= limit.burstTokens
        ) {
          const resetAt = new Date(data.lastBurst + limit.burstWindowMs);
          return {
            allowed: false,
            resetAt,
            reason: "Burst limit exceeded",
          };
        }
      }

      // Check if tokens available
      if (data.tokenCount <= 0) {
        const resetAt = new Date(data.windowStart + limit.windowMs);
        return {
          allowed: false,
          resetAt,
          reason: `${limitType} rate limit exceeded`,
        };
      }

      // Consume token
      const updates = {
        tokenCount: data.tokenCount - 1,
      };

      // Update burst tracking if applicable
      if (limit.burstTokens) {
        const burstElapsed = now - (data.lastBurst || 0);
        if (burstElapsed >= limit.burstWindowMs) {
          // Reset burst window
          updates.burstCount = 1;
          updates.lastBurst = now;
        } else {
          // Increment burst counter
          updates.burstCount = (data.burstCount || 0) + 1;
        }
      }

      transaction.update(rateLimitRef, updates);
      return { allowed: true };
    });

    return result;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open (allow request) on technical errors to prevent service outage
    return { allowed: true };
  }
}

/**
 * Middleware to enforce rate limiting on Cloud Functions
 * @param {string} limitType - Type of limit to check
 * @returns {Function} Middleware function
 */
function rateLimitMiddleware(limitType) {
  return async (data, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    const userId = context.auth.uid;

    // Check rate limit
    const result = await checkRateLimit(userId, limitType);

    if (!result.allowed) {
      const resetTime = result.resetAt
        ? Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
        : 3600;

      throw new functions.https.HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. ${result.reason || "Please try again later."}`,
        {
          resetInSeconds: resetTime,
          resetAt: result.resetAt?.toISOString(),
        }
      );
    }

    return true; // Passed rate limit check
  };
}

module.exports = {
  checkRateLimit,
  rateLimitMiddleware,
  RATE_LIMITS,
};
