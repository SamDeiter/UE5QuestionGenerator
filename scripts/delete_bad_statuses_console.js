/**
 * BROWSER CONSOLE SCRIPT: Delete All "Other" Status Questions
 *
 * Run this directly in the browser console (F12) while the app is open.
 * You must be signed in as an admin.
 *
 * Instructions:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Run: await deleteBadStatuses()
 */

async function deleteBadStatuses() {
  console.log("🗑️  Starting bulk deletion of 'Other' questions...\n");

  // Import Firebase from the app
  const { db } = await import("/src/services/firebase.js");
  const { collection, getDocs, deleteDoc } = await import("firebase/firestore");

  try {
    // 1. Fetch ALL questions (we have to filter in memory because 'status != X AND status != Y' query is hard)
    // NOTE: This might take a few seconds if you have thousands of questions
    const questionsRef = collection(db, "questions");

    console.log("📊 Fetching all questions...");
    const snapshot = await getDocs(questionsRef);

    if (snapshot.empty) {
      console.log("✅ No questions found!");
      return { deleted: 0 };
    }

    console.log(`\n📋 Scanned ${snapshot.size} total questions.`);

    // 2. Filter for "Other" statuses
    // Logic: status is NOT pending, accepted, rejected AND is not empty
    const badQuestions = snapshot.docs.filter((doc) => {
      const data = doc.data();
      const status = data.status;

      // Ensure we keep standard statuses
      if (
        !status ||
        status === "pending" ||
        status === "accepted" ||
        status === "rejected"
      ) {
        return false;
      }
      return true; // Match anything else (deleted, Success, Error, unknown strings)
    });

    if (badQuestions.length === 0) {
      console.log("✅ No 'Other' questions found! Your database is clean.");
      return { deleted: 0 };
    }

    // 3. Report Findings
    console.log(
      `\n⚠️ Found ${badQuestions.length} questions with non-standard statuses.\n`
    );

    // Breakdown by status
    const byStatus = {};
    const byDiscipline = {};

    badQuestions.forEach((doc) => {
      const data = doc.data();
      const s = data.status || "(unknown)";
      const d = data.discipline || "Unknown";

      byStatus[s] = (byStatus[s] || 0) + 1;
      byDiscipline[d] = (byDiscipline[d] || 0) + 1;
    });

    console.log("📊 Breakdown by Status:");
    console.table(byStatus);

    console.log("📊 Breakdown by Discipline:");
    console.table(byDiscipline);

    // Show preview
    console.log("\n📝 Preview (first 10):");
    badQuestions.slice(0, 10).forEach((doc, i) => {
      const data = doc.data();
      const qText = data.question
        ? data.question.substring(0, 60)
        : "(no text)";
      console.log(
        `${i + 1}. [${data.status}] ${data.discipline} | ${qText}...`
      );
    });

    // 4. Confirm Deletion
    console.log(
      `\n⚠️  About to DELETE ${badQuestions.length} questions permanently!`
    );
    console.log("This action CANNOT be undone!\n");

    const confirmed = confirm(
      `Determine to DELETE ${
        badQuestions.length
      } questions with statuses: ${Object.keys(byStatus).join(", ")}?`
    );

    if (!confirmed) {
      console.log("❌ Deletion cancelled");
      return { deleted: 0, cancelled: true };
    }

    // 5. Delete in batches
    console.log("\n🔄 Deleting...");
    let deleted = 0;

    for (const doc of badQuestions) {
      await deleteDoc(doc.ref);
      deleted++;

      // Progress update every 20
      if (deleted % 20 === 0) {
        console.log(`  Deleted ${deleted}/${badQuestions.length}...`);
      }
    }

    console.log(`\n✅ Successfully deleted ${deleted} questions!`);
    console.log("💡 Refresh the page to see updated counts\n");

    return {
      deleted,
      byStatus,
    };
  } catch (error) {
    console.error("❌ Error:", error);
    return { error: error.message };
  }
}

// Make it available globally
window.deleteBadStatuses = deleteBadStatuses;

console.log("✅ Script loaded! Run: await deleteBadStatuses()");
