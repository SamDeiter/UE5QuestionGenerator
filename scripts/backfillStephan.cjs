/**
 * Quick script to call the backfillCustomClaims function for Stephan
 * Run with: node scripts/backfillStephan.cjs
 *
 * Prerequisite: Run `gcloud auth application-default login` first
 */

const admin = require("firebase-admin");

// Initialize admin SDK with application default credentials
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: "ue5-questions-prod",
  });
  console.log("Initialized Firebase Admin");
} catch (e) {
  console.log("Init status:", e.message);
}

const STEPHAN_UID = "1VqAYGID2fbLjeTiZCL2EoMqnwm1";

async function backfillStephan() {
  try {
    const db = admin.firestore();

    // Get Stephan's registration data
    const userDoc = await db
      .collection("registeredUsers")
      .doc(STEPHAN_UID)
      .get();

    if (!userDoc.exists) {
      console.error("User not found in registeredUsers");
      return;
    }

    const userData = userDoc.data();
    console.log("User data:", userData);

    // Set custom claims
    const claims = {
      role: userData.role || "reviewer",
      tools: userData.tools || ["questions"],
    };

    console.log("Setting claims:", claims);

    await admin.auth().setCustomUserClaims(STEPHAN_UID, claims);

    console.log("Custom claims set for Stephan!");
    console.log("He needs to log out and log back in to get the new token.");
  } catch (error) {
    console.error("Error:", error);
  }
}

backfillStephan().then(() => process.exit(0));
