import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../services/firebase";

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

    // Normalize
    if (difficulty === "Easy") difficulty = "Beginner";
    if (difficulty === "Medium") difficulty = "Intermediate";
    if (difficulty === "Hard") difficulty = "Expert";
    if (qtype === "T/F" || qtype === "True/False") qtype = "T/F";
    else qtype = "MC";

    const key = `${discipline}|${difficulty}|${qtype}`;
    if (!quotaMap.has(key)) quotaMap.set(key, []);

    quotaMap.get(key).push({
      id: docSnap.id,
      dateAdded: data.dateAdded || "",
      status: data.status || "pending",
    });
  });

  const QUOTA = 33;
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

// Make it available globally in production
if (typeof window !== "undefined") {
  window.cleanupProductionDatabase = cleanupProductionDatabase;
}
