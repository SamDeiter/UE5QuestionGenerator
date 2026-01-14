/**
 * BROWSER CONSOLE SCRIPT: Delete All Soft-Deleted Questions
 *
 * Run this directly in the browser console (F12) while the app is open.
 * You must be signed in as an admin.
 *
 * Instructions:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Run: await deleteSoftDeletedQuestions()
 */

async function deleteSoftDeletedQuestions() {
  console.log("🗑️  Starting bulk deletion of soft-deleted questions...\n");

  // Import Firebase from the app
  const { db } = await import("/src/services/firebase.js");
  const { collection, query, where, getDocs, deleteDoc } = await import(
    "firebase/firestore"
  );

  try {
    // Query for ALL deleted questions (all disciplines)
    const questionsRef = collection(db, "questions");
    const q = query(questionsRef, where("status", "==", "deleted"));

    console.log("📊 Fetching deleted questions...");
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log("✅ No deleted questions found!");
      return { deleted: 0 };
    }

    console.log(`\n📋 Found ${snapshot.size} questions to delete\n`);

    // Group by discipline for reporting
    const byDiscipline = {};
    snapshot.docs.forEach((doc) => {
      const discipline = doc.data().discipline || "Unknown";
      byDiscipline[discipline] = (byDiscipline[discipline] || 0) + 1;
    });

    console.log("📊 Breakdown by discipline:");
    console.table(byDiscipline);

    // Show preview
    console.log("\n📝 Preview (first 10):");
    snapshot.docs.slice(0, 10).forEach((doc, i) => {
      const data = doc.data();
      console.log(
        `${i + 1}. ${data.discipline} | ${data.question?.substring(0, 60)}...`
      );
    });
    if (snapshot.size > 10) {
      console.log(`... and ${snapshot.size - 10} more\n`);
    }

    // Confirm
    console.log(
      `\n⚠️  About to DELETE ${snapshot.size} questions permanently!`
    );
    console.log("This action CANNOT be undone!\n");

    const confirmed = confirm(
      `Delete ${snapshot.size} soft-deleted questions from Firestore?`
    );
    if (!confirmed) {
      console.log("❌ Deletion cancelled");
      return { deleted: 0, cancelled: true };
    }

    // Delete in batches
    console.log("\n🔄 Deleting...");
    let deleted = 0;

    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
      deleted++;

      // Progress update every 50
      if (deleted % 50 === 0) {
        console.log(`  Progress: ${deleted}/${snapshot.size}`);
      }
    }

    console.log(`\n✅ Successfully deleted ${deleted} questions!`);
    console.log("💡 Refresh the page to see updated counts\n");

    return {
      deleted,
      byDiscipline,
    };
  } catch (error) {
    console.error("❌ Error:", error);
    return { error: error.message };
  }
}

// Make it available globally
window.deleteSoftDeletedQuestions = deleteSoftDeletedQuestions;

console.log("✅ Script loaded! Run: await deleteSoftDeletedQuestions()");
