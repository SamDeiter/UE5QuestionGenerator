const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: "ue5-questions-prod",
  });
}

const db = admin.firestore();

async function fixUserFirestore() {
  const uid = "Z2Xb1UPIxDRupH8eDEKV4Z2VTSI2";
  const email = "samdeiter@gmail.com";

  try {
    console.log(`Checking Firestore for user: ${email} (${uid})`);
    const userDoc = await db.collection("registeredUsers").doc(uid).get();

    if (!userDoc.exists) {
      console.log("Document missing. Creating record...");
      await db.collection("registeredUsers").doc(uid).set({
        uid: uid,
        email: email,
        role: "admin",
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        inviteCode: "RESTORED_BY_ADMIN",
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("✅ Successfully created registeredUsers record!");
    } else {
      console.log("ℹ️ Firestore record already exists.");
      console.log("Data:", userDoc.data());
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fixUserFirestore();
