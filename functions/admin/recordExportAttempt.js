const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { isAdminUser } = require("../utils/isAdminUser");
const { checkRateLimit } = require("../middleware/rateLimiter");

/**
 * Cloud Function: recordExportAttempt
 *
 * Server-side gate for bulk question exports. Closes the abuse / forensics
 * holes Phase B1's client-side admin check left open: per-user rate
 * limiting, append-only audit log entry, server-verified isAdmin.
 *
 * Gate-only by design — the actual data fetch stays in the client cache
 * (allQuestionsMap). The codebase has no precedent for shipping bulk data
 * through a callable, and the 10MB httpsCallable response cap would push
 * full-corpus exports into pagination. See B2 in the hardening plan.
 *
 * Caller: src/services/cloudFunctions.js → recordExportAttempt
 *         src/hooks/export/useExportFormatting.js handleBulkExport
 *
 * Returns: { allowed: true } on success.
 * Throws:  HttpsError('unauthenticated' | 'permission-denied' |
 *                     'invalid-argument' | 'resource-exhausted').
 */
exports.recordExportAttempt = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in to export.",
      );
    }

    const uid = context.auth.uid;

    if (!(await isAdminUser(uid))) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Bulk export is restricted to administrators.",
      );
    }

    const { scope, format, count, languages } = data || {};

    if (scope !== "all" && scope !== "filtered") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "scope must be 'all' or 'filtered'.",
      );
    }
    if (typeof format !== "string" || format.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "format is required.",
      );
    }
    if (typeof count !== "number" || count < 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "count must be a non-negative number.",
      );
    }

    // Rate limit: hourly first (smaller window, more likely to trip),
    // then daily. Throw on either, surfacing the resetAt to the client.
    for (const limitType of ["EXPORT_HOURLY", "EXPORT_DAILY"]) {
      const result = await checkRateLimit(uid, limitType);
      if (!result.allowed) {
        const resetTime = result.resetAt
          ? Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
          : 3600;
        throw new functions.https.HttpsError(
          "resource-exhausted",
          `Export rate limit exceeded. ${result.reason || "Please try again later."}`,
          {
            resetInSeconds: resetTime,
            resetAt: result.resetAt?.toISOString(),
            limitType,
          },
        );
      }
    }

    // Append-only audit row. Admin SDK bypasses the audit-log rule's
    // eventType allowlist (Phase A) so EXPORT_ALL/EXPORT_FILTERED can
    // be written here even though the client rule rejects them.
    try {
      await admin
        .firestore()
        .collection("audit-log")
        .add({
          eventType: scope === "all" ? "EXPORT_ALL" : "EXPORT_FILTERED",
          userId: uid,
          userEmail: context.auth.token.email || "unknown",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          details: {
            scope,
            format,
            count,
            languages: Array.isArray(languages) ? languages : [],
          },
          severity: "info",
        });
    } catch (err) {
      // Audit-log failure is non-fatal — the user has already been gated
      // and the consumed rate-limit tokens are the bigger signal anyway.
      console.error("[recordExportAttempt] audit-log write failed:", err);
    }

    return { allowed: true };
  });
