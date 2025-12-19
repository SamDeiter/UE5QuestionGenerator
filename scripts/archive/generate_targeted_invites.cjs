const admin = require("firebase-admin");
const crypto = require("crypto");

/**
 * TEMPLATE: Targeted Invite Generator
 *
 * INSTRUCTIONS:
 * 1. Fill the 'users' array with actual data.
 * 2. Run: node scripts/generate_targeted_invites.cjs
 * 3. SCRUB THIS FILE IMMEDIATELY AFTER USE.
 */

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "ue5questionssoure",
  });
}

const db = admin.firestore();

// SENSITIVE DATA REMOVED - USE ENV VARS OR TEMPORARY LOCAL EDITS
const users = [
  // { name: "Name", email: "email@example.com" },
];

async function generateInvites() {
  if (users.length === 0) {
    console.error(
      "❌ No users defined. Edit this file to add target users temporarily."
    );
    process.exit(1);
  }

  console.log("🚀 Generating targeted REVIEWER invites...\n");

  const results = [];

  for (const user of users) {
    const code = crypto
      .randomBytes(9)
      .toString("base64")
      .replace(/[^A-Za-z0-9]/g, "")
      .substring(0, 12)
      .toUpperCase();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const inviteData = {
      code,
      createdBy: "system_template",
      createdAt: admin.firestore.Timestamp.now(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      maxUses: 1,
      currentUses: 0,
      role: "reviewer",
      isActive: true,
      note: `Targeted invite`,
      forEmail: user.email.toLowerCase().trim(),
      usedBy: [],
    };

    await db.collection("invites").doc(code).set(inviteData);

    const baseUrl = "https://samdeiter.github.io/UE5QuestionGenerator/";
    const inviteUrl = `${baseUrl}?invite=${code}&email=${encodeURIComponent(
      user.email.toLowerCase().trim()
    )}`;

    results.push({
      name: user.name,
      email: user.email,
      code,
      inviteUrl,
    });

    console.log(`✅ Created invite for ${user.name}`);
  }

  console.log("\nDone!");
  process.exit(0);
}

generateInvites().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
