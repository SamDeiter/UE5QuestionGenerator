const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

/**
 * Retrieve Active Invite Links
 *
 * This script queries Firebase for all active invites and generates
 * the corresponding invite URLs for distribution.
 */

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "ue5questionssoure",
  });
}

const db = admin.firestore();

async function retrieveInviteLinks() {
  console.log("🔍 Retrieving active invite links from Firebase...\n");

  try {
    const snapshot = await db
      .collection("invites")
      .where("isActive", "==", true)
      .where("role", "==", "reviewer")
      .get();

    if (snapshot.empty) {
      console.log("❌ No active reviewer invites found.");
      process.exit(0);
    }

    const baseUrl = "https://samdeiter.github.io/UE5QuestionGenerator/";
    const results = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const code = doc.id;

      // Generate the invite URL
      let inviteUrl = `${baseUrl}?invite=${code}`;

      // If this is a targeted invite, include the email parameter
      if (data.forEmail) {
        inviteUrl += `&email=${encodeURIComponent(data.forEmail)}`;
      }

      results.push({
        code,
        email: data.forEmail || "N/A (General Invite)",
        createdAt: data.createdAt?.toDate().toISOString() || "Unknown",
        expiresAt: data.expiresAt?.toDate().toISOString() || "Unknown",
        maxUses: data.maxUses,
        currentUses: data.currentUses,
        note: data.note || "",
        inviteUrl,
      });
    });

    // Sort by creation date (newest first)
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Build output string
    let output = `ACTIVE REVIEWER INVITE LINKS\n`;
    output += `Generated: ${new Date().toISOString()}\n`;
    output += `Total Active Invites: ${results.length}\n`;
    output += `${"═".repeat(80)}\n\n`;

    results.forEach((invite, index) => {
      output += `[${index + 1}] Invite Code: ${invite.code}\n`;
      output += `    Email: ${invite.email}\n`;
      output += `    Created: ${invite.createdAt}\n`;
      output += `    Expires: ${invite.expiresAt}\n`;
      output += `    Uses: ${invite.currentUses}/${invite.maxUses}\n`;
      if (invite.note) output += `    Note: ${invite.note}\n`;
      output += `    \n    🔗 INVITE LINK:\n    ${invite.inviteUrl}\n\n`;
      output += `${"─".repeat(80)}\n\n`;
    });

    // Save to file
    const outputPath = path.join(__dirname, "INVITE_LINKS.txt");
    fs.writeFileSync(outputPath, output, "utf8");

    // Also print to console
    console.log(output);
    console.log(`\n✅ Invite links saved to: ${outputPath}`);
    console.log(
      "⚠️  REMEMBER: This file contains PII. Do NOT commit it to Git!\n"
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error retrieving invites:", error);
    process.exit(1);
  }
}

retrieveInviteLinks();
