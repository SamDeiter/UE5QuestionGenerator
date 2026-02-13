const functions = require("firebase-functions");
const admin = require("firebase-admin");

// isAdminUser no longer needed — registeredUsers and admins are checked directly

/**
 * Helper: Migrate orphaned registeredUsers document to new UID
 * Returns registration data after successful migration
 */
async function migrateOrphanedRegistration(db, orphanedDoc, newUserId, email) {
  const orphanedData = orphanedDoc.data();
  const orphanedUid = orphanedDoc.id;

  console.log(
    `[checkUserRegistration] Migrating orphaned doc from ${orphanedUid} to ${newUserId}`
  );

  // Create new doc under current UID
  await db
    .collection("registeredUsers")
    .doc(newUserId)
    .set({
      ...orphanedData,
      uid: newUserId,
      migratedFrom: orphanedUid,
      migratedAt: admin.firestore.Timestamp.now(),
    });

  // Delete orphaned document
  await db.collection("registeredUsers").doc(orphanedUid).delete();

  // Sync custom claims
  try {
    await admin.auth().setCustomUserClaims(newUserId, {
      role: orphanedData.role || "reviewer",
      tools: orphanedData.tools || ["questions"],
    });
    console.log(`[checkUserRegistration] Claims synced for ${newUserId}`);
  } catch (claimsError) {
    console.error("[checkUserRegistration] Claims sync failed:", claimsError);
  }

  // Audit log
  try {
    await db.collection("audit-log").add({
      eventType: "uid_migration",
      userId: newUserId,
      userEmail: email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        oldUid: orphanedUid,
        newUid: newUserId,
        role: orphanedData.role,
      },
      severity: "warning",
    });
  } catch (logError) {
    console.error("[checkUserRegistration] Audit log failed:", logError);
  }

  return {
    registered: true,
    role: orphanedData.role || "reviewer",
    registeredAt: orphanedData.registeredAt?.toDate()?.toISOString(),
    tools: orphanedData.tools || ["questions"],
    migrated: true,
  };
}

/**
 * Cloud Function: checkUserRegistration
 * Checks if a user is registered (has used a valid invite)
 *
 * FIX: Added email-based fallback lookup to handle UID changes.
 * If user's UID changes (e.g., account recreation), their orphaned
 * registeredUsers document is automatically migrated to the new UID.
 */
exports.checkUserRegistration = functions
  .runWith({ timeoutSeconds: 15, memory: "128MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      return { registered: false };
    }

    const db = admin.firestore();
    const userId = context.auth.uid;
    const email = context.auth.token.email;

    try {
      console.log(`[checkUserRegistration] Checking email: ${email}`);

      // 1. Epic Games Employee check (always admin)
      const emailLower = email ? email.toLowerCase() : "";
      const isEpicEmployee =
        emailLower.endsWith("@epicgames.com") ||
        emailLower.endsWith("@xa.epicgames.com");

      if (isEpicEmployee) {
        console.log(`[checkUserRegistration] Epic employee: ${email}`);
        return {
          registered: true,
          role: "admin",
          isEmployee: true,
          tools: ["questions", "blueprint", "scenario", "materials"],
        };
      }

      // 2. Check custom claims first (zero Firestore reads)
      const claims = context.auth.token;
      if (claims.role && claims.tools && Array.isArray(claims.tools)) {
        return {
          registered: true,
          role: claims.role,
          tools: claims.tools,
        };
      }

      // 3. Check registeredUsers by UID
      const userDoc = await db.collection("registeredUsers").doc(userId).get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        return {
          registered: true,
          role: userData.role || "reviewer",
          registeredAt: userData.registeredAt?.toDate()?.toISOString(),
          tools: userData.tools || ["questions"],
        };
      }

      // 3. EMAIL FALLBACK: Query by email for orphaned docs
      if (email) {
        console.log(
          `[checkUserRegistration] UID miss, checking email: ${email}`
        );

        // Get ALL documents with this email to clean up duplicates
        const emailQuery = await db
          .collection("registeredUsers")
          .where("email", "==", email)
          .get();

        if (!emailQuery.empty) {
          // Find documents that don't match current UID (orphaned)
          const orphanedDocs = emailQuery.docs.filter(
            (doc) => doc.id !== userId
          );

          if (orphanedDocs.length > 0) {
            // Migrate first orphaned doc to current UID
            const result = await migrateOrphanedRegistration(
              db,
              orphanedDocs[0],
              userId,
              email
            );

            // Delete any ADDITIONAL orphaned docs (prevents duplicate issue)
            if (orphanedDocs.length > 1) {
              console.log(
                `[checkUserRegistration] Cleaning up ${orphanedDocs.length - 1} duplicate records`
              );
              for (let i = 1; i < orphanedDocs.length; i++) {
                await db
                  .collection("registeredUsers")
                  .doc(orphanedDocs[i].id)
                  .delete();
              }
            }

            return result;
          }
        }
      }

      // 5. Check admins collection directly (legacy fallback)
      // NOTE: registeredUsers was already checked above, so we only
      // need the admins collection — no need for fullisAdminUser().
      const adminDoc = await db.collection("admins").doc(userId).get();
      if (adminDoc.exists) {
        return {
          registered: true,
          role: "admin",
          tools: ["questions", "blueprint", "scenario", "materials"],
        };
      }

      return { registered: false };
    } catch (error) {
      console.error("Error checking registration:", error);
      return { registered: false };
    }
  });
