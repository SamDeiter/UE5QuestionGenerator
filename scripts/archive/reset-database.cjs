/**
 * Database Reset Script
 *
 * PERMANENTLY deletes all documents in the 'questions' collection.
 * This is used to reset the database when data is corrupted.
 *
 * Usage: node scripts/reset-database.js
 *
 * Requirements:
 * - firebase-admin must be installed (npm install firebase-admin)
 * - You must be logged in via 'firebase login' or have GOOGLE_APPLICATION_CREDENTIALS set.
 */

const admin = require("firebase-admin");
const readline = require("readline");

// Configuration
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "ue5questionssoure"; // Default to Production
const COLLECTION_NAME = "questions";
const BATCH_SIZE = 400; // Firestore limit is 500

// Initialize Firebase Admin
try {
  admin.initializeApp({
    projectId: PROJECT_ID,
  });
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error.message);
  console.error("Hint: Run 'firebase login' first or check your credentials.");
  process.exit(1);
}

const db = admin.firestore();

const askQuestion = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
};

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  console.log(`Deleted ${batchSize} documents...`);

  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function resetDatabase() {
  console.log(`\n⚠️  DANGER ZONE ⚠️\n`);
  console.log(`Target Project: ${PROJECT_ID}`);
  console.log(`Collection:     ${COLLECTION_NAME}`);
  console.log(
    `\nThis will PERMANENTLY DELETE ALL QUESTIONS. This action cannot be undone.`
  );

  const answer = await askQuestion(
    `\nType "DELETE" to confirm destroying all data in '${COLLECTION_NAME}': `
  );

  if (answer !== "DELETE") {
    console.log("❌ Operation cancelled.");
    process.exit(0);
  }

  console.log(`\nStarting deletion of collection '${COLLECTION_NAME}'...`);

  // Simple batch deletion logic for ALL documents in the collection
  const collectionRef = db.collection(COLLECTION_NAME);
  const query = collectionRef.orderBy("__name__").limit(BATCH_SIZE);

  try {
    await new Promise((resolve, reject) => {
      deleteQueryBatch(query, resolve).catch(reject);
    });
    console.log(
      "\n✅ Database reset complete. All questions have been deleted."
    );
  } catch (error) {
    if (error.code === 7 || error.message.includes("PERMISSION_DENIED")) {
      console.error("\n❌ ERROR: PERMISSION DENIED");
      console.error(
        "The script does not have sufficient permissions to modify the database."
      );
      console.error("\nTo fix this:");
      console.error(
        "1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
      );
      console.error("2. Run: gcloud auth application-default login");
      console.error(
        "   (Login with the account that owns the firebase project)"
      );
      console.error(
        "\nAlternatively, set GOOGLE_APPLICATION_CREDENTIALS to the path of a service account key."
      );
    } else {
      console.error("\n❌ Error resetting database:", error);
    }
    process.exit(1);
  }
}

resetDatabase();
