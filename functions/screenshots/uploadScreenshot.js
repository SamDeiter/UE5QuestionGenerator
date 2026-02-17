const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { google } = require("googleapis");

// Service account key stored as Firebase secret
const DRIVE_SA_KEY = defineSecret("DRIVE_SA_KEY");

// Google Drive folder ID for screenshots (personal Drive)
const SCREENSHOT_FOLDER_ID = "1KddsOq_uNJoLipneso9l8RopwsHAFmUM";

/**
 * Upload a screenshot to Google Drive using a service account.
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
 *   fileId: "...",
 *   viewUrl: "https://drive.google.com/file/d/.../view",
 *   thumbnailUrl: "https://drive.google.com/thumbnail?id=...&sz=w400"
 * }
 */
exports.uploadScreenshot = onRequest(
  {
    cors: true,
    maxInstances: 5,
    timeoutSeconds: 60,
    memory: "256MiB",
    secrets: [DRIVE_SA_KEY],
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
      const fileName = `${toolId || "unknown"}_${itemId || "unknown"}_${timestamp}.png`;

      // Authenticate with service account
      const saKey = JSON.parse(DRIVE_SA_KEY.value());
      const auth = new google.auth.GoogleAuth({
        credentials: saKey,
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      });

      const drive = google.drive({ version: "v3", auth });

      // Upload file to Drive
      const fileBuffer = Buffer.from(base64Data, "base64");
      const { Readable } = require("stream");
      const stream = new Readable();
      stream.push(fileBuffer);
      stream.push(null);

      const createResponse = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [SCREENSHOT_FOLDER_ID],
          mimeType: "image/png",
          description: `Screenshot by ${reviewerEmail || "unknown"} for ${toolId}/${itemId}`,
        },
        media: {
          mimeType: "image/png",
          body: stream,
        },
        fields: "id, webViewLink",
      });

      const fileId = createResponse.data.id;

      // Make file publicly viewable
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
      const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;

      console.log(`[uploadScreenshot] Uploaded ${fileName} (${fileId}) by ${reviewerEmail}`);

      return res.status(200).json({
        success: true,
        fileId,
        viewUrl,
        thumbnailUrl,
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
