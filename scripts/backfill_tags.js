/**
 * Backfill Tags Script
 *
 * This script finds all accepted questions with fewer than 3 tags
 * and generates new tags using the Gemini API.
 *
 * Run from the browser console or as a Node.js script with Firebase Admin SDK.
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

// Firebase config - replace with your values or use environment
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

/**
 * Generate tags for a question using Gemini API
 */
async function generateTags(questionText, options) {
  const systemPrompt = `You are an expert UE5 tagger.
    Generate 3-5 relevant technical tags for the provided question.
    - Tags should be specific (e.g., "Blueprints", "Lumen", "Niagara").
    - Return ONLY a valid JSON array of strings.
    - Example: ["Blueprints", "Actors", "Level Design"]`;

  const userPrompt = `Tags for question: "${questionText}"
Options: ${JSON.stringify(options)}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 100,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse tags:", text, e);
    return [];
  }
}

/**
 * Main backfill function
 */
async function backfillTags() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("🔍 Finding accepted questions with fewer than 3 tags...");

  // Query all accepted questions
  const questionsRef = collection(db, "questions");
  const q = query(questionsRef, where("status", "==", "accepted"));
  const snapshot = await getDocs(q);

  const questionsNeedingTags = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const tags = Array.isArray(data.tags) ? data.tags : [];

    if (tags.length < 3) {
      questionsNeedingTags.push({
        id: docSnap.id,
        question: data.question,
        options: data.options,
        currentTags: tags,
      });
    }
  });

  console.log(`📋 Found ${questionsNeedingTags.length} questions needing tags`);

  let updated = 0;
  let failed = 0;

  for (const q of questionsNeedingTags) {
    try {
      console.log(`\n🏷️ Processing: ${q.question.substring(0, 60)}...`);

      const newTags = await generateTags(q.question, q.options);

      if (newTags && newTags.length > 0) {
        // Merge with existing tags, dedupe, limit to 5
        const mergedTags = [
          ...new Set([
            ...q.currentTags,
            ...newTags.map((t) => t.replace(/^#/, "")),
          ]),
        ].slice(0, 5);

        // Update in Firestore
        const docRef = doc(db, "questions", q.id);
        await updateDoc(docRef, {
          tags: mergedTags,
          tagsBackfilledAt: new Date().toISOString(),
        });

        console.log(`   ✅ Updated: ${mergedTags.join(", ")}`);
        updated++;
      } else {
        console.log(`   ⚠️ No tags generated`);
      }

      // Rate limit - wait 500ms between calls
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n✨ Complete! Updated: ${updated}, Failed: ${failed}`);
}

// Run the script
backfillTags().catch(console.error);
