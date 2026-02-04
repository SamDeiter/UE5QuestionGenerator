/**
 * Firebase Central Hub
 *
 * This module serves as the main import point for Firebase functionality.
 * It re-exports functions from specialized modules for backward compatibility:
 * - firebaseAuth.js: Authentication functions
 * - firebaseQueries.js: Query/read functions
 * - firebaseSave.js: Save/write functions + offline queue
 */
import { app, auth, firebaseConfig } from "./firebaseAuth";
import { logError } from "../utils/AppError";

// NOTE: Analytics disabled - requires additional Firebase Console configuration
const analytics = null;
try {
  if (firebaseConfig.measurementId) {
    // analytics = getAnalytics(app); // Optimization: Keep disabled unless needed
  }
} catch (e) {
  logError(e, {
    operation: "initializeAnalytics",
    measurementId: firebaseConfig.measurementId,
  });
}

export { app, analytics, auth };

// Re-export auth functions from firebaseAuth.js for backward compatibility
export {
  signInWithGoogle,
  signOutUser,
  signUpWithEmail,
  signInWithEmail,
  resetPassword,
  refreshAuthToken,
  markAuthActivity,
  isAuthPotentiallyStale,
} from "./firebaseAuth";

// Re-export query functions from firebaseQueries.js for backward compatibility
export {
  getQuestionsFromFirestore,
  getAllQuestionsFromFirestore,
  subscribeToAllQuestions,
  getQuestionsPaginated,
  invalidateQuestionsCache,
  clearAllQuestionsFromFirestore,
  deleteSoftDeletedQuestionsFromFirestore,
  deleteQuestionFromFirestore,
  saveCustomTags,
  getCustomTags,
} from "./firebaseQueries";

// Re-export save functions from firebaseSave.js for backward compatibility
export {
  getDb,
  getConnectionStatus,
  getQueueDetails,
  getQueuedQuestionIds,
  triggerManualSync,
  clearOfflineQueue,
  subscribeToConnectionStatus,
  saveQuestionToFirestore,
  batchSaveQuestions,
} from "./firebaseSave";
