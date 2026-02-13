const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Rate limit constants
const MAX_CALLS_PER_WINDOW = 10;
const WINDOW_SECONDS = 300; // 5 minutes

/**
 * Cloud Function: logAuthFailure
 * Logs authentication failures to Firestore for admin monitoring.
 * Called client-side when auth-blocking errors (like securetoken 403) are detected.
 *
 * SECURITY: Rate limited to 10 calls per IP per 5-minute window.
 * SECURITY: Input fields are length-capped to prevent storage abuse.
 */
exports.logAuthFailure = functions
  .runWith({ timeoutSeconds: 10, memory: "128MB" })
  .https.onCall(async (data, context) => {
    // Allow both authenticated and unauthenticated calls
    // (user might fail to authenticate, that's what we're logging)
    const db = admin.firestore();

    // --- Rate Limiting (IP-based) ---
    const callerIp =
      context.rawRequest?.ip ||
      context.rawRequest?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
      "unknown";

    // Create a safe document ID from the IP
    const ipDocId = callerIp.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 64);

    try {
      const rateLimitRef = db.collection("rateLimits").doc(`authfail_${ipDocId}`);
      const rateLimitDoc = await rateLimitRef.get();

      if (rateLimitDoc.exists) {
        const rlData = rateLimitDoc.data();
        const windowStart = rlData.windowStart?.toDate?.() || new Date(0);
        const now = new Date();
        const elapsed = (now - windowStart) / 1000;

        if (elapsed < WINDOW_SECONDS) {
          // Still within the window
          if (rlData.count >= MAX_CALLS_PER_WINDOW) {
            console.warn(
              `[logAuthFailure] Rate limited IP: ${callerIp} (${rlData.count} calls)`,
            );
            return { success: false, error: "Rate limited. Try again later." };
          }
          // Increment counter
          await rateLimitRef.update({
            count: admin.firestore.FieldValue.increment(1),
          });
        } else {
          // Window expired — reset
          await rateLimitRef.set({
            count: 1,
            windowStart: admin.firestore.Timestamp.now(),
          });
        }
      } else {
        // First call from this IP — create counter
        await rateLimitRef.set({
          count: 1,
          windowStart: admin.firestore.Timestamp.now(),
        });
      }
    } catch (rlError) {
      // Rate limit check failed — log but don't block (fail open for logging)
      console.warn("[logAuthFailure] Rate limit check failed:", rlError.message);
    }

    // --- Input Sanitization ---
    const { errorCode, errorMessage, userAgent, timestamp } = data || {};

    // Cap string lengths to prevent storage abuse
    const safeErrorCode = String(errorCode || "unknown").substring(0, 50);
    const safeErrorMessage = String(errorMessage || "No message provided").substring(0, 500);
    const safeUserAgent = String(userAgent || "unknown").substring(0, 500);

    try {
      // Create auth failure log entry
      const logEntry = {
        errorCode: safeErrorCode,
        errorMessage: safeErrorMessage,
        userAgent: safeUserAgent,
        timestamp: timestamp
          ? new Date(timestamp)
          : admin.firestore.FieldValue.serverTimestamp(),
        userId: context.auth?.uid || null,
        userEmail: context.auth?.token?.email || null,
        callerIp: callerIp,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Write to authFailures collection
      const docRef = await db.collection("authFailures").add(logEntry);

      console.log(`[logAuthFailure] Logged auth failure: ${docRef.id}`, {
        errorCode: safeErrorCode,
        userEmail: logEntry.userEmail,
      });

      // Optional: Send email notification to admin for critical errors
      if (safeErrorCode === "403" || safeErrorCode === "auth/internal-error") {
        console.log(
          "[logAuthFailure] CRITICAL: Token Service API may be disabled",
        );
      }

      return { success: true, logId: docRef.id };
    } catch (error) {
      console.error("[logAuthFailure] Failed to log auth failure:", error);
      // Don't throw - we don't want logging failures to break the client
      return { success: false, error: error.message };
    }
  });

/**
 * Cloud Function: getRecentAuthFailures
 * Retrieves recent auth failures for admin dashboard.
 * Admin-only function.
 */
exports.getRecentAuthFailures = functions
  .runWith({ timeoutSeconds: 15, memory: "128MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be logged in",
      );
    }

    const db = admin.firestore();

    // Check if user is admin
    const userDoc = await db
      .collection("registeredUsers")
      .doc(context.auth.uid)
      .get();
    if (!userDoc.exists || userDoc.data().role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required",
      );
    }

    const { limit = 20 } = data || {};

    try {
      const snapshot = await db
        .collection("authFailures")
        .orderBy("createdAt", "desc")
        .limit(Math.min(limit, 100))
        .get();

      const failures = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString(),
      }));

      return { failures, count: failures.length };
    } catch (error) {
      console.error("[getRecentAuthFailures] Error:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });
