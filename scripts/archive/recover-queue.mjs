/**
 * Queue Recovery Script (ESM version)
 *
 * This script imports queued question reviews directly to Firestore.
 * Run with: node scripts/recover-queue.mjs path/to/queue_backup.json
 */

import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin with service account
const serviceAccountPath = join(__dirname, "../firebase-service-account.json");

if (!existsSync(serviceAccountPath)) {
  console.error("❌ Missing firebase-service-account.json");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function recoverQueue(queueFilePath) {
  if (!queueFilePath) {
    console.error("Usage: node recover-queue.mjs <queue_backup.json>");
    process.exit(1);
  }

  if (!existsSync(queueFilePath)) {
    console.error(`❌ File not found: ${queueFilePath}`);
    process.exit(1);
  }

  console.log(`📦 Loading queue from: ${queueFilePath}`);
  const queue = JSON.parse(readFileSync(queueFilePath, "utf8"));

  console.log(`Found ${queue.length} items to recover\n`);

  let synced = 0;
  let failed = 0;
  let skipped = 0;

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
      await docRef.set(question, { merge: true });
      synced++;

      if (synced % 20 === 0 || synced === queue.length) {
        const percent = Math.round(((i + 1) / queue.length) * 100);
        console.log(`✓ Progress: ${synced}/${queue.length} (${percent}%)`);
      }
    } catch (error) {
      failed++;
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

  process.exit(failed > 0 ? 1 : 0);
}

// Run the recovery
const queueFile = process.argv[2];
recoverQueue(queueFile);
