/**
 * Rate Limiter Middleware for Cloud Functions
 * Implements token bucket algorithm using Firestore rateLimits collection
 *
 * Limits (sized for bulk translation on Gemini free tier):
 * - 250 AI requests per hour per user
 * - 1500 AI requests per day per user
 * - 5 requests in 30 seconds burst allowance
 *
 * Free-tier Gemini caps (gemini-2.5-flash-lite): 15 RPM, 1000 RPD.
 * These server-side limits sit slightly above to avoid double-throttling
 * while still preventing runaway abuse.
 */

const admin = require("firebase-admin");
const functions = require("firebase-functions");

// Rate limit configuration
const RATE_LIMITS = {
  AI_HOURLY: {
    tokens: 250,
    windowMs: 60 * 60 * 1000, // 1 hour
    burstTokens: 10,
    burstWindowMs: 30 * 1000, // 30 seconds — fits client 4.5s throttle (~7 reqs/30s) with headroom
  },
  AI_DAILY: {
    tokens: 1500,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  // Bulk-export gate: sized for normal admin workflow (a handful of exports
  // per day) while making corpus-pull abuse loud.
  EXPORT_HOURLY: {
    tokens: 10,
    windowMs: 60 * 60 * 1000,
  },
  EXPORT_DAILY: {
    tokens: 50,
    windowMs: 24 * 60 * 60 * 1000,
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
