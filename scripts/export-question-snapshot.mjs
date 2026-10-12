/**
 * Export the question database to public/question-snapshot.json.
 *
 * The app serves this file so a cold browser can start from it and only read
 * recently changed docs from Firestore (see src/services/questionSnapshot.js).
 *
 * Usage (reads the whole `questions` collection once, ~20k reads):
 *   gcloud auth application-default login      # sign in as your Epic account
 *   node scripts/export-question-snapshot.mjs
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

// The app's data lives in the named database "ue5qg-prod" on the Epic project
// development-317819. Override with env vars only for another environment.
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "development-317819";
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || "ue5qg-prod";
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
