const functions = require("firebase-functions");
const { getDb } = require("../db");
const admin = require("firebase-admin");

/**
 * Cloud Function: setupInitialAdmin
 *
 * Auto-registers Epic-domain users (and the configured SUPER_ADMIN_EMAIL)
 * with the **reviewer** role on first sign-in. Was previously auto-admin;
 * Phase C of the hardening plan demoted the default because domain
 * auto-admin makes a compromised Epic SSO into a tool admin instantly.
 *
 * Existing admins are GRANDFATHERED: the registeredUsers.set uses
 * `{ merge: true }`, so a doc that already has role='admin' keeps it.
 * The SUPER_ADMIN_EMAIL bootstrap account still receives 'admin' so the
 * tool isn't bricked when no admin exists yet.
 *
 * Promotion to admin is now an explicit action via `changeUserRole`.
 */
exports.setupInitialAdmin = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    const userEmail = context.auth.token.email;
    const userId = context.auth.uid;
    const db = getDb();

    const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "").toLowerCase();
    const ADMIN_DOMAINS = ["epicgames.com", "xa.epicgames.com"];
    const emailDomain = (userEmail || "").toLowerCase().split("@")[1];
    const isDomainUser = ADMIN_DOMAINS.includes(emailDomain);
    const isBootstrapAdmin =
      SUPER_ADMIN_EMAIL && userEmail.toLowerCase() === SUPER_ADMIN_EMAIL;

    if (!isDomainUser && !isBootstrapAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not authorized for initial registration",
      );
    }

    // Bootstrap admin keeps 'admin'; everyone else defaults to 'reviewer'.
    const grantedRole = isBootstrapAdmin ? "admin" : "reviewer";

    try {
      const result = await db.runTransaction(async (transaction) => {
        const userRef = db.collection("registeredUsers").doc(userId);
        const userDoc = await transaction.get(userRef);

        // IDEMPOTENCY + GRANDFATHER: if the user already has a role, honor
        // it — this preserves existing domain-admins from the old policy.
        if (userDoc.exists && userDoc.data().role) {
          const existingRole = userDoc.data().role;
          return {
            success: true,
            alreadyRegistered: true,
            message: `${userEmail} already registered as ${existingRole}`,
            role: existingRole,
          };
        }

        // First-time registration for a domain user (or first bootstrap).
        transaction.set(
          userRef,
          {
            email: userEmail,
            uid: userId,
            role: grantedRole,
            registeredAt: admin.firestore.Timestamp.now(),
            inviteCode: isBootstrapAdmin
              ? "INITIAL_ADMIN_SETUP"
              : "AUTO_REVIEWER_DOMAIN",
            tools: ["questions"],
          },
          { merge: true },
        );

        // Bootstrap admin also gets the legacy admins/{uid} doc so the
        // pre-claims fallback continues to recognize them.
        if (isBootstrapAdmin) {
          const adminRef = db.collection("admins").doc(userId);
          transaction.set(adminRef, {
            email: userEmail,
            isAdmin: true,
            createdAt: admin.firestore.Timestamp.now(),
            createdBy: "setupInitialAdmin",
          });
        }

        return {
          success: true,
          message: `${userEmail} registered as ${grantedRole}`,
          role: grantedRole,
        };
      });

      // Audit-log entry for the auto-reviewer grant (best-effort; failure
      // shouldn't block registration).
      if (!result.alreadyRegistered && result.role === "reviewer") {
        try {
          await db.collection("audit-log").add({
            eventType: "AUTO_REVIEWER_GRANT",
            userId,
            userEmail,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            details: {
              domain: emailDomain,
              grantedBy: "setupInitialAdmin",
            },
            severity: "info",
          });
        } catch (auditErr) {
          console.error("[setupInitialAdmin] audit log failed:", auditErr);
        }
      }

      // Sync custom claims so security rules see the role on next token
      // refresh. Phase C will drop the Firestore-doc fallback from rules,
      // making claims the source of truth.
      try {
        await admin.auth().setCustomUserClaims(userId, {
          role: result.role,
          tools: ["questions"],
        });
      } catch (claimsErr) {
        console.error("[setupInitialAdmin] claims sync failed:", claimsErr);
      }

      return result;
    } catch (error) {
      console.error("Error in setupInitialAdmin:", error);
      throw new functions.https.HttpsError("internal", "Failed to setup user");
    }
  });
