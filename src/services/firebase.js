// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, Timestamp } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

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
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google:", error);
        throw error;
    }
};

export const signOutUser = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out:", error);
        throw error;
    }
};

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

        // Add creatorId if user is signed in
        if (auth.currentUser) {
            payload.creatorId = auth.currentUser.uid;
            payload.creatorEmail = auth.currentUser.email;
        }

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
        let q;
        if (auth.currentUser) {
            q = query(collection(db, "questions"), where("creatorId", "==", auth.currentUser.uid));
        } else {
            // Fallback for unauthenticated (shouldn't happen with new rules, but good for safety)
            q = collection(db, "questions");
        }

        const querySnapshot = await getDocs(q);
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

/**
 * Deletes all questions from Firestore.
 * WARNING: This is a destructive operation that cannot be undone.
 * @returns {Promise<number>} Number of documents deleted.
 */
export const clearAllQuestionsFromFirestore = async () => {
    try {
        let q;
        if (auth.currentUser) {
            q = query(collection(db, "questions"), where("creatorId", "==", auth.currentUser.uid));
        } else {
            q = collection(db, "questions");
        }

        const querySnapshot = await getDocs(q);
        let deletedCount = 0;

        // Delete each document
        const deletePromises = [];
        querySnapshot.forEach((docSnapshot) => {
            deletePromises.push(deleteDoc(docSnapshot.ref));
            deletedCount++;
        });

        await Promise.all(deletePromises);
        console.log(`Deleted ${deletedCount} questions from Firestore.`);
        return deletedCount;
    } catch (error) {
        console.error("Error clearing questions from Firestore:", error);
        throw error;
    }
};

/**
 * Saves custom tags for the current user to Firestore.
 * @param {Object} customTags - Object mapping discipline names to arrays of custom tags
 * @returns {Promise<void>}
 */
export const saveCustomTags = async (customTags) => {
    try {
        if (!auth.currentUser) {
            console.warn("No user signed in, cannot save custom tags");
            return;
        }

        const docRef = doc(db, "userSettings", auth.currentUser.uid);
        await setDoc(docRef, {
            customTags,
            updatedAt: Timestamp.now()
        }, { merge: true });

        console.log("Custom tags saved to Firestore");
    } catch (error) {
        console.error("Error saving custom tags:", error);
        throw error;
    }
};

/**
 * Retrieves custom tags for the current user from Firestore.
 * @returns {Promise<Object>} Object mapping discipline names to arrays of custom tags
 */
export const getCustomTags = async () => {
    try {
        if (!auth.currentUser) {
            console.warn("No user signed in, returning empty custom tags");
            return {};
        }

        const docRef = doc(db, "userSettings", auth.currentUser.uid);
        const docSnap = await getDocs(collection(db, "userSettings"));

        // Get the specific user's document
        const userDocRef = doc(db, "userSettings", auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            return userDocSnap.data().customTags || {};
        }

        return {};
    } catch (error) {
        console.error("Error getting custom tags:", error);
        return {};
    }
};

export { app, analytics, db, auth };
