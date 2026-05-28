/**
 * Cleanup Stale English-Content Fields from Translation Variants
 *
 * Translation variants created before PR #41 inherited critiqueScore /
 * critique / suggestedRewrite / improvedScore / critiqueAttempts /
 * improvementsApplied from the English source at translation time. These
 * are English-source-content concepts and don't apply to translations.
 * Display already ignores them (Re-Critique button gates on language ===
 * "English" since PR #41), but the data lingers and clutters Firestore
 * queries.
 *
 * This script unsets those fields on every doc where language is set and
 * not "English".
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
 *   node scripts/cleanup_translation_critique_fields.js --dry-run   # Preview
 *   node scripts/cleanup_translation_critique_fields.js             # Apply
 *
 * See scripts/README.md for the canonical SA-key convention used across
 * all JS maintenance scripts.
 */

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp({ credential: applicationDefault() });

const db = getFirestore();

const STALE_FIELDS = [
  "critiqueScore",
  "critique",
  "suggestedRewrite",
  "improvedScore",
  "critiqueAttempts",
  "improvementsApplied",
];

async function cleanupStaleFields(dryRun = false) {
  console.log(
    `\n🔍 Scanning 'questions' collection for non-English variants with inherited English-content fields...`
  );
  console.log(
    `Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE (applying changes)"}\n`
  );

  const snapshot = await db.collection("questions").get();
  console.log(`📊 Scanned ${snapshot.size} total docs`);

  const needsUpdate = [];
  const perLanguageCount = {};

  snapshot.forEach((doc) => {
    const data = doc.data();
    const lang = data.language;
    if (!lang || lang === "English") return;

    const fieldsPresent = STALE_FIELDS.filter(
      (f) => data[f] !== undefined && data[f] !== null
    );
    if (fieldsPresent.length === 0) return;

    needsUpdate.push({
      id: doc.id,
      language: lang,
      fieldsPresent,
    });
    perLanguageCount[lang] = (perLanguageCount[lang] || 0) + 1;
  });

  console.log(
    `⚠️  ${needsUpdate.length} non-English docs have one or more stale fields`
  );

  if (Object.keys(perLanguageCount).length > 0) {
    console.log("\nPer-language counts:");
    Object.entries(perLanguageCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([lang, count]) => {
        console.log(`  ${lang}: ${count}`);
      });
  }

  if (needsUpdate.length === 0) {
    console.log("\n✅ Nothing to clean up.");
    process.exit(0);
  }

  console.log("\nSample of affected docs (first 5):");
  needsUpdate.slice(0, 5).forEach((d) => {
    console.log(
      `  - [${String(d.id).substring(0, 12)}...] (${d.language}) fields: ${d.fieldsPresent.join(", ")}`
    );
  });
  if (needsUpdate.length > 5) {
    console.log(`  ... and ${needsUpdate.length - 5} more`);
  }

  if (dryRun) {
    console.log(
      "\n📝 DRY RUN complete. Run without --dry-run to apply changes."
    );
    process.exit(0);
  }

  const batchSize = 500;
  let updated = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const item of needsUpdate) {
    const ref = db.collection("questions").doc(String(item.id));
    const updates = {
      _cleanedStaleCritiqueFieldsAt: new Date().toISOString(),
    };
    for (const f of item.fieldsPresent) {
      updates[f] = FieldValue.delete();
    }
    batch.update(ref, updates);

    batchCount++;
    updated++;

    if (batchCount >= batchSize) {
      await batch.commit();
      console.log(`  Committed batch of ${batchCount} updates...`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  Committed final batch of ${batchCount} updates`);
  }

  console.log(
    `\n✅ Successfully cleaned ${updated} non-English docs (fields removed; doc-level _cleanedStaleCritiqueFieldsAt timestamp added)`
  );
}

const dryRun = process.argv.includes("--dry-run");

cleanupStaleFields(dryRun)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
