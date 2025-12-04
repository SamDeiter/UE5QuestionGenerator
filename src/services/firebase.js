// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import { getFirestore, collection, doc, setDoc, getDocs, query, where, Timestamp } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA1g9RCrRH8AxuFUOLRRPxwqmXda6ChWCI",
    authDomain: "ue5questionssoure.firebaseapp.com",
    projectId: "ue5questionssoure",
    storageBucket: "ue5questionssoure.firebasestorage.app",
    messagingSenderId: "10200378954",
    appId: "1:10200378954:web:5aaa8eb97cce0a4a6840b3",
    measurementId: "G-31HMNEB7S5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics;
try {
    analytics = getAnalytics(app);
} catch (e) {
    console.warn("Firebase Analytics failed to initialize (likely blocked by ad blocker):", e);
}
const db = getFirestore(app);

// --- Firestore Helpers ---

/**
 * Saves a single question to Firestore.
 * Uses the question's uniqueId as the document ID.
 * @param {Object} question - The question object to save.
 */
export const saveQuestionToFirestore = async (question) => {
    try {
        if (!question || !question.uniqueId) {
            console.error("Invalid question object or missing uniqueId", question);
            return;
        }

        // Create a reference to the document
        const docRef = doc(db, "questions", question.uniqueId);

        // Add a timestamp for when it was saved/updated in Firestore
        const payload = {
            ...question,
            firestoreUpdatedAt: Timestamp.now()
        };

        // Set the document (overwrite if exists, create if new)
        await setDoc(docRef, payload, { merge: true });
        console.log(`Question ${question.uniqueId} saved to Firestore.`);

        // Log event to Analytics
        if (analytics) {
            logEvent(analytics, 'save_question', {
                id: question.uniqueId,
                status: question.status,
                discipline: question.discipline
            });
        }

    } catch (error) {
        console.error("Error saving question to Firestore:", error);
        throw error; // Propagate error so UI can handle it if needed
    }
};

/**
 * Retrieves all questions from Firestore.
 * @returns {Promise<Array>} Array of question objects.
 */
export const getQuestionsFromFirestore = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "questions"));
        const questions = [];
        querySnapshot.forEach((doc) => {
            questions.push(doc.data());
        });
        return questions;
    } catch (error) {
        console.error("Error getting questions from Firestore:", error);
        return [];
    }
};

export { app, analytics, db };
