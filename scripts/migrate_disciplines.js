/**
 * Discipline Migration Script
 *
 * MIGRATION GOAL:
 * Remap legacy discipline categories to the new consolidated list.
 *
 * OLD MAP -> NEW:
 * - Technical Art -> Tech Art
 * - Animation & Rigging -> Animation
 * - Game Logic & Systems -> Game Dev
 * - Look Development (Materials) -> Look Dev
 * - VFX (Niagara) -> VFX
 * - World Building & Level Design -> Worldbuilding
 * - C++ Programming -> Programming
 * - Blueprints -> Game Dev
 * - Networking -> Programming
 * - Lighting & Rendering -> Look Dev
 *
 * SAFETY:
 * 1. Creates a full backup of the 'questions' collection to 'backups/' before modifying.
 * 2. Logs every change to a migration log file.
 *
 * Usage: node scripts/migrate_disciplines.js
 */

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to resolve project root
const resolvePath = (...segments) => path.resolve(__dirname, "..", ...segments);

// Initialize Firebase Admin
// Assumes GOOGLE_APPLICATION_CREDENTIALS is set or using default sdk
try {
  // Use default credential search path
  admin.initializeApp({
    projectId: "ue5questionssoure",
  });
} catch (e) {
  if (!admin.apps.length) {
    console.error("Firebase init failed:", e);
    process.exit(1);
  }
}

const db = admin.firestore();

// MAPPING CONFIGURATION
const DISCIPLINE_MAP = {
  "Technical Art": "Tech Art",
  "Animation & Rigging": "Animation",
  "Game Logic & Systems": "Game Dev",
  "Look Development (Materials)": "Look Dev",
  "VFX (Niagara)": "VFX",
  "World Building & Level Design": "Worldbuilding",
  "C++ Programming": "Programming",
  Blueprints: "Game Dev", // Merged
  Networking: "Programming", // Merged
  "Lighting & Rendering": "Look Dev", // Merged
};

async function migrate() {
  const backupDir = resolvePath("backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `questions_backup_${timestamp}.json`);
  const logFile = path.join(backupDir, `migration_log_${timestamp}.txt`);

  console.log("🚀 Starting Discipline Migration...");
  console.log(`📂 Backup Directory: ${backupDir}`);

  try {
    // 1. FETCH ALL QUESTIONS
    console.log("📥 Fetching all questions for backup...");
    const snapshot = await db.collection("questions").get();

    if (snapshot.empty) {
      console.log("⚠️ No questions found in database.");
      process.exit(0);
    }

    const allQuestions = [];
    snapshot.forEach((doc) => {
      allQuestions.push({ _id: doc.id, ...doc.data() });
    });

    // 2. CREATE BACKUP
    console.log(`💾 Backing up ${allQuestions.length} documents...`);
    fs.writeFileSync(backupFile, JSON.stringify(allQuestions, null, 2));
    console.log(`✅ Backup saved to: ${backupFile}`);

    // 3. EXECUTE MIGRATION
    console.log("🔄 Analyzing and migrating categories...");

    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const logStream = fs.createWriteStream(logFile, { flags: "a" });
    logStream.write(`Migration Started: ${new Date().toISOString()}\n\n`);

    for (const doc of allQuestions) {
      const currentDiscipline = doc.discipline;

      // Check if this document needs updating
      if (DISCIPLINE_MAP[currentDiscipline]) {
        const newDiscipline = DISCIPLINE_MAP[currentDiscipline];
        const docRef = db.collection("questions").doc(doc._id);

        batch.update(docRef, {
          discipline: newDiscipline,
          lastMigratedAt: new Date().toISOString(),
          migrationNote: `Remapped from '${currentDiscipline}' to '${newDiscipline}'`,
        });

        const logMsg = `[UPDATE] ID: ${doc._id} | ${currentDiscipline} -> ${newDiscipline}`;
        console.log(logMsg);
        logStream.write(logMsg + "\n");

        batchCount++;
        updatedCount++;
      } else {
        skippedCount++;
      }

      // Commit batch if limit reached
      if (batchCount >= batchSize) {
        await batch.commit();
        console.log(`💾 Committed batch of ${batchCount} updates...`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Commit final batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`💾 Committed final batch of ${batchCount} updates...`);
    }

    logStream.write(`\nMigration Complete: ${new Date().toISOString()}`);
    logStream.write(`\nTotal Updated: ${updatedCount}`);
    logStream.write(`\nTotal Skipped: ${skippedCount}\n`);
    logStream.end();

    console.log("\n🎉 Migration Complete!");
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`📝 Log saved to: ${logFile}`);
  } catch (error) {
    console.error("❌ Migration Error:", error);
    process.exit(1);
  }
}

migrate();
