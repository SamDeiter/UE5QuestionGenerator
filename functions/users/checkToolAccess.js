const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Cloud Function: checkToolAccess
 * Verifies if a user has access to a specific tool.
 * Epic Games employees automatically have access to all tools.
 * External users must be registered with the tool in their 'tools' array.
 */
exports.checkToolAccess = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    // 1. Authentication check
    if (!context.auth) {
      return {
        hasAccess: false,
        reason: "Unauthenticated",
        requiresLogin: true,
      };
    }

    const { toolId } = data;
    if (!toolId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "toolId is required",
      );
    }

    const email = context.auth.token.email;
    const userId = context.auth.uid;
    const claims = context.auth.token;
    const db = admin.firestore();

    try {
      const emailLower = email ? email.toLowerCase() : "";
      const isEpicEmployee =
        emailLower.endsWith("@epicgames.com") ||
        emailLower.endsWith("@xa.epicgames.com");

      // 1. Custom claims short-circuit (zero Firestore reads).
      // SECURITY: claims are authoritative. The Epic-employee shortcut
      // that used to live here granted hasAccess=true + role='admin' to
      // every Epic email regardless of stored role — we removed it so
      // the stored role + tool list win.
      if (claims.tools && Array.isArray(claims.tools)) {
        return {
          hasAccess: claims.tools.includes(toolId),
          role: claims.role || "reviewer",
          isEmployee: isEpicEmployee,
        };
      }

      // 2. Check registeredUsers for explicit tool access.
      const userDoc = await db.collection("registeredUsers").doc(userId).get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const tools = userData.tools || [];

        const hasAccess = tools.includes(toolId);

        console.log(`User ${email} access for ${toolId}: ${hasAccess}`);

        return {
          hasAccess: hasAccess,
          role: userData.role || "reviewer",
          isEmployee: isEpicEmployee,
        };
      }

      // 3. Brand-new Epic-domain user, no record yet. Phase C auto-reviewer
      // policy: grant access to the 'questions' tool only — broader grants
      // are an explicit admin action via changeUserRole/updateUserTools.
      if (isEpicEmployee) {
        return {
          hasAccess: toolId === "questions",
          role: "reviewer",
          isEmployee: true,
          autoGranted: true,
        };
      }

      // 4. Check 'admins' collection (legacy/bootstrap check)
      const adminDoc = await db.collection("admins").doc(userId).get();
      if (adminDoc.exists) {
        console.log(
          `User ${email} found in admins collection, granting access to ${toolId}`,
        );
        return { hasAccess: true, role: "admin" };
      }

      return {
        hasAccess: false,
        reason: "User not registered for this tool.",
        requiresInvite: true,
      };
    } catch (error) {
      console.error(`Error checking access for tool ${toolId}:`, error);
      return {
        hasAccess: false,
        error: error.message,
      };
    }
  });
