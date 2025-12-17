/**
 * STANDALONE IMPORT SCRIPT
 * Run this in browser console to import scores from ChatGPT/Gemini
 */

// 1. Paste your JSON scores array here (the one you just showed me)
const scores = [
  // PASTE YOUR JSON ARRAY HERE
  // Example:
  // {"index": 0, "id": "...", "originalScore": 88, "improvedScore": 95},
  // ...
];

// 2. This function will import them to Firestore
async function importScoresToFirestore() {
  const { db } = await import("./services/firebase.js");
  const { doc, updateDoc } = await import("firebase/firestore");

  let updated = 0;
  let errors = 0;

  console.log(`📥 Starting import of ${scores.length} scores...`);

  for (const item of scores) {
    try {
      await updateDoc(doc(db, "questions", item.id), {
        critiqueScore: item.originalScore,
        improvedScore: item.improvedScore,
        critique: `AI scored this question ${item.originalScore}/100`,
        lastCritiquedAt: new Date().toISOString(),
        critiqueSource: "chatgpt_gemini_business",
      });
      updated++;
      if (updated % 50 === 0) {
        console.log(`✅ Imported ${updated}/${scores.length}...`);
      }
    } catch (error) {
      console.error(`❌ Failed to update ${item.id}:`, error.message);
      errors++;
    }
  }

  console.log(`🎉 Import complete!`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📊 Total: ${scores.length}`);

  alert(`Import complete! ${updated} questions updated. Refreshing page...`);
  setTimeout(() => window.location.reload(), 2000);
}

// 3. Run the import
console.log("🚀 Ready to import!");
console.log(
  "Paste your JSON array into the 'scores' variable above, then call:"
);
console.log("importScoresToFirestore()");
