/**
 * Script to create an invite code directly in Firestore
 * Run with: node scripts/create-invite.js
 */

const admin = require("firebase-admin");
const path = require("path");
const crypto = require("crypto");

// Initialize with service account
const serviceAccountPath = path.join(
  __dirname,
  "..",
  "service-account-key.json"
);

try {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
    projectId: "ue5questionssoure",
  });
} catch (e) {
  // Already initialized
}

const db = admin.firestore();

async function createInvite() {
  // Generate a readable invite code
  const code = crypto
    .randomBytes(9)
    .toString("base64")
    .replace(/[^A-Za-z0-9]/g, "")
    .substring(0, 12)
    .toUpperCase();

  // Calculate expiration (30 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const inviteData = {
    code,
    createdBy: "system",
    createdByEmail: "sam.deiter@epicgames.com",
    createdAt: admin.firestore.Timestamp.now(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    maxUses: -1, // Unlimited
    currentUses: 0,
    role: "user",
    isActive: true,
    note: "Test invite for development",
    usedBy: [],
  };

  await db.collection("invites").doc(code).set(inviteData);

  const inviteUrl = `https://samdeiter.github.io/UE5QuestionGenerator/?invite=${code}`;
  const localUrl = `http://localhost:5173/UE5QuestionGenerator/?invite=${code}`;

  console.log("\n✅ Invite code created successfully!\n");
  console.log("Code:", code);
  console.log("\nProduction URL:", inviteUrl);
  console.log("Local URL:", localUrl);
  console.log("\nExpires:", expiresAt.toLocaleDateString());
  console.log("Uses: Unlimited");

  process.exit(0);
}

createInvite().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
