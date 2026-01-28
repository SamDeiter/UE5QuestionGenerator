const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Scheduled function: cleanupAuditLogs
 * Runs daily to delete audit log entries older than RETENTION_DAYS
 *
 * Schedule: Every day at 3:00 AM UTC
 * Retention: 90 days (configurable)
 */
const RETENTION_DAYS = 90;
const BATCH_SIZE = 500; // Firestore batch limit

exports.cleanupAuditLogs = functions
  .runWith({ timeoutSeconds: 540, memory: "256MB" })
  .pubsub.schedule("0 3 * * *") // 3:00 AM UTC daily
  .timeZone("UTC")
  .onRun(async (context) => {
    const db = admin.firestore();

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

    console.log(
      `[cleanupAuditLogs] Deleting logs older than ${cutoffDate.toISOString()}`,
    );

    let totalDeleted = 0;
    let hasMore = true;

    // Delete in batches to avoid timeout
    while (hasMore) {
      const snapshot = await db
        .collection("audit-log")
        .where("timestamp", "<", cutoffTimestamp)
        .limit(BATCH_SIZE)
        .get();

      if (snapshot.empty) {
        hasMore = false;
        break;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      totalDeleted += snapshot.size;

      console.log(`[cleanupAuditLogs] Deleted batch of ${snapshot.size} logs`);

      // If we got fewer than BATCH_SIZE, we're done
      if (snapshot.size < BATCH_SIZE) {
        hasMore = false;
      }
    }

    console.log(
      `[cleanupAuditLogs] Cleanup complete. Total deleted: ${totalDeleted}`,
    );

    return { deleted: totalDeleted, retentionDays: RETENTION_DAYS };
  });
