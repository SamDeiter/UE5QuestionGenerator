/**
 * Shared Firestore handle for the app's NAMED database.
 *
 * The app's data lives in a NAMED Firestore database ("ue5qg-prod" on the Epic
 * project development-317819), NOT the project's "(default)" database. Every
 * function must use getDb() instead of admin.firestore() so reads/writes hit
 * the correct database.
 *
 * getDb() is lazy: it resolves the Firestore client at call time (inside
 * handlers), after admin.initializeApp() has run in index.js. getFirestore()
 * caches one instance per (app, databaseId), so calling it repeatedly is cheap.
 *
 * Set FIRESTORE_DATABASE_ID to override; an empty value falls back to the
 * "(default)" database (legacy ue5-questions-prod behavior / local emulator).
 */
const { getFirestore } = require("firebase-admin/firestore");

const databaseId =
  process.env.FIRESTORE_DATABASE_ID === undefined
    ? "ue5qg-prod"
    : process.env.FIRESTORE_DATABASE_ID;

function getDb() {
  return databaseId ? getFirestore(databaseId) : getFirestore();
}

module.exports = { getDb, databaseId };
