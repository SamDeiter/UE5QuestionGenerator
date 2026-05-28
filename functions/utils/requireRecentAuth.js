const functions = require("firebase-functions");

/**
 * Throws HttpsError("failed-precondition") if the caller's auth_time is
 * older than maxAgeMinutes. Use to gate destructive admin operations
 * (changeUserRole, revokeUserAccess, deleteAllQuestions) so a stolen tab
 * with a long-lived session can't perform privilege-escalation or
 * data-eating actions without recent proof of possession.
 *
 * The auth_time claim is set by Firebase Auth at the original sign-in
 * (or re-auth) and is preserved across token refreshes. To clear it, the
 * user must call `reauthenticateWithCredential` / `signInWithPopup`
 * again. We surface the error code "auth/recent-login-required" in
 * details so clients can prompt for re-auth.
 *
 * Default: 30 minutes. Tune per call site.
 */
function requireRecentAuth(context, maxAgeMinutes = 30) {
  if (!context || !context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in",
    );
  }

  // auth_time is in SECONDS since epoch (per JWT spec); Date.now() is ms.
  const authTimeSec = context.auth.token.auth_time;
  if (typeof authTimeSec !== "number") {
    // Token is malformed — refuse rather than fail-open.
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Auth token missing auth_time; please sign in again.",
      { code: "auth/recent-login-required" },
    );
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const ageSec = nowSec - authTimeSec;
  const maxAgeSec = maxAgeMinutes * 60;

  if (ageSec > maxAgeSec) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `This action requires recent authentication. Please sign out and back in to continue. ` +
        `(Session is ${Math.floor(ageSec / 60)} minutes old; limit is ${maxAgeMinutes}.)`,
      {
        code: "auth/recent-login-required",
        authTimeAgeSeconds: ageSec,
        maxAgeSeconds: maxAgeSec,
      },
    );
  }
}

module.exports = { requireRecentAuth };
