/**
 * Check and fix user account status
 * Run with: node scripts/fix-user-account.js <email>
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin
const serviceAccount = require("../ue5-questions-prod-firebase-adminsdk-ku1u5-b36adb0bb7.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixUserAccount(email) {
  try {
    console.log(`\n🔍 Checking account: ${email}\n`);

    // Get user from Firebase Auth
    const userRecord = await admin.auth().getUserByEmail(email);

    console.log(`✅ Account exists with UID: ${userRecord.uid}`);
    console.log(`   Disabled: ${userRecord.disabled}`);
    console.log(`   Email Verified: ${userRecord.emailVerified}`);

    if (userRecord.disabled) {
      console.log("\n🔧 Account is disabled. Re-enabling...");
      await admin.auth().updateUser(userRecord.uid, {
        disabled: false,
      });
      console.log("✅ Account re-enabled!");
    }

    // Check if in registeredUsers
    const registeredUserDoc = await db
      .collection("registeredUsers")
      .doc(userRecord.uid)
      .get();

    if (!registeredUserDoc.exists) {
      console.log("\n📝 Adding to registeredUsers collection...");
      await db.collection("registeredUsers").doc(userRecord.uid).set({
        email: userRecord.email,
        uid: userRecord.uid,
        role: "user",
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        inviteCode: "RESTORED_ACCOUNT",
      });
      console.log("✅ Added to registeredUsers!");
    } else {
      const userData = registeredUserDoc.data();
      if (userData.isRevoked) {
        console.log("\n🔧 Removing revoked flag...");
        await db.collection("registeredUsers").doc(userRecord.uid).update({
          isRevoked: admin.firestore.FieldValue.delete(),
          revokedAt: admin.firestore.FieldValue.delete(),
          revokedBy: admin.firestore.FieldValue.delete(),
        });
        console.log("✅ Revoked flag removed!");
      } else {
        console.log("✅ Already in registeredUsers collection");
      }
    }

    console.log("\n🎉 Account is ready to use!");
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Role: user`);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      console.log("\n❌ Account does not exist in Firebase Auth");
      console.log("💡 You can create a new account by signing up normally");
    } else {
      console.error("\n❌ Error:", error.message);
    }
  } finally {
    process.exit(0);
  }
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/fix-user-account.js <email>");
  process.exit(1);
}

fixUserAccount(email);
