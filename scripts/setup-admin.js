/**
 * Admin Setup Script
 *
 * Adds the specified email as an admin in Firestore.
 * Run this once to set up initial admin access.
 *
 * Usage: node scripts/setup-admin.js
 */

const admin = require("firebase-admin");

// Initialize with application default credentials (uses firebase login)
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || "ue5questionssoure", // Your production project
});

const db = admin.firestore();

// Admin emails to add
const ADMIN_EMAILS = ["sam.deiter@epicgames.com"];

async function setupAdmins() {
  console.log("🔧 Setting up admin users...\n");

  for (const email of ADMIN_EMAILS) {
    try {
      // Get user by email from Firebase Auth
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
      } catch (authError) {
        console.log(`⚠️  User ${email} not found in Firebase Auth.`);
        console.log(
          `   They need to sign in first, then run this script again.`
        );
        continue;
      }

      const uid = userRecord.uid;
      console.log(`📧 Found user: ${email}`);
      console.log(`   UID: ${uid}`);

      // Add to admins collection
      await db.collection("admins").doc(uid).set({
        email: email,
        isAdmin: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: "setup-script",
      });

      console.log(`✅ Added ${email} as admin\n`);

      // Also add to registeredUsers so they bypass invite requirement
      await db.collection("registeredUsers").doc(uid).set(
        {
          email: email,
          uid: uid,
          role: "admin",
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          inviteCode: "ADMIN_SETUP",
        },
        { merge: true }
      );

      console.log(`✅ Marked ${email} as registered\n`);
    } catch (error) {
      console.error(`❌ Error setting up ${email}:`, error.message);
    }
  }

  console.log("🎉 Admin setup complete!");
  process.exit(0);
}

setupAdmins().catch(console.error);
