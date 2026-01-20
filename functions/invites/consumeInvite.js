const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Cloud Function: consumeInvite
 * Marks an invite as used and creates a registeredUsers entry with specific tool access.
 * REQUIRES authentication
 */
exports.consumeInvite = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    // 1. MUST be authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in to use invite",
      );
    }

    const { code } = data;
    const userEmail = context.auth.token.email;
    const userId = context.auth.uid;
    const db = admin.firestore();

    // 2. Sanitize code
    const sanitizedCode = (code || "")
      .replace(/[^A-Za-z0-9]/g, "")
      .substring(0, 16)
      .toUpperCase();

    if (!sanitizedCode) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invite code is required",
      );
    }

    try {
      const inviteRef = db.collection("invites").doc(sanitizedCode);
      const inviteDoc = await inviteRef.get();

      if (!inviteDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Invalid invite code",
        );
      }

      const invite = inviteDoc.data();

      // 3. Check if already used by this user
      const alreadyUsed = invite.usedBy?.some(
        (u) => u.email === userEmail || u.uid === userId,
      );
      if (alreadyUsed) {
        return {
          success: true,
          alreadyUsed: true,
          role: invite.role,
          tools: invite.tools || ["questions"],
        };
      }

      // 4. Validate email if this is an email-specific invite
      if (invite.forEmail) {
        const normalizedUserEmail = userEmail.toLowerCase().trim();
        const normalizedInviteEmail = invite.forEmail.toLowerCase().trim();

        if (normalizedUserEmail !== normalizedInviteEmail) {
          throw new functions.https.HttpsError(
            "permission-denied",
            `This invite is for ${invite.forEmail} only. You are signed in as ${userEmail}.`,
          );
        }
      }

      // 5. Validate invite validity
      if (!invite.isActive) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Invite revoked",
        );
      }
      if (invite.expiresAt && invite.expiresAt.toDate() < new Date()) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Invite expired",
        );
      }
      if (invite.maxUses !== -1 && invite.currentUses >= invite.maxUses) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Invite limit reached",
        );
      }

      // 6. Update invite usage
      await inviteRef.update({
        currentUses: admin.firestore.FieldValue.increment(1),
        usedBy: admin.firestore.FieldValue.arrayUnion({
          email: userEmail,
          uid: userId,
          usedAt: admin.firestore.Timestamp.now(),
        }),
      });

      // 7. Mark user as registered with granted tools
      const grantedTools = invite.tools || ["questions"];

      await db
        .collection("registeredUsers")
        .doc(userId)
        .set(
          {
            email: userEmail,
            uid: userId,
            inviteCode: sanitizedCode,
            role: invite.role || "reviewer",
            tools: grantedTools,
            grantedBy: invite.createdByEmail || "system",
            registeredAt: admin.firestore.Timestamp.now(),
          },
          { merge: true },
        );

      console.log(
        `Invite ${sanitizedCode} consumed by ${userEmail}. Tools: ${grantedTools.join(", ")}`,
      );

      // 8. AUDIT LOG
      try {
        await db.collection("audit-log").add({
          eventType: "user_registered",
          userId: userId,
          userEmail: userEmail,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          details: {
            inviteCode: sanitizedCode,
            role: invite.role || "reviewer",
            tools: grantedTools,
          },
          severity: "info",
          userAgent: context.rawRequest?.headers?.["user-agent"] || "unknown",
        });
      } catch (logError) {
        console.error("Audit log failed:", logError);
      }

      return {
        success: true,
        role: invite.role || "reviewer",
        tools: grantedTools,
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error("Error consuming invite:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to consume invite",
      );
    }
  });
