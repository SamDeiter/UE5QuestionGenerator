/**
 * ReviewFirebase Module
 * Extends ReviewStorage with Firestore cloud support.
 * Requires Firebase SDK to be loaded.
 */

class FirestoreAdapter extends window.ReviewStorage.Base {
  constructor(config) {
    super();
    this.config = config;
    this.db = null;
    this.auth = null;
    this.userId = null;
  }

  async init() {
    if (!window.firebase) {
      throw new Error(
        "[ReviewFirebase] Firebase SDK not found. Please include firebase-app.js and firebase-firestore.js",
      );
    }

    // Initialize Firebase if not already
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(this.config);
    }

    this.db = window.firebase.firestore();
    this.auth = window.firebase.auth();

    // Wait for auth to resolve
    return new Promise((resolve) => {
      this.auth.onAuthStateChanged((user) => {
        this.userId = user ? user.uid : "anonymous";
        console.log(`[ReviewFirebase] Authenticated as: ${this.userId}`);
        resolve();
      });
    });
  }

  async load(appId) {
    if (!this.db) await this.init();

    try {
      const doc = await this.db
        .collection("reviews")
        .doc(`${this.userId}_${appId}`)
        .get();
      if (doc.exists) {
        return doc.data();
      }
      return null;
    } catch (e) {
      console.error("[ReviewFirebase] Firestore load error:", e);
      return null;
    }
  }

  async save(appId, data) {
    if (!this.db) await this.init();

    try {
      await this.db
        .collection("reviews")
        .doc(`${this.userId}_${appId}`)
        .set(
          {
            ...data,
            appId,
            userId: this.userId,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      return true;
    } catch (e) {
      console.error("[ReviewFirebase] Firestore save error:", e);
      return false;
    }
  }

  // Auth Helpers
  async login() {
    const provider = new window.firebase.auth.GoogleAuthProvider();
    return this.auth.signInWithPopup(provider);
  }

  async logout() {
    return this.auth.signOut();
  }
}

// Add to global ReviewStorage
window.ReviewStorage.Firebase = FirestoreAdapter;
