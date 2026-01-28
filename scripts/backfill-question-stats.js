/**
 * Backfill Question Stats
 *
 * One-time script to initialize the `_aggregates/questionStats` document
 * from existing question data. Run this after deploying the trigger.
 *
 * Usage:
 *   node scripts/backfill-question-stats.js
 *
 * Note: Requires GOOGLE_APPLICATION_CREDENTIALS or running from Firebase Functions shell.
 */

const admin = require("firebase-admin");

// Initialize if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const STATS_DOC_PATH = "_aggregates/questionStats";

/**
 * Sanitizes a field name for use in Firestore document paths.
 * @param {string} name - The field name to sanitize
 * @returns {string} - Sanitized field name
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
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
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
