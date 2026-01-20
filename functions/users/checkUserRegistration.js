const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Import utility functions
const { isAdminUser } = require("../utils/isAdminUser");

/**
 * Cloud Function: checkUserRegistration
 * Checks if a user is registered (has used a valid invite)
 */
exports.checkUserRegistration = functions
  .runWith({ timeoutSeconds: 15, memory: "128MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      return { registered: false };
    }

    const db = admin.firestore();
    const userId = context.auth.uid;

    try {
      // 1. Epic Games Employee auto-registration check
      const email = context.auth.token.email;
      if (email && email.toLowerCase().endsWith("@epicgames.com")) {
        return {
          registered: true,
          role: "admin",
          isEmployee: true,
          tools: ["questions", "blueprint", "scenario", "materials"],
        };
      }

      const userDoc = await db.collection("registeredUsers").doc(userId).get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        return {
          registered: true,
          role: userData.role || "reviewer",
          registeredAt: userData.registeredAt?.toDate()?.toISOString(),
          tools: userData.tools || ["questions"], // Default to questions for backward compatibility
        };
      }

      // 2. Also check if user is an admin (admins don't need invites)
      const isAdmin = await isAdminUser(userId);
      if (isAdmin) {
        return {
          registered: true,
          role: "admin",
          tools: ["questions", "blueprint", "scenario", "materials"],
        };
      }

      return { registered: false };
    } catch (error) {
      console.error("Error checking registration:", error);
      return { registered: false };
    }
  });
