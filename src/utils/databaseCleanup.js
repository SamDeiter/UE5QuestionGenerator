import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { TARGET_PER_CATEGORY } from "./constants";

/**
 * Production Database Cleanup Tool
 * Run this from the browser console in production to:
 * 1. Fix missing status fields
 * 2. Remove duplicates
 * 3. Remove excess questions beyond quota
 */
export const cleanupProductionDatabase = async () => {
  console.log("🔍 Starting database cleanup...");

  const questionsRef = collection(db, "questions");
  const snapshot = await getDocs(questionsRef);

  console.log(`📊 Found ${snapshot.size} total questions`);

  // Step 1: Fix missing status
  let statusFixed = 0;
  const updatePromises = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data.status || data.status === "") {
      updatePromises.push(
        updateDoc(doc(db, "questions", docSnap.id), { status: "pending" })
      );
      statusFixed++;
    }
  });

  await Promise.all(updatePromises);
  console.log(`✅ Fixed ${statusFixed} status fields`);

  // Step 2: Remove duplicates
  const uniqueMap = new Map();
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const uniqueId = data.uniqueId || docSnap.id;

    if (!uniqueMap.has(uniqueId)) {
      uniqueMap.set(uniqueId, []);
    }
    uniqueMap.get(uniqueId).push({
      id: docSnap.id,
      dateAdded: data.dateAdded || "",
      data,
    });
  });

  let duplicatesRemoved = 0;
  const deletePromises = [];

  uniqueMap.forEach((variants) => {
    if (variants.length > 1) {
      // Sort by date (oldest first)
      variants.sort((a, b) => a.dateAdded.localeCompare(b.dateAdded));
      // Delete all except first
      variants.slice(1).forEach((variant) => {
        deletePromises.push(deleteDoc(doc(db, "questions", variant.id)));
        duplicatesRemoved++;
      });
    }
  });

  await Promise.all(deletePromises);
  console.log(`✅ Removed ${duplicatesRemoved} duplicates`);

  // Step 3: Remove excess questions
  const quotaMap = new Map();
  const freshSnapshot = await getDocs(questionsRef);

  freshSnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const discipline = data.discipline || "Unknown";
    let difficulty = data.difficulty || "Unknown";
    let qtype = data.type || "Unknown";

    // Normalize difficulty - handle combined formats like "Easy MC", "Medium T/F", etc.
    // Extract base difficulty from combined value
    const baseDiff = difficulty.split(" ")[0]; // "Easy MC" -> "Easy"

    // Map to canonical names - combine equivalent difficulties
    if (baseDiff === "Easy" || baseDiff === "Beginner") difficulty = "Beginner";
    else if (baseDiff === "Medium" || baseDiff === "Intermediate")
      difficulty = "Intermediate";
    else if (baseDiff === "Hard" || baseDiff === "Expert")
      difficulty = "Expert";
    else difficulty = baseDiff; // Keep as-is if not recognized

    // Normalize type - combine equivalent types
    if (qtype === "T/F" || qtype === "True/False") qtype = "T/F";
    else if (qtype === "MC" || qtype === "Multiple Choice") qtype = "MC";
    else qtype = "MC"; // Default to MC

    const key = `${discipline}|${difficulty}|${qtype}`;
    if (!quotaMap.has(key)) quotaMap.set(key, []);

    quotaMap.get(key).push({
      id: docSnap.id,
      dateAdded: data.dateAdded || "",
      status: data.status || "pending",
    });
  });

  // Log normalized categories
  console.log("\n📊 Normalized categories after combining equivalents:");
  quotaMap.forEach((questions, key) => {
    if (questions.length > 30) {
      console.log(`  ${key}: ${questions.length}`);
    }
  });

  const QUOTA = TARGET_PER_CATEGORY;
  let excessRemoved = 0;
  const excessDeletePromises = [];

  quotaMap.forEach((questions, key) => {
    if (questions.length > QUOTA) {
      const [discipline, difficulty, qtype] = key.split("|");
      console.log(
        `⚠️ ${discipline} ${difficulty} ${qtype}: ${questions.length} (quota: ${QUOTA})`
      );

      // Sort: accepted first, then by date
      questions.sort((a, b) => {
        if (a.status === "accepted" && b.status !== "accepted") return -1;
        if (a.status !== "accepted" && b.status === "accepted") return 1;
        return a.dateAdded.localeCompare(b.dateAdded);
      });

      // Delete excess (from end)
      questions.slice(QUOTA).forEach((q) => {
        excessDeletePromises.push(deleteDoc(doc(db, "questions", q.id)));
        excessRemoved++;
      });
    }
  });

  await Promise.all(excessDeletePromises);
  console.log(`✅ Removed ${excessRemoved} excess questions`);

  console.log(`\n🎉 Cleanup complete!`);
  console.log(`   Status fixes: ${statusFixed}`);
  console.log(`   Duplicates: ${duplicatesRemoved}`);
  console.log(`   Excess: ${excessRemoved}`);
  console.log(`   Total: ${statusFixed + duplicatesRemoved + excessRemoved}`);

  return {
    statusFixed,
    duplicatesRemoved,
    excessRemoved,
    total: statusFixed + duplicatesRemoved + excessRemoved,
  };
};

