const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Cloud Function: logAuthFailure
 * Logs authentication failures to Firestore for admin monitoring.
 * Called client-side when auth-blocking errors (like securetoken 403) are detected.
 */
exports.logAuthFailure = functions
  .runWith({ timeoutSeconds: 10, memory: "128MB" })
  .https.onCall(async (data, context) => {
    // Allow both authenticated and unauthenticated calls
    // (user might fail to authenticate, that's what we're logging)
    const db = admin.firestore();

    const { errorCode, errorMessage, userAgent, timestamp } = data || {};

    try {
      // Create auth failure log entry
      const logEntry = {
        errorCode: errorCode || "unknown",
        errorMessage: errorMessage || "No message provided",
        userAgent: userAgent || "unknown",
        timestamp: timestamp
          ? new Date(timestamp)
          : admin.firestore.FieldValue.serverTimestamp(),
        userId: context.auth?.uid || null,
        userEmail: context.auth?.token?.email || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Write to authFailures collection
      const docRef = await db.collection("authFailures").add(logEntry);

      console.log(`[logAuthFailure] Logged auth failure: ${docRef.id}`, {
        errorCode,
        userEmail: logEntry.userEmail,
      });

      // Optional: Send email notification to admin for critical errors
      if (errorCode === "403" || errorCode === "auth/internal-error") {
        // Could integrate with SendGrid/Mailgun here
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
