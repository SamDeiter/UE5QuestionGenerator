/**
 * Backfill Custom Claims Migration
 *
 * One-time function to set Firebase Auth custom claims for existing users.
 * This ensures users who registered before Phase 2 have their role/tools
 * in their auth token for faster security rule checks.
 *
 * @module functions/migrations/backfillCustomClaims
 */

const functions = require("firebase-functions");
const { getDb } = require("../db");
const admin = require("firebase-admin");

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const { isAdminUser } = require("../utils/isAdminUser");

/**
 * Process a single user for claims backfill
 * @param {string} userId - User ID
 * @param {Object} userData - User data from Firestore
 * @param {boolean} dryRun - If true, don't actually set claims
 * @returns {Object} Result of the backfill operation
 */
async function processUserClaims(userId, userData, dryRun) {
  const email = userData.email;
  const newClaims = {
    role: userData.role || "reviewer",
    tools: userData.tools || ["questions"],
  };

  // Get current claims to check if already set
  const userRecord = await admin.auth().getUser(userId);
  const existingClaims = userRecord.customClaims || {};

  // Check if claims already match
  const claimsMatch =
    existingClaims.role === newClaims.role &&
    JSON.stringify(existingClaims.tools) === JSON.stringify(newClaims.tools);

  if (claimsMatch) {
    return { skipped: true };
  }

  if (!dryRun) {
    await admin.auth().setCustomUserClaims(userId, newClaims);
  }

  console.log(
    `${dryRun ? "[DRY RUN] " : ""}Backfilled claims for ${email}: ${JSON.stringify(newClaims)}`,
  );

  return {
    updated: true,
    uid: userId,
    email,
    previousClaims: existingClaims,
    newClaims,
  };
}

/**
 * Cloud Function: backfillCustomClaims
 * Sets custom claims for all existing registered users
 * ADMIN ONLY - one-time migration
 */
exports.backfillCustomClaims = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .https.onCall(async (data, context) => {
    // Must be authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    // Admin check
    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required",
      );
    }

    const db = getDb();
    const dryRun = data?.dryRun === true;
    const targetUserId = data?.userId;

    try {
      // Single user mode
      if (targetUserId) {
        const userDoc = await db
          .collection("registeredUsers")
          .doc(targetUserId)
          .get();
        if (!userDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            `User ${targetUserId} not found`,
          );
        }
        const result = await processUserClaims(
          targetUserId,
          userDoc.data(),
          dryRun,
        );
        return {
          success: true,
          dryRun,
          updated: result.skipped ? 0 : 1,
          users: result.skipped ? [] : [result],
        };
      }

      // Batch mode: all users
      const usersSnapshot = await db.collection("registeredUsers").get();
      const results = [];
      let updated = 0,
        skipped = 0,
        errors = 0;

      for (const doc of usersSnapshot.docs) {
        try {
          const result = await processUserClaims(doc.id, doc.data(), dryRun);
          if (result.skipped) {
            skipped++;
          } else {
            results.push(result);
            updated++;
          }
        } catch (err) {
          console.error(`Error processing ${doc.data().email}:`, err.message);
          errors++;
        }
      }

      console.log(
        `${dryRun ? "[DRY RUN] " : ""}Complete: ${updated} updated, ${skipped} skipped, ${errors} errors`,
      );
      return {
        success: true,
        dryRun,
        total: usersSnapshot.size,
        updated,
        skipped,
        errors,
        users: results,
      };
    } catch (error) {
      console.error("Error in backfillCustomClaims:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed: ${error.message}`,
      );
    }
  });
