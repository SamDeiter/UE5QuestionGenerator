const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Firebase Storage bucket (default bucket)
const BUCKET_NAME = "ue5-questions-prod.firebasestorage.app";

/**
 * Upload a screenshot to Firebase Storage.
 *
 * Expects POST with JSON body:
 * {
 *   imageData: "data:image/png;base64,...",
 *   toolId: "scenario-tracker",
 *   itemId: "module-1",
 *   reviewerEmail: "user@example.com"
 * }
 *
 * Returns JSON:
 * {
 *   success: true,
 *   viewUrl: "https://storage.googleapis.com/...",
 *   thumbnailUrl: "https://storage.googleapis.com/..."
 * }
 */
exports.uploadScreenshot = onRequest(
  {
    cors: true,
    maxInstances: 5,
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
      const { imageData, toolId, itemId, reviewerEmail } = req.body;

      if (!imageData) {
        return res.status(400).json({ success: false, error: "imageData is required" });
      }

      // Parse base64 data — strip data URL prefix if present
      let base64Data = imageData;
      if (base64Data.includes(",")) {
        base64Data = base64Data.split(",")[1];
      }

      // Build filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `screenshots/${toolId || "unknown"}/${itemId || "unknown"}_${timestamp}.png`;

      // Upload to Firebase Storage
      const bucket = admin.storage().bucket(BUCKET_NAME);
      const file = bucket.file(fileName);

      const buffer = Buffer.from(base64Data, "base64");

      await file.save(buffer, {
        metadata: {
          contentType: "image/png",
          metadata: {
            reviewerEmail: reviewerEmail || "unknown",
            toolId: toolId || "",
            itemId: itemId || "",
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Make file publicly readable
      await file.makePublic();

      // Get the public URL
      const viewUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;

      console.log(`[uploadScreenshot] Uploaded ${fileName} by ${reviewerEmail}`);

      return res.status(200).json({
        success: true,
        viewUrl,
        thumbnailUrl: viewUrl, // Same URL for Firebase Storage
        fileName,
      });
    } catch (err) {
      console.error("[uploadScreenshot] Error:", err.message);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error",
      });
    }
  }
);
