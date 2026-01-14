/**
 * Queue Recovery Script
 *
 * This script imports queued question reviews directly to Firestore.
 * Run with: node scripts/recover-queue.js path/to/queue_backup.json
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin with service account
// You'll need to download your service account key from Firebase Console
const serviceAccountPath = path.join(
  __dirname,
  "../firebase-service-account.json"
);

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Missing firebase-service-account.json");
  console.error(
    "Download from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key"
  );
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function recoverQueue(queueFilePath) {
  if (!queueFilePath) {
    console.error("Usage: node recover-queue.js <queue_backup.json>");
    process.exit(1);
  }

  if (!fs.existsSync(queueFilePath)) {
    console.error(`❌ File not found: ${queueFilePath}`);
    process.exit(1);
  }

  console.log(`📦 Loading queue from: ${queueFilePath}`);
  const queue = JSON.parse(fs.readFileSync(queueFilePath, "utf8"));

  console.log(`Found ${queue.length} items to recover\n`);

  let synced = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const question = item.question;

    if (!question || !question.uniqueId) {
      console.log(`⚠️ Skipping item ${i + 1}: No uniqueId`);
      skipped++;
      continue;
    }

    try {
      const docRef = db.collection("questions").doc(question.uniqueId);

      // Merge to preserve any existing data
      await docRef.set(question, { merge: true });

      synced++;

      if (synced % 20 === 0 || synced === queue.length) {
        const percent = Math.round(((i + 1) / queue.length) * 100);
        console.log(`✓ Progress: ${synced}/${queue.length} (${percent}%)`);
      }
    } catch (error) {
      failed++;
      errors.push({ id: question.uniqueId, error: error.message });
      console.error(
        `✗ Failed ${question.uniqueId.slice(0, 8)}: ${error.message}`
      );
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Synced: ${synced}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️ Skipped: ${skipped}`);
  console.log("=".repeat(50));

  if (errors.length > 0) {
    const errorLogPath = path.join(__dirname, "recovery-errors.json");
    fs.writeFileSync(errorLogPath, JSON.stringify(errors, null, 2));
    console.log(`\nErrors logged to: ${errorLogPath}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run the recovery
const queueFile = process.argv[2];
recoverQueue(queueFile);
