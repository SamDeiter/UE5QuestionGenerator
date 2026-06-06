"use strict";
/**
 * Audit: find uniqueId groups that have translation variants but no English base doc.
 *
 * Reads from: development-317819 / ue5qg-prod (live database)
 * Auth: ADC — run `gcloud auth application-default login` first if needed.
 *
 * Usage:
 *   cd scripts
 *   node auditMissingEnglish.cjs
 */
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

const app = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "development-317819",
});
const db = getFirestore(app, "ue5qg-prod");

// Strip _Language suffix to recover base uniqueId (matches parseQuestionDoc logic).
function baseId(docId, language) {
  if (!language || language === "English") return docId;
  const suffix = `_${language}`;
  if (docId.endsWith(suffix)) return docId.slice(0, -suffix.length);
  return docId;
}

async function main() {
  console.log("Reading questions collection...");
  const snap = await db.collection("questions").get();
  console.log(`Total docs: ${snap.docs.length}`);

  // Group docs by base uniqueId.
  // Key: base uniqueId. Value: { hasEnglish: bool, languages: string[], ids: string[] }
  const groups = new Map();

  for (const doc of snap.docs) {
    const data = doc.data();
    const lang = data.language || "English";
    const docId = doc.id;

    // Determine the base uniqueId three ways (mirrors parseQuestionDoc):
    // 1. data.uniqueId field (correct new-style docs)
    // 2. doc ID stripped of suffix (old-style where uniqueId field = doc ID)
    let uid = data.uniqueId || docId;
    if (lang !== "English") {
      const suffix = `_${lang}`;
      if (uid.endsWith(suffix)) uid = uid.slice(0, -suffix.length);
    }

    if (!groups.has(uid)) {
      groups.set(uid, { hasEnglish: false, languages: [], ids: [] });
    }
    const g = groups.get(uid);
    g.languages.push(lang);
    g.ids.push(docId);
    if (lang === "English") g.hasEnglish = true;
  }

  const missing = [];
  for (const [uid, g] of groups) {
    if (!g.hasEnglish) missing.push({ uid, languages: g.languages, ids: g.ids });
  }

  console.log(`\nTotal uniqueId groups: ${groups.size}`);
  console.log(`Groups missing an English doc: ${missing.length}`);

  if (missing.length === 0) {
    console.log("All good — every group has an English base.");
    return;
  }

  // Print sample (first 20)
  const sample = missing.slice(0, 20);
  console.log("\nSample (first 20):");
  for (const { uid, languages, ids } of sample) {
    console.log(`  uid=${uid}  langs=[${languages.join(", ")}]  docs=[${ids.join(", ")}]`);
  }

  if (missing.length > 20) {
    console.log(`  ... and ${missing.length - 20} more.`);
  }

  // Summary of which languages appear without English
  const langCounts = new Map();
  for (const { languages } of missing) {
    for (const l of languages) {
      langCounts.set(l, (langCounts.get(l) || 0) + 1);
    }
  }
  console.log("\nLanguages present in missing-English groups:");
  for (const [l, n] of [...langCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${l}: ${n}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
