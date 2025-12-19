/**
 * Cleanup Script: Delete Orphaned Discipline Questions
 *
 * This script deletes questions with old discipline names that were not migrated:
 * - "Game Logic & Systems" (159 questions)
 * - "Look Development (Materials)" (116 questions)
 * - "Technical Art" (57 questions) - note: different from "Tech Art"
 * - "Animation & Rigging" (1 question)
 *
 * Total: 333 questions to delete
 *
 * Run with: node scripts/cleanup_orphaned_disciplines.js
 * Execute with: node scripts/cleanup_orphaned_disciplines.js --execute
 */

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin (same as migrate_disciplines.js)
try {
  admin.initializeApp({
    projectId: "ue5-questions-prod",
  });
} catch (e) {
  if (!admin.apps.length) {
    console.error("Firebase init failed:", e);
    process.exit(1);
  }
}

const db = admin.firestore();

// Old discipline names to delete
const ORPHANED_DISCIPLINES = [
  "Game Logic & Systems",
  "Look Development (Materials)",
  "Technical Art", // Note: different from "Tech Art"
  "Animation & Rigging",
];

async function deleteOrphanedQuestions(dryRun = true) {
  console.log("\n========================================");
  console.log(dryRun ? "🔍 DRY RUN MODE (no deletions)" : "🗑️  DELETE MODE");
  console.log("========================================\n");

  // Create backup directory
  const backupDir = path.resolve(__dirname, "..", "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  let totalDeleted = 0;
  const deletionLog = [];
  const backupData = [];

  for (const discipline of ORPHANED_DISCIPLINES) {
    console.log(`\n📂 Processing: "${discipline}"`);

    const snapshot = await db
      .collection("questions")
      .where("discipline", "==", discipline)
      .get();

    console.log(`   Found: ${snapshot.size} questions`);

    if (snapshot.size === 0) {
      continue;
    }

    // Collect backup data
    snapshot.docs.forEach((doc) => {
      backupData.push({ _id: doc.id, ...doc.data() });
    });

    if (dryRun) {
      // Just log what would be deleted
      snapshot.docs.slice(0, 3).forEach((doc) => {
        const data = doc.data();
        console.log(
          `   - Sample: "${(data.question || "").substring(0, 60)}..."`
        );
      });
      totalDeleted += snapshot.size;
    } else {
      // Actually delete in batches
      const batchSize = 500;
      const docs = snapshot.docs;

      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = db.batch();
        const batchDocs = docs.slice(i, i + batchSize);

        batchDocs.forEach((doc) => {
          batch.delete(doc.ref);
          deletionLog.push({
            id: doc.id,
            discipline: discipline,
            question: (doc.data().question || "").substring(0, 50),
          });
        });

        await batch.commit();
        console.log(
          `   ✓ Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
            docs.length / batchSize
          )}`
        );
      }

      totalDeleted += snapshot.size;
    }
  }

  // Save backup before deletion
  if (backupData.length > 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(
      backupDir,
      `orphaned_questions_backup_${timestamp}.json`
    );
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`\n💾 Backup saved to: ${backupFile}`);
  }

  console.log("\n========================================");
  console.log(
    `${dryRun ? "Would delete" : "Deleted"}: ${totalDeleted} questions`
  );
  console.log("========================================\n");

  if (!dryRun && deletionLog.length > 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logPath = path.join(backupDir, `deletion_log_${timestamp}.json`);
    fs.writeFileSync(logPath, JSON.stringify(deletionLog, null, 2));
    console.log(`📝 Deletion log saved to: ${logPath}`);
  }

  return totalDeleted;
}

// Main execution
const args = process.argv.slice(2);
const isDryRun = !args.includes("--execute");

if (!isDryRun) {
  console.log(
    "\n⚠️  WARNING: This will PERMANENTLY DELETE questions from Firestore!"
  );
  console.log("   Press Ctrl+C within 5 seconds to cancel...\n");

  setTimeout(async () => {
    await deleteOrphanedQuestions(false);
    process.exit(0);
  }, 5000);
} else {
  console.log("\n💡 This is a DRY RUN. No data will be deleted.");
  console.log(
    "   To actually delete, run with: node scripts/cleanup_orphaned_disciplines.js --execute\n"
  );

  deleteOrphanedQuestions(true).then(() => process.exit(0));
}
