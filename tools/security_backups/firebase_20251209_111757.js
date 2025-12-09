// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, Timestamp } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Your web app's Firebase configuration
// SECURITY: Firebase config now uses environment variables
// Create a .env file based on .env.example and add your actual keys
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA1g9RCrRH8AxuFUOLRRPxwqmXda6ChWCI",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ue5questionssoure.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ue5questionssoure",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ue5questionssoure.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "10200378954",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:10200378954:web:5aaa8eb97cce0a4a6840b3",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-31HMNEB7S5"
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

// --- Offline Queue for Resilience ---
let offlineQueue = [];
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let syncInProgress = false;

// Load queued items from localStorage on startup
try {
    const savedQueue = localStorage.getItem('ue5_offline_queue');
    if (savedQueue) {
        offlineQueue = JSON.parse(savedQueue);
        console.log(`📦 Loaded ${offlineQueue.length} queued items from storage`);
    }
} catch (e) {
    console.warn('Failed to load offline queue:', e);
}

// Save queue to localStorage
const persistQueue = () => {
    try {
        localStorage.setItem('ue5_offline_queue', JSON.stringify(offlineQueue));
    } catch (e) {
        console.warn('Failed to persist offline queue:', e);
    }
};

// Connection status listeners
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('🌐 Connection restored');
        isOnline = true;
        processOfflineQueue();
    });

    window.addEventListener('offline', () => {
        console.log('📴 Connection lost');
        isOnline = false;
    });
}

// Process queued items when back online
const processOfflineQueue = async () => {
    if (syncInProgress || offlineQueue.length === 0) return;

    syncInProgress = true;
    console.log(`🔄 Processing ${offlineQueue.length} queued items...`);

    const itemsToProcess = [...offlineQueue];
    offlineQueue = [];

    for (const item of itemsToProcess) {
        try {
            await saveQuestionToFirestoreInternal(item.question);
            console.log(`✓ Synced queued item: ${item.question.uniqueId}`);
        } catch (err) {
            console.warn(`Failed to sync ${item.question.uniqueId}, re-queuing:`, err);
            offlineQueue.push(item);
        }
    }

    persistQueue();
    syncInProgress = false;

    if (offlineQueue.length > 0) {
        console.log(`⚠️ ${offlineQueue.length} items still queued`);
    }
};

// Get connection and sync status (for UI)
export const getConnectionStatus = () => ({
    isOnline,
    queuedCount: offlineQueue.length,
    syncInProgress
});

// Subscribe to connection status changes
const connectionListeners = new Set();
export const subscribeToConnectionStatus = (callback) => {
    connectionListeners.add(callback);
    return () => connectionListeners.delete(callback);
};

const notifyConnectionListeners = () => {
    const status = getConnectionStatus();
    connectionListeners.forEach(cb => cb(status));
};

// Update listeners when status changes
if (typeof window !== 'undefined') {
    window.addEventListener('online', notifyConnectionListeners);
    window.addEventListener('offline', notifyConnectionListeners);
}

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
 * Internal save function (used by queue processor)
 */
const saveQuestionToFirestoreInternal = async (question) => {
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
};

/**
 * Saves a single question to Firestore with offline queue fallback.
 * If offline or save fails, queues for retry when connection is restored.
 * @param {Object} question - The question object to save.
 * @returns {Object} { success: boolean, queued: boolean }
 */
export const saveQuestionToFirestore = async (question) => {
    try {
        // If offline, queue immediately
        if (!isOnline) {
            console.log(`📴 Offline - queuing ${question.uniqueId} for later sync`);
            offlineQueue.push({ question, timestamp: Date.now() });
            persistQueue();
            notifyConnectionListeners();
            return { success: false, queued: true };
        }

        await saveQuestionToFirestoreInternal(question);
        return { success: true, queued: false };

    } catch (error) {
        console.warn(`⚠️ Save failed for ${question.uniqueId}, queuing for retry:`, error.message);
        offlineQueue.push({ question, timestamp: Date.now() });
        persistQueue();
        notifyConnectionListeners();
        return { success: false, queued: true };
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
 * Deletes a single question from Firestore by uniqueId.
 * @param {string} uniqueId - The uniqueId of the question to delete
 * @returns {Promise<void>}
 */
export const deleteQuestionFromFirestore = async (uniqueId) => {
    try {
        if (!uniqueId) {
            console.error("Cannot delete question: missing uniqueId");
            return;
        }
        const docRef = doc(db, "questions", uniqueId);
        await deleteDoc(docRef);
        console.log(`Question ${uniqueId} deleted from Firestore.`);
    } catch (error) {
        console.error("Error deleting question from Firestore:", error);
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
