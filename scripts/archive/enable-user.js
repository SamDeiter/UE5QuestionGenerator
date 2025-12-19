const admin = require("firebase-admin");
const serviceAccount = require("../ue5-questions-prod-firebase-adminsdk-rrgay-51cbb70754.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const email = "samdeiter@gmail.com";

async function enableUser() {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${user.email} (UID: ${user.uid})`);
    console.log(`Disabled: ${user.disabled}`);

    if (user.disabled) {
      // Re-enable the user
      await admin.auth().updateUser(user.uid, {
        disabled: false,
      });
      console.log(`✅ Successfully re-enabled ${email}`);
    } else {
      console.log(`ℹ️ User ${email} is already enabled`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

enableUser();
