/**
 * Bulk Delete "deleted" Questions from Firestore
 *
 * This script permanently removes all questions with status: "deleted"
 * Run this in the browser console (F12) when signed in as admin
 */

import { db } from "./src/services/firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

export async function bulkDeleteSoftDeleted(discipline = null, dryRun = true) {
  console.log("🗑️ Bulk Delete Script Starting...");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE DELETE"}`);

  try {
    // Query for all "deleted" questions
    const questionsRef = collection(db, "questions");
    let q = query(questionsRef, where("status", "==", "deleted"));

    // Optionally filter by discipline
    if (discipline) {
      q = query(
        questionsRef,
        where("status", "==", "deleted"),
        where("discipline", "==", discipline)
      );
      console.log(`📍 Filtering by discipline: ${discipline}`);
    }

    const snapshot = await getDocs(q);
    console.log(`📊 Found ${snapshot.size} questions with status "deleted"`);

    if (snapshot.size === 0) {
      console.log("✅ No deleted questions found. Database is clean!");
      return { success: true, deleted: 0 };
    }

    // Show preview
    console.log("\n📋 Preview of questions to delete:");
    snapshot.docs.slice(0, 10).forEach((doc) => {
      const q = doc.data();
      console.log(
        `- ${doc.id} | ${q.discipline} | ${q.question?.substring(0, 60)}...`
      );
    });

    if (snapshot.size > 10) {
      console.log(`... and ${snapshot.size - 10} more`);
    }

    if (dryRun) {
      console.log("\n⚠️ DRY RUN MODE - No questions were deleted");
      console.log(
        "To actually delete, run: bulkDeleteSoftDeleted(null, false)"
      );
      return { success: true, deleted: 0, dryRun: true };
    }

    // Confirm before deletion
    console.log(
      "\n⚠️ LIVE DELETE MODE - About to permanently delete questions"
    );
    console.log("Deleting in 3 seconds... Press Ctrl+C to cancel");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Delete all
    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    console.log(
      `✅ Successfully deleted ${snapshot.size} questions from Firestore`
    );
    console.log("💡 Refresh the page to see the updated counts");

    return {
      success: true,
      deleted: snapshot.size,
      discipline: discipline,
    };
  } catch (error) {
    console.error("❌ Bulk delete failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Auto-export for console use
if (typeof window !== "undefined") {
  window.bulkDeleteSoftDeleted = bulkDeleteSoftDeleted;
  console.log("✅ Loaded: window.bulkDeleteSoftDeleted(discipline, dryRun)");
  console.log('Example: bulkDeleteSoftDeleted("VFX", true) // Dry run for VFX');
  console.log(
    "Example: bulkDeleteSoftDeleted(null, false) // Delete ALL deleted questions"
  );
}
