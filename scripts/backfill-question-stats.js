/**
 * Backfill Question Stats
 *
 * One-time script to initialize the `_aggregates/questionStats` document
 * from existing question data. Run this after deploying the trigger.
 *
 * Usage:
 *   node scripts/backfill-question-stats.js
 *
 * Note: Requires GOOGLE_APPLICATION_CREDENTIALS or running from Firebase CLI context.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try to find service account key
let serviceAccount;
const keyPath = resolve(__dirname, "../functions/.env");

// Use default credentials if available (Firebase CLI context)
if (getApps().length === 0) {
  try {
    // Try service account file first
    const serviceAccountPath = resolve(__dirname, "../serviceAccountKey.json");
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
    initializeApp({ credential: cert(serviceAccount) });
    console.log("🔐 Initialized with service account key");
  } catch {
    // Fall back to application default credentials
    initializeApp();
    console.log("🔐 Initialized with application default credentials");
  }
}

const db = getFirestore();
const STATS_DOC_PATH = "_aggregates/questionStats";

/**
 * Sanitizes a field name for use in Firestore.
 */
function sanitizeFieldName(name) {
  if (!name) return "unknown";
  return String(name).replace(/[./]/g, "_").replace(/\s+/g, "_").toLowerCase();
}

async function backfillStats() {
  console.log("🔄 Starting question stats backfill...");

  const snapshot = await db.collection("questions").get();
  console.log(`📊 Found ${snapshot.size} questions to process`);

  const stats = {
    byStatus: {},
    byDiscipline: {},
    byType: {},
    byDifficulty: {},
    totalQuestions: 0,
    lastUpdated: FieldValue.serverTimestamp(),
  };

  snapshot.forEach((doc) => {
    const data = doc.data();
    stats.totalQuestions++;

    // Count by status
    if (data.status) {
      const key = sanitizeFieldName(data.status);
      stats.byStatus[key] = (stats.byStatus[key] || 0) + 1;
    }

    // Count by discipline
    if (data.discipline) {
      const key = sanitizeFieldName(data.discipline);
      stats.byDiscipline[key] = (stats.byDiscipline[key] || 0) + 1;
    }

    // Count by type
    if (data.type) {
      const key = sanitizeFieldName(data.type);
      stats.byType[key] = (stats.byType[key] || 0) + 1;
    }

    // Count by difficulty
    if (data.difficulty) {
      const key = sanitizeFieldName(data.difficulty);
      stats.byDifficulty[key] = (stats.byDifficulty[key] || 0) + 1;
    }
  });

  console.log("\n📈 Computed Stats:");
  console.log("  Total Questions:", stats.totalQuestions);
  console.log("  By Status:", stats.byStatus);
  console.log("  By Discipline:", stats.byDiscipline);
  console.log("  By Type:", stats.byType);
  console.log("  By Difficulty:", stats.byDifficulty);

  await db.doc(STATS_DOC_PATH).set(stats);
  console.log(`\n✅ Backfill complete! Stats saved to ${STATS_DOC_PATH}`);
}

// Run the backfill
backfillStats()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Backfill failed:", err);
    process.exit(1);
  });
