/**
 * Firebase Tech Art Diagnostic Script
 *
 * Run this in the browser console on localhost to diagnose
 * why Tech Art shows different counts (241 vs 155)
 *
 * USAGE:
 * 1. Open localhost in browser
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Report the results
 */

(async function diagnoseTechArt() {
  console.log("🔍 Starting Tech Art Diagnostic...");

  try {
    // Import Firebase functions
    const { collection, getDocs, query, where } = await import(
      "firebase/firestore"
    );
    const { db } = await import("./src/services/firebase.js");

    console.log("✅ Firebase imports loaded");

    // Query 1: All Tech Art questions (no filters)
    console.log("\n📊 Query 1: ALL Tech Art questions");
    const allTechArtQuery = query(
      collection(db, "questions"),
      where("discipline", "==", "Tech Art")
    );
    const allTechArtSnapshot = await getDocs(allTechArtQuery);
    console.log(`Total Tech Art in Firebase: ${allTechArtSnapshot.size}`);

    // Query 2: Accepted Tech Art questions
    console.log("\n📊 Query 2: ACCEPTED Tech Art questions");
    const acceptedTechArtQuery = query(
      collection(db, "questions"),
      where("discipline", "==", "Tech Art"),
      where("status", "==", "accepted")
    );
    const acceptedTechArtSnapshot = await getDocs(acceptedTechArtQuery);
    console.log(
      `Accepted Tech Art in Firebase: ${acceptedTechArtSnapshot.size}`
    );

    // Query 3: Pending Tech Art questions
    console.log("\n📊 Query 3: PENDING Tech Art questions");
    const pendingTechArtQuery = query(
      collection(db, "questions"),
      where("discipline", "==", "Tech Art"),
      where("status", "==", "pending")
    );
    const pendingTechArtSnapshot = await getDocs(pendingTechArtQuery);
    console.log(`Pending Tech Art in Firebase: ${pendingTechArtSnapshot.size}`);

    // Query 4: Check for null/undefined status
    console.log("\n📊 Query 4: Tech Art with NO status");
    const noStatusCount = allTechArtSnapshot.docs.filter((doc) => {
      const status = doc.data().status;
      return !status || status === null || status === undefined;
    }).length;
    console.log(`Tech Art with no status: ${noStatusCount}`);

    // Query 5: Check for duplicate uniqueIds
    console.log("\n📊 Query 5: Checking for duplicates");
    const uniqueIds = new Map();
    allTechArtSnapshot.docs.forEach((doc) => {
      const uniqueId = doc.data().uniqueId || doc.id;
      if (uniqueIds.has(uniqueId)) {
        uniqueIds.set(uniqueId, uniqueIds.get(uniqueId) + 1);
      } else {
        uniqueIds.set(uniqueId, 1);
      }
    });
    const duplicates = Array.from(uniqueIds.entries()).filter(
      ([_, count]) => count > 1
    );
    console.log(`Duplicate uniqueIds: ${duplicates.length}`);
    if (duplicates.length > 0) {
      console.log("Duplicates:", duplicates);
    }

    // Query 6: Sample some Tech Art questions to check data quality
    console.log("\n📊 Query 6: Sample Tech Art questions");
    const sampleDocs = allTechArtSnapshot.docs.slice(0, 5);
    sampleDocs.forEach((doc, idx) => {
      const data = doc.data();
      console.log(`Sample ${idx + 1}:`, {
        id: doc.id,
        uniqueId: data.uniqueId,
        status: data.status,
        discipline: data.discipline,
        question: data.question?.substring(0, 50) + "...",
      });
    });

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📋 SUMMARY");
    console.log("=".repeat(50));
    console.log(`Total Tech Art: ${allTechArtSnapshot.size}`);
    console.log(`  - Accepted: ${acceptedTechArtSnapshot.size}`);
    console.log(`  - Pending: ${pendingTechArtSnapshot.size}`);
    console.log(`  - No status: ${noStatusCount}`);
    console.log(`  - Duplicates: ${duplicates.length}`);
    console.log("\n🎯 Expected localhost count: 241");
    console.log(`🎯 Actual Firebase count: ${allTechArtSnapshot.size}`);
    console.log(`🎯 Discrepancy: ${241 - allTechArtSnapshot.size}`);

    if (allTechArtSnapshot.size === 155) {
      console.log("\n⚠️ Firebase matches GitHub Pages (155)");
      console.log(
        "💡 This means 86 questions are in localhost state but NOT in Firebase"
      );
      console.log(
        "💡 Likely cause: Those 86 questions failed to save to Firebase"
      );
    } else if (allTechArtSnapshot.size === 241) {
      console.log("\n✅ Firebase matches localhost (241)");
      console.log("💡 GitHub Pages may have stale cache");
      console.log("💡 Try hard refresh on GitHub Pages");
    } else {
      console.log("\n❓ Firebase count doesn't match either");
      console.log("💡 Data inconsistency - needs investigation");
    }
  } catch (error) {
    console.error("❌ Diagnostic failed:", error);
    console.error("Error details:", error.message);
  }
})();
