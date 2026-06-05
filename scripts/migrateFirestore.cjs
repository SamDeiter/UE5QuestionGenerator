"use strict";
/**
 * One-shot migration: ue5-questions-prod (default db) → development-317819 (ue5qg-prod)
 *
 * Auth:
 *   Source — SA key at ~/Downloads/ue5-questions-prod-firebase-adminsdk-fbsvc-82c081b44f.json
 *   Target — ADC: gcloud auth application-default login --account=sam.deiter@epicgames.com
 *
 * Usage:
 *   cd functions
 *   node ../scripts/migrateFirestore.js --dry-run   # prints counts, no writes
 *   node ../scripts/migrateFirestore.js             # live migration
 */
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");
const os = require("os");

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 400; // Firestore max is 500; keep headroom

// ---------------------------------------------------------------------------
// Source: ue5-questions-prod, (default) database
// ---------------------------------------------------------------------------
const sourceApp = admin.initializeApp(
  {
    credential: admin.credential.cert(
      require(path.join(
        os.homedir(),
        "Downloads/ue5-questions-prod-firebase-adminsdk-fbsvc-82c081b44f.json"
      ))
    ),
    projectId: "ue5-questions-prod",
  },
  "source"
);
const sourceDb = getFirestore(sourceApp);

// ---------------------------------------------------------------------------
// Target: development-317819, named database ue5qg-prod
// Auth via ADC (gcloud auth application-default login)
// ---------------------------------------------------------------------------
const targetApp = admin.initializeApp(
  {
    credential: admin.credential.applicationDefault(),
    projectId: "development-317819",
  },
  "target"
);
const targetDb = getFirestore(targetApp, "ue5qg-prod");

// ---------------------------------------------------------------------------
// Migration helpers
// ---------------------------------------------------------------------------
async function migrateCollection(colName, merge = false) {
  console.log(`\n--- ${colName} (${merge ? "merge" : "overwrite"}) ---`);
  const snap = await sourceDb.collection(colName).get();
  console.log(`  Source: ${snap.docs.length} docs`);
  if (snap.docs.length === 0) {
    console.log("  (empty — skipping)");
    return 0;
  }

  if (DRY_RUN) {
    console.log(`  [DRY RUN] would write ${snap.docs.length} docs`);
    return snap.docs.length;
  }

  let batch = targetDb.batch();
  let batchCount = 0;
  let total = 0;

  for (const doc of snap.docs) {
    const ref = targetDb.collection(colName).doc(doc.id);
    if (merge) {
      batch.set(ref, doc.data(), { merge: true });
    } else {
      batch.set(ref, doc.data());
    }
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      total += batchCount;
      console.log(`  committed ${total}/${snap.docs.length}`);
      batch = targetDb.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    total += batchCount;
  }

  console.log(`  ✅ wrote ${total} docs`);
  return total;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  console.log(DRY_RUN ? "\n=== DRY RUN ===" : "\n=== LIVE MIGRATION ===");
  console.log(`  Source: ue5-questions-prod (default db)`);
  console.log(`  Target: development-317819 / ue5qg-prod\n`);

  const results = {};
  results.questions = await migrateCollection("questions", false);
  results.admins = await migrateCollection("admins", false);
  results.invites = await migrateCollection("invites", false);
  results.registeredUsers = await migrateCollection("registeredUsers", true);

  console.log("\n=== Summary ===");
  for (const [col, count] of Object.entries(results)) {
    console.log(`  ${col}: ${count} docs ${DRY_RUN ? "(dry run)" : "migrated"}`);
  }
  console.log("\n✅ Done.");

  if (!DRY_RUN) {
    console.log("\nNext steps:");
    console.log("  1. Verify counts in Firebase console (development-317819 → ue5qg-prod)");
    console.log("  2. Load https://ue5-question-generator.web.app/database — should show 1000+ questions");
    console.log("  3. Call backfillQuestionIndex from the app (admin callable)");
    console.log("  4. Call backfillQuestionStats from the app (admin callable)");
    console.log("  5. Set USE_INDEX = true in src/services/firebaseQueries.js + redeploy hosting");
  }
})().catch((err) => {
  console.error("\n❌ Migration failed:", err.message || err);
  process.exit(1);
});
