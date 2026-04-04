const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Cloud Function: setupInitialAdmin
 * One-time setup function to add initial admin user.
 * Can only be called by allowed emails or Epic Games domain accounts.
 *
 * NOTE: This file previously contained duplicate exports for generateQuestions,
 * generateCritique, validateInvite, consumeInvite, createInvite, revokeInvite,
 * and checkUserRegistration. Those duplicates were removed — each function now
 * lives in its own dedicated module under functions/ai/, functions/invites/,
 * and functions/users/. See functions/index.js for the canonical export map.
 */
exports.setupInitialAdmin = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    // Must be authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    const userEmail = context.auth.token.email;
    const userId = context.auth.uid;
    const db = admin.firestore();

    // Only allow specific emails or @epicgames.com domain to become admin
    const ALLOWED_INITIAL_ADMINS = [
      process.env.SUPER_ADMIN_EMAIL || "",
    ];

    // DOMAIN WHITELIST: @epicgames.com and @xa.epicgames.com emails automatically get admin access
    const ADMIN_DOMAINS = ["epicgames.com", "xa.epicgames.com"];
    const emailDomain = userEmail.toLowerCase().split("@")[1];
    const isDomainAdmin = ADMIN_DOMAINS.includes(emailDomain);
    const isExplicitAdmin = ALLOWED_INITIAL_ADMINS.includes(
      userEmail.toLowerCase(),
    );

    if (!isDomainAdmin && !isExplicitAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not authorized for initial admin setup",
      );
    }

    try {
      // Use transaction for atomic, idempotent admin setup
      const result = await db.runTransaction(async (transaction) => {
        const adminRef = db.collection("admins").doc(userId);
        const adminDoc = await transaction.get(adminRef);

        // IDEMPOTENCY CHECK: If already admin, return early (prevents double-submit)
        if (adminDoc.exists) {
          console.log(`Admin ${userEmail} already exists, skipping setup`);
          return {
            success: true,
            alreadyAdmin: true,
            message: `${userEmail} is already an admin`,
            role: "admin",
          };
        }

        // Add to admins collection (within transaction)
        transaction.set(adminRef, {
          email: userEmail,
          isAdmin: true,
          createdAt: admin.firestore.Timestamp.now(),
          createdBy: "setupInitialAdmin",
        });

        // Add to registeredUsers collection (within same transaction)
        const userRef = db.collection("registeredUsers").doc(userId);
        transaction.set(
          userRef,
          {
            email: userEmail,
            uid: userId,
            role: "admin",
            registeredAt: admin.firestore.Timestamp.now(),
            inviteCode: "INITIAL_ADMIN_SETUP",
          },
          { merge: true },
        );

        console.log(`Initial admin setup complete for ${userEmail}`);

        return {
          success: true,
          message: `${userEmail} is now an admin`,
          role: "admin",
        };
      });

      return result;
    } catch (error) {
      console.error("Error in setupInitialAdmin:", error);
      throw new functions.https.HttpsError("internal", "Failed to setup admin");
    }
  });
