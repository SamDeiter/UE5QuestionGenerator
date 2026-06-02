const functions = require("firebase-functions");
const { getDb } = require("../db");
const admin = require("firebase-admin");

/**
 * Cloud Function: validateInvite
 * Validates an invite code server-side with rate limiting.
 * Returns the granted tools so the UI can preview what the user will get.
 */
exports.validateInvite = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    const { code } = data;
    const db = getDb();

    if (!code || typeof code !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invite code required",
      );
    }

    const sanitizedCode = code
      .replace(/[^A-Za-z0-9]/g, "")
      .substring(0, 16)
      .toUpperCase();

    // RATE LIMITING
    const clientId = context.rawRequest?.ip || "unknown";
    const rateLimitRef = db
      .collection("inviteAttempts")
      .doc(clientId.replace(/[^a-zA-Z0-9]/g, "_"));

    try {
      const rateLimitDoc = await rateLimitRef.get();
      if (rateLimitDoc.exists) {
        const rateData = rateLimitDoc.data();
        if (
          rateData.lockedUntil &&
          rateData.lockedUntil.toDate() > new Date()
        ) {
          throw new functions.https.HttpsError(
            "resource-exhausted",
            "Too many attempts. Try later.",
          );
        }
      }

      const inviteRef = db.collection("invites").doc(sanitizedCode);
      const inviteDoc = await inviteRef.get();

      if (!inviteDoc.exists) {
        await rateLimitRef.set(
          {
            attempts: admin.firestore.FieldValue.increment(1),
            lastAttempt: admin.firestore.Timestamp.now(),
          },
          { merge: true },
        );
        throw new functions.https.HttpsError(
          "not-found",
          "Invalid invite code",
        );
      }

      const invite = inviteDoc.data();

      if (!invite.isActive)
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Invite revoked",
        );
      if (invite.expiresAt && invite.expiresAt.toDate() < new Date())
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Invite expired",
        );
      if (invite.maxUses !== -1 && invite.currentUses >= invite.maxUses)
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Invite limit reached",
        );

      await rateLimitRef.delete();

      return {
        valid: true,
        role: invite.role || "reviewer",
        tools: invite.tools || ["questions"], // Show tools granted by this invite
        expiresAt: invite.expiresAt
          ? invite.expiresAt.toDate().toISOString()
          : null,
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("Error validating invite:", error);
      throw new functions.https.HttpsError("internal", "Validation failed");
    }
  });
