/**
 * Register a user and set them as super admin
 * Run with: node scripts/register-super-admin.js
 */

const admin = require("firebase-admin");
const readline = require("readline");

// Initialize Firebase Admin
const serviceAccount = require("../ue5-questions-prod-firebase-adminsdk-ku1u5-b36adb0bb7.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function registerSuperAdmin() {
  try {
    console.log("\n🔧 Super Admin Registration Tool\n");

    const email = await question("Enter email address: ");
    const uid = await question("Enter UID (leave empty to auto-generate): ");

    let userRecord;

    if (uid && uid.trim()) {
      // Use specific UID
      console.log(`\n📝 Creating user with UID: ${uid}`);
      userRecord = await admin.auth().createUser({
        uid: uid.trim(),
        email: email.trim(),
        emailVerified: true,
      });
    } else {
      // Check if user already exists
      try {
        userRecord = await admin.auth().getUserByEmail(email.trim());
        console.log(`\n✅ User already exists with UID: ${userRecord.uid}`);
      } catch (error) {
        if (error.code === "auth/user-not-found") {
          // Create new user
          console.log("\n📝 Creating new user...");
          userRecord = await admin.auth().createUser({
            email: email.trim(),
            emailVerified: true,
          });
          console.log(`✅ Created user with UID: ${userRecord.uid}`);
        } else {
          throw error;
        }
      }
    }

    // Add to admins collection
    console.log("\n📝 Adding to admins collection...");
    await db.collection("admins").doc(userRecord.uid).set({
      email: userRecord.email,
      isAdmin: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Add to registeredUsers collection
    console.log("📝 Adding to registeredUsers collection...");
    await db.collection("registeredUsers").doc(userRecord.uid).set({
      email: userRecord.email,
      uid: userRecord.uid,
      role: "admin",
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      inviteCode: "MANUAL_ADMIN_SETUP",
    });

    console.log("\n✅ SUCCESS! Super admin registered:");
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Role: Super Admin`);
    console.log("\n🎉 You can now sign in with this account!");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

registerSuperAdmin();
