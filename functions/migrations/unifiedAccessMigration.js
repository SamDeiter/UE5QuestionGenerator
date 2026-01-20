const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { isAdminUser } = require("../utils/isAdminUser");

/**
 * Cloud Function: runUnifiedAccessMigration
 * Adds 'tools: ["questions"]' to all existing users in registeredUsers.
 * This ensures backward compatibility for the new access control system.
 * ADMIN ONLY.
 */
exports.runUnifiedAccessMigration = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .https.onCall(async (data, context) => {
    // 1. Authentication & Admin check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in.",
      );
    }

    const isAdmin = await isAdminUser(context.auth.uid);
    // Explicitly allow samdeiter@gmail.com for initial bootstrap if needed
    const isOwner =
      context.auth.token.email === "samdeiter@gmail.com" ||
      context.auth.token.email === "samdeiter@epicgames.com";

    if (!isAdmin && !isOwner) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required.",
      );
    }

    const db = admin.firestore();
    const batchSize = 100;
    let processedCount = 0;

    try {
      const usersRef = db.collection("registeredUsers");
      const snapshot = await usersRef.where("tools", "==", null).get();

      if (snapshot.empty) {
        // Also check for users where the field just doesn't exist at all
        // Firestore 'where' doesn't easily find missing fields, so we might need a full scan
        // if the collection is small, or just check those without the 'tools' field.
        const allUsers = await usersRef.get();
        const usersToUpdate = allUsers.docs.filter((doc) => !doc.data().tools);

        if (usersToUpdate.length === 0) {
          return {
            success: true,
            message: "No users found needing migration.",
          };
        }

        let batch = db.batch();
        let opsInBatch = 0;

        for (const doc of usersToUpdate) {
          batch.update(doc.ref, {
            tools: ["questions"],
            migrationDate: admin.firestore.Timestamp.now(),
          });
          opsInBatch++;
          processedCount++;

          if (opsInBatch >= batchSize) {
            await batch.commit();
            batch = db.batch();
            opsInBatch = 0;
          }
        }

        if (opsInBatch > 0) {
          await batch.commit();
        }
      } else {
        // Standard merge for those with null tools
        let batch = db.batch();
        let opsInBatch = 0;

        for (const doc of snapshot.docs) {
          batch.update(doc.ref, {
            tools: ["questions"],
            migrationDate: admin.firestore.Timestamp.now(),
          });
          opsInBatch++;
          processedCount++;

          if (opsInBatch >= batchSize) {
            await batch.commit();
            batch = db.batch();
            opsInBatch = 0;
          }
        }

        if (opsInBatch > 0) {
          await batch.commit();
        }
      }

      console.log(`Migration complete. Processed ${processedCount} users.`);
      return {
        success: true,
        processedCount,
        message: `Successfully migrated ${processedCount} users.`,
      };
    } catch (error) {
      console.error("Migration failed:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Migration failed: ${error.message}`,
      );
    }
  });

/**
 * Cloud Function: seedToolRegistry
 * Initializes the toolRegistry collection with the list of current tools.
 * ADMIN ONLY.
 */
exports.seedToolRegistry = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in.",
      );
    }

    const isAdmin = await isAdminUser(context.auth.uid);
    const isOwner =
      context.auth.token.email === "samdeiter@gmail.com" ||
      context.auth.token.email === "samdeiter@epicgames.com";

    if (!isAdmin && !isOwner) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required.",
      );
    }

    const db = admin.firestore();
    const tools = [
      {
        id: "questions",
        name: "UE5 Question Generator",
        description:
          "Generate and review UE5 certification style questions with AI grounding.",
        url: "https://samdeiter.github.io/UE5QuestionGenerator/",
        icon: "psychology",
        status: "Available",
        requiresAuth: true,
      },
      {
        id: "blueprint",
        name: "Blueprint Editor (UE5 Replica)",
        description:
          "Web-based replica of the Unreal Engine 5 Blueprint scripting interface.",
        url: "https://samdeiter.github.io/UE5LMSBlueprint/",
        icon: "account_tree",
        status: "Available",
        requiresAuth: true,
      },
      {
        id: "scenario",
        name: "Scenario Tracker",
        description:
          "Interactive scenario management and tracking tool for UE5 training.",
        url: "https://samdeiter.github.io/UE5ScenarioTracker/",
        icon: "assignment",
        status: "Available",
        requiresAuth: true,
      },
      {
        id: "materials",
        name: "Material Editor Simulation",
        description:
          "Interactive simulation for learning UE5 material node workflows.",
        url: "https://samdeiter.github.io/UE5LMSMaterials/",
        icon: "texture",
        status: "Available",
        requiresAuth: true,
      },
    ];

    try {
      const batch = db.batch();
      const registryRef = db.collection("toolRegistry");

      for (const tool of tools) {
        batch.set(registryRef.doc(tool.id), {
          ...tool,
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }

      await batch.commit();
      return {
        success: true,
        message: `Seeded ${tools.length} tools into toolRegistry.`,
      };
    } catch (error) {
      console.error("Seeding failed:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Seeding failed: ${error.message}`,
      );
    }
  });
