/**
 * Backfill humanVerified for Accepted Questions
 *
 * This script marks all accepted questions as humanVerified: true
 * since they were implicitly verified when accepted (before the
 * explicit verification step was added).
 *
 * Usage:
 *   node scripts/backfill_human_verified.js --dry-run   # Preview changes
 *   node scripts/backfill_human_verified.js             # Apply changes
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
const serviceAccountPath = join(
  __dirname,
  "..",
  "config",
  "serviceAccountKey.json"
);

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
} catch (e) {
  console.error("❌ Missing serviceAccountKey.json at:", serviceAccountPath);
  console.error(
    "   Download from Firebase Console > Project Settings > Service Accounts"
  );
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function backfillHumanVerified(dryRun = false) {
  console.log(`\n🔍 Finding accepted questions without humanVerified...`);
  console.log(
    `Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE (applying changes)"}\n`
  );

  const snapshot = await db
    .collection("questions")
    .where("status", "==", "accepted")
    .get();

  console.log(`📊 Found ${snapshot.size} accepted questions total`);

  const needsUpdate = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.humanVerified) {
      needsUpdate.push({
        id: doc.id,
        question: (data.question || "").substring(0, 60) + "...",
        acceptedBy: data.acceptedBy || data.creatorEmail || "Unknown",
        acceptedAt:
          data.acceptedAt ||
          data.firestoreUpdatedAt?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
      });
    }
  });

  console.log(
    `⚠️  ${needsUpdate.length} accepted questions need humanVerified: true`
  );

  if (needsUpdate.length === 0) {
    console.log("\n✅ All accepted questions already have humanVerified: true");
    process.exit(0);
  }

  console.log("\nQuestions to update:");
  needsUpdate.slice(0, 10).forEach((q) => {
    console.log(`  - [${String(q.id).substring(0, 12)}...] ${q.question}`);
    console.log(`    Verifier: ${q.acceptedBy}`);
  });
  if (needsUpdate.length > 10) {
    console.log(`  ... and ${needsUpdate.length - 10} more`);
  }

  if (dryRun) {
    console.log(
      "\n📝 DRY RUN complete. Run without --dry-run to apply changes."
    );
    process.exit(0);
  }

  // Apply updates in batches of 500
  const batchSize = 500;
  let updated = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const item of needsUpdate) {
    const ref = db.collection("questions").doc(String(item.id));
    batch.update(ref, {
      humanVerified: true,
      humanVerifiedBy: item.acceptedBy,
      humanVerifiedAt: item.acceptedAt,
      _backfilledHumanVerified: true,
      _backfilledAt: new Date().toISOString(),
    });

    batchCount++;
    updated++;

    if (batchCount >= batchSize) {
      await batch.commit();
      console.log(`  Committed batch of ${batchCount} updates...`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  Committed final batch of ${batchCount} updates`);
  }

  console.log(
    `\n✅ Successfully updated ${updated} questions with humanVerified: true`
  );
}

// Parse args
const dryRun = process.argv.includes("--dry-run");

backfillHumanVerified(dryRun)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
