const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Firebase Storage bucket (default bucket)
const BUCKET_NAME = process.env.STORAGE_BUCKET || "development-317819.firebasestorage.app";

// SECURITY: Max file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * SECURITY: Verify Firebase Auth Bearer token from request headers.
 * @param {object} req - Express request object
 * @returns {Promise<object>} Decoded token with uid, email, etc.
 * @throws {Error} If token is missing or invalid
 */
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }
  const idToken = authHeader.split("Bearer ")[1];
  return admin.auth().verifyIdToken(idToken);
}

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
 * Requires: Authorization: Bearer <Firebase ID Token>
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
      // SECURITY: Verify authentication
      const decodedToken = await verifyAuth(req);
      const authenticatedEmail = decodedToken.email || "unknown";

      const { imageData, toolId, itemId, reviewerEmail } = req.body;

      if (!imageData) {
        return res.status(400).json({ success: false, error: "imageData is required" });
      }

      // Parse base64 data — strip data URL prefix if present
      let base64Data = imageData;
      if (base64Data.includes(",")) {
        base64Data = base64Data.split(",")[1];
      }

      const buffer = Buffer.from(base64Data, "base64");

      // SECURITY: Enforce file size limit
      if (buffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        });
      }

      // Build filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `screenshots/${toolId || "unknown"}/${itemId || "unknown"}_${timestamp}.png`;

      // Upload to Firebase Storage
      const bucket = admin.storage().bucket(BUCKET_NAME);
      const file = bucket.file(fileName);

      await file.save(buffer, {
        metadata: {
          contentType: "image/png",
          metadata: {
            reviewerEmail: reviewerEmail || authenticatedEmail,
            uploadedBy: decodedToken.uid,
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

      console.log(`[uploadScreenshot] Uploaded ${fileName} by ${authenticatedEmail}`);

      return res.status(200).json({
        success: true,
        viewUrl,
        thumbnailUrl: viewUrl,
        fileName,
      });
    } catch (err) {
      // SECURITY: Return 401 for auth failures, 500 for others
      if (err.message.includes("Authorization") || err.code === "auth/id-token-expired" || err.code === "auth/argument-error") {
        return res.status(401).json({ success: false, error: "Authentication required" });
      }
      console.error("[uploadScreenshot] Error:", err.message);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);
