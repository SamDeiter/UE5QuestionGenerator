"use strict";
/**
 * Deletes all docs for the one uniqueId group that has no English base.
 * Also removes the corresponding questionIndex mirrors.
 *
 * Auth: ADC — gcloud auth application-default login
 * Usage:
 *   node deleteOrphanGroup.cjs --dry-run   # prints what would be deleted
 *   node deleteOrphanGroup.cjs             # live delete
 */
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

const DRY_RUN = process.argv.includes("--dry-run");

const BASE_ID = "00033e77-0436-4953-988a-6484c63d02c3";
const DOC_IDS = [
  BASE_ID,
  `${BASE_ID}_Chinese_(Simplified)`,
  `${BASE_ID}_French`,
  `${BASE_ID}_German`,
  `${BASE_ID}_Italian`,
  `${BASE_ID}_Japanese`,
  `${BASE_ID}_Korean`,
  `${BASE_ID}_Portuguese`,
  `${BASE_ID}_Russian`,
  `${BASE_ID}_Spanish`,
];

const app = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "development-317819",
});
const db = getFirestore(app, "ue5qg-prod");

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE DELETE"}`);
  console.log(`Docs to delete (${DOC_IDS.length}):`);
  for (const id of DOC_IDS) console.log(`  questions/${id}`);
  for (const id of DOC_IDS) console.log(`  questionIndex/${id}`);

  if (DRY_RUN) {
    console.log("\nDry run — no writes.");
    return;
  }

  const batch = db.batch();
  for (const id of DOC_IDS) {
    batch.delete(db.collection("questions").doc(id));
    batch.delete(db.collection("questionIndex").doc(id));
  }
  await batch.commit();
  console.log("\nDeleted.");
}

main().catch((e) => { console.error(e); process.exit(1); });
