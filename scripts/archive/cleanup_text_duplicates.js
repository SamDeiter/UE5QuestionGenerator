/**
 * Cleanup Script: Delete Text-Based Duplicate Questions
 * 
 * This script finds questions with identical text (first 100 chars) but different uniqueIds
 * and deletes the duplicates, keeping only the first occurrence.
 * 
 * Based on debug logging that showed:
 * - 26 duplicate question texts
 * - 55 extra entries that should be removed
 * 
 * Run with: node scripts/cleanup_text_duplicates.js
 * Execute with: node scripts/cleanup_text_duplicates.js --execute
 */

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
try {
  admin.initializeApp({
    projectId: "ue5-questions-prod",
  });
} catch (e) {
  if (!admin.apps.length) {
    console.error("Firebase init failed:", e);
    process.exit(1);
  }
}

const db = admin.firestore();

async function findAndDeleteTextDuplicates(dryRun = true) {
  console.log('\n========================================');
  console.log(dryRun ? '🔍 DRY RUN MODE (no deletions)' : '🗑️  DELETE MODE');
  console.log('========================================\n');

  // Create backup directory
  const backupDir = path.resolve(__dirname, "..", "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('📥 Fetching all questions from Firestore...');
  const snapshot = await db.collection('questions').get();
  console.log(`   Found: ${snapshot.size} total documents`);

  // Build a map of question text -> documents
  const textMap = new Map(); // normalized text -> [{id, doc, uniqueId, createdAt}]
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const text = (data.question || "").trim().toLowerCase().slice(0, 100);
    
    if (!text) return;
    
    if (!textMap.has(text)) {
      textMap.set(text, []);
    }
    
    textMap.get(text).push({
      id: doc.id,
      uniqueId: data.uniqueId,
      question: (data.question || "").substring(0, 80),
      discipline: data.discipline,
      language: data.language || "English",
      createdAt: data.created || data.firestoreUpdatedAt || "Unknown",
      docRef: doc.ref
    });
  });

  // Find duplicates (texts that appear more than once with DIFFERENT uniqueIds)
  const duplicateGroups = [];
  textMap.forEach((docs, text) => {
    // Group by uniqueId to find true duplicates (same text, different uniqueId)
    const uniqueIdGroups = new Map();
    docs.forEach(d => {
      if (!uniqueIdGroups.has(d.uniqueId)) {
        uniqueIdGroups.set(d.uniqueId, []);
      }
      uniqueIdGroups.get(d.uniqueId).push(d);
    });
    
    // Only consider it a duplicate if there are multiple uniqueIds
    if (uniqueIdGroups.size > 1) {
      duplicateGroups.push({
        text: text.slice(0, 50) + "...",
        uniqueIdCount: uniqueIdGroups.size,
        groups: Array.from(uniqueIdGroups.entries()).map(([uid, docs]) => ({
          uniqueId: uid,
          count: docs.length,
          docs: docs
        }))
      });
    }
  });

  console.log(`\n📊 Analysis Results:`);
  console.log(`   Total duplicate texts: ${duplicateGroups.length}`);
  
  if (duplicateGroups.length === 0) {
    console.log('\n✅ No text duplicates found!');
    return 0;
  }

  // For each duplicate group, keep the one with the oldest createdAt (or first uniqueId alphabetically)
  // and mark the rest for deletion
  const toDelete = [];
  const toKeep = [];
  const backupData = [];

  duplicateGroups.forEach(group => {
    // Sort groups by createdAt (oldest first), fallback to uniqueId
    const sortedGroups = group.groups.sort((a, b) => {
      const aDate = a.docs[0]?.createdAt || "9999";
      const bDate = b.docs[0]?.createdAt || "9999";
      if (aDate !== bDate) return String(aDate).localeCompare(String(bDate));
      return String(a.uniqueId).localeCompare(String(b.uniqueId));
    });

    // Keep the first group, delete the rest
    toKeep.push({
      text: group.text,
      uniqueId: sortedGroups[0].uniqueId,
      count: sortedGroups[0].count
    });

    // Mark remaining groups for deletion
    sortedGroups.slice(1).forEach(g => {
      g.docs.forEach(doc => {
        toDelete.push(doc);
        backupData.push({
          id: doc.id,
          uniqueId: doc.uniqueId,
          question: doc.question,
          discipline: doc.discipline,
          language: doc.language
        });
      });
    });
  });

  console.log(`   Documents to keep: ${toKeep.length} unique question texts`);
  console.log(`   Documents to delete: ${toDelete.length} duplicates`);
  
  console.log('\n📋 Sample duplicates to delete:');
  toDelete.slice(0, 5).forEach((doc, i) => {
    console.log(`   ${i + 1}. "${doc.question.substring(0, 50)}..." (${doc.discipline})`);
  });

  // Save backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `text_duplicates_backup_${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`\n💾 Backup saved to: ${backupFile}`);

  if (dryRun) {
    console.log('\n========================================');
    console.log(`Would delete: ${toDelete.length} documents`);
    console.log('========================================\n');
    return toDelete.length;
  }

  // Actually delete
  console.log('\n🗑️  Deleting duplicates...');
  const batchSize = 500;
  
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = db.batch();
    const batchDocs = toDelete.slice(i, i + batchSize);
    
    batchDocs.forEach(doc => {
      batch.delete(doc.docRef);
    });

    await batch.commit();
    console.log(`   ✓ Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toDelete.length / batchSize)}`);
  }

  console.log('\n========================================');
  console.log(`Deleted: ${toDelete.length} duplicate documents`);
  console.log('========================================\n');

  // Save deletion log
  const logPath = path.join(backupDir, `text_duplicates_deletion_log_${timestamp}.json`);
  fs.writeFileSync(logPath, JSON.stringify(toDelete.map(d => ({
    id: d.id,
    uniqueId: d.uniqueId,
    question: d.question
  })), null, 2));
  console.log(`📝 Deletion log saved to: ${logPath}`);

  return toDelete.length;
}

// Main execution
const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');

if (!isDryRun) {
  console.log('\n⚠️  WARNING: This will PERMANENTLY DELETE duplicate questions from Firestore!');
  console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
  
  setTimeout(async () => {
    await findAndDeleteTextDuplicates(false);
    process.exit(0);
  }, 5000);
} else {
  console.log('\n💡 This is a DRY RUN. No data will be deleted.');
  console.log('   To actually delete, run with: node scripts/cleanup_text_duplicates.js --execute\n');
  
  findAndDeleteTextDuplicates(true).then(() => process.exit(0));
}
