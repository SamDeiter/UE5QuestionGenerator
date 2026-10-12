/**
 * Export the question database to public/question-snapshot.json.
 *
 * The app serves this file so a cold browser can start from it and only read
 * recently changed docs from Firestore (see src/services/questionSnapshot.js).
 *
 * Usage (reads the whole `questions` collection once, ~20k reads):
 *   gcloud auth application-default login      # sign in as your Epic account
 *   FIREBASE_PROJECT_ID=<project> FIRESTORE_DATABASE_ID=<db> \
 *     node scripts/export-question-snapshot.mjs
 *   # then deploy the app so the new file is served
 *
 * Re-run it daily or whenever a lot of questions changed. A stale snapshot is
 * safe: the app asks Firestore for everything changed since it was generated.
 * Docs deleted since the snapshot reappear until the next export.
 */

import admin from "firebase-admin";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// Be explicit about the target: this repo spans two projects (data may live in
// the named database "ue5qg-prod" on development-317819, or in the "(default)"
// database of ue5-questions-prod). Match whatever the deployed app's
// VITE_FIREBASE_PROJECT_ID / VITE_FIRESTORE_DATABASE_ID are set to.
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || "(default)";
if (!PROJECT_ID) {
  console.error(
    "Set FIREBASE_PROJECT_ID (and FIRESTORE_DATABASE_ID if the app uses a named database)."
  );
  process.exit(1);
}
// Overlap so docs written while the export ran are re-fetched as deltas
const OVERLAP_MS = 10 * 60 * 1000;

const outFile = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../public/question-snapshot.json"
);

admin.initializeApp({ projectId: PROJECT_ID });
const db =
  DATABASE_ID === "(default)"
    ? admin.firestore()
    : (await import("firebase-admin/firestore")).getFirestore(DATABASE_ID);

// Timestamps -> { seconds, nanoseconds } (the shape toMillis() understands)
function serialize(value) {
  if (value instanceof admin.firestore.Timestamp) {
    return { seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serialize(v)])
    );
  }
  return value;
}

const startedAt = Date.now();
const snapshot = await db.collection("questions").get();
const docs = snapshot.docs.map((d) => ({ id: d.id, ...serialize(d.data()) }));

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(
  outFile,
  JSON.stringify({
    generatedAtMs: startedAt - OVERLAP_MS,
    count: docs.length,
    docs,
  })
);

console.log(
  `Wrote ${docs.length} questions to ${outFile} ` +
    `(${(JSON.stringify(docs).length / 1e6).toFixed(1)} MB uncompressed)`
);
process.exit(0);
