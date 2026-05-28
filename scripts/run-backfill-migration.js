/**
 * Standalone script to run custom claims backfill migration
 * Usage: node scripts/run-backfill-migration.js [--dry-run]
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin using application-default credentials. Set
// GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json before
// running. The previous `require("../functions/.env")` line was a broken
// holdover — .env is a dotenv file, not a requireable module, and the
// variable wasn't used anyway.
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

/**
 * Process a single user for claims backfill
 */
async function processUserClaims(userId, userData, dryRun) {
  const email = userData.email;
  const newClaims = {
    role: userData.role || "reviewer",
    tools: userData.tools || ["questions"],
  };

  // Get current claims to check if already set
  const userRecord = await admin.auth().getUser(userId);
  const existingClaims = userRecord.customClaims || {};

  // Check if claims already match
  const claimsMatch =
    existingClaims.role === newClaims.role &&
    JSON.stringify(existingClaims.tools) === JSON.stringify(newClaims.tools);

  if (claimsMatch) {
    return { skipped: true, email };
  }

  if (!dryRun) {
    await admin.auth().setCustomUserClaims(userId, newClaims);
  }

  console.log(
    `${dryRun ? "[DRY RUN] " : "✅ "}Backfilled claims for ${email}: ${JSON.stringify(newClaims)}`
  );

  return {
    updated: true,
    uid: userId,
    email,
    previousClaims: existingClaims,
    newClaims,
  };
}

/**
 * Main execution
 */
async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log(
    `\n🔧 Custom Claims Backfill Migration ${dryRun ? "(DRY RUN)" : ""}\n`
  );

  try {
    const usersSnapshot = await db.collection("registeredUsers").get();
    const results = [];
    let updated = 0,
      skipped = 0,
      errors = 0;

    console.log(`Found ${usersSnapshot.size} registered users\n`);

    for (const doc of usersSnapshot.docs) {
      try {
        const result = await processUserClaims(doc.id, doc.data(), dryRun);
        if (result.skipped) {
          console.log(`⏭️  Skipped ${result.email} (claims already set)`);
          skipped++;
        } else {
          results.push(result);
          updated++;
        }
      } catch (err) {
        console.error(`❌ Error processing ${doc.data().email}:`, err.message);
        errors++;
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`📊 Migration Summary ${dryRun ? "(DRY RUN)" : ""}`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Total users:    ${usersSnapshot.size}`);
    console.log(`✅ Updated:     ${updated}`);
    console.log(`⏭️  Skipped:     ${skipped}`);
    console.log(`❌ Errors:      ${errors}`);
    console.log(`${"=".repeat(60)}\n`);

    if (dryRun) {
      console.log(
        "🔍 This was a dry run. Run without --dry-run to apply changes.\n"
      );
    } else {
      console.log(
        "✅ Migration complete! Users will have claims on next sign-in.\n"
      );
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