/**
 * Debug: Audit the database to see what categories and counts exist
 */
export const auditDatabaseCategories = async () => {
  console.log("🔍 Auditing database categories...");

  const questionsRef = collection(db, "questions");
  const snapshot = await getDocs(questionsRef);

  console.log(`📊 Found ${snapshot.size} total questions`);

  // Log unique values
  const disciplines = new Set();
  const difficulties = new Set();
  const types = new Set();
  const categoryMap = new Map();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const discipline = data.discipline || "Unknown";
    const difficulty = data.difficulty || "Unknown";
    const qtype = data.type || "Unknown";

    disciplines.add(discipline);
    difficulties.add(difficulty);
    types.add(qtype);

    // Raw key (no normalization) to see actual data
    const rawKey = `${discipline}|${difficulty}|${qtype}`;
    if (!categoryMap.has(rawKey)) categoryMap.set(rawKey, 0);
    categoryMap.set(rawKey, categoryMap.get(rawKey) + 1);
  });

  console.log("\n📋 Unique disciplines:", Array.from(disciplines));
  console.log("📋 Unique difficulties:", Array.from(difficulties));
  console.log("📋 Unique types:", Array.from(types));

  console.log("\n📊 Categories over 30 questions (quota is 40):");
  categoryMap.forEach((count, key) => {
    if (count > 30) {
      console.log(`  ${key}: ${count}`);
    }
  });

  console.log("\n📊 All Animation & Rigging categories:");
  categoryMap.forEach((count, key) => {
    if (key.startsWith("Animation")) {
      console.log(`  ${key}: ${count}`);
    }
  });

  return { disciplines, difficulties, types, categoryMap };
};

/**
 * Migration: Normalize all difficulty values in the database
 * Converts Easy->Beginner, Medium->Intermediate, Hard->Expert
 */
export const migrateDifficultyNames = async () => {
  console.log("🔄 Starting difficulty name migration...");

  const questionsRef = collection(db, "questions");
  const snapshot = await getDocs(questionsRef);

  console.log(`📊 Found ${snapshot.size} total questions`);

  const updates = [];
  let needsMigration = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const difficulty = data.difficulty || "";

    // Check if needs migration
    let newDifficulty = null;
    if (difficulty === "Easy") newDifficulty = "Beginner";
    else if (difficulty === "Medium") newDifficulty = "Intermediate";
    else if (difficulty === "Hard") newDifficulty = "Expert";

    if (newDifficulty) {
      needsMigration++;
      updates.push(
        updateDoc(doc(db, "questions", docSnap.id), {
          difficulty: newDifficulty,
          _migratedDifficulty: difficulty, // Keep original for reference
          _migratedAt: new Date().toISOString(),
        })
      );
    }
  });

  console.log(`📝 Found ${needsMigration} questions needing migration`);

  if (needsMigration > 0) {
    console.log("⏳ Updating documents...");
    await Promise.all(updates);
    console.log(`✅ Migrated ${needsMigration} questions!`);
  } else {
    console.log("✅ All questions already have correct difficulty names!");
  }

  return { migrated: needsMigration };
};

// Make it available globally in production
if (typeof window !== "undefined") {
  window.cleanupProductionDatabase = cleanupProductionDatabase;
  window.auditDatabaseCategories = auditDatabaseCategories;
  window.migrateDifficultyNames = migrateDifficultyNames;
}
