const admin = require("firebase-admin");
admin.initializeApp({
  projectId: "ue5-questions-prod",
});

async function enableUser() {
  try {
    const email = "samdeiter@gmail.com";
    const user = await admin.auth().getUserByEmail(email);

    console.log(`Found user: ${email}`);
    console.log(`UID: ${user.uid}`);
    console.log(`Currently disabled: ${user.disabled}`);

    if (user.disabled) {
      await admin.auth().updateUser(user.uid, { disabled: false });
      console.log("✅ Successfully enabled user account!");
    } else {
      console.log("ℹ️ User is already enabled");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

enableUser();
