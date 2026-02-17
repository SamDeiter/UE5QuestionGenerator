const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { google } = require("googleapis");

// The service account key stored as a Firebase secret
const DRIVE_SA_KEY = defineSecret("DRIVE_SA_KEY");

// Target spreadsheet ID
const SPREADSHEET_ID = "1BQ6T9K8dJhnjems7ZUHAHaU67qPUdZ8fZezZZxalzjs";

/**
 * Save review data to Google Sheet.
 *
 * Expects POST with JSON body:
 * {
 *   toolId: "scenario-tracker",
 *   itemId: "module-1",
 *   itemTitle: "Large Wreckage Ignores Physics",
 *   status: "verified" | "issue",
 *   note: "optional note",
 *   highlights: [...],
 *   screenshotUrl: "https://storage.googleapis.com/...",
 *   reviewerEmail: "user@example.com",
 *   reviewerName: "Sam"
 * }
 *
 * GET with ?toolId=xxx&email=xxx returns all reviews for that tool.
 * GET with ?toolId=xxx&email=xxx&callback=fn returns JSONP.
 */
exports.saveReview = onRequest(
  {
    cors: true,
    secrets: [DRIVE_SA_KEY],
    maxInstances: 5,
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (req, res) => {
    try {
      // Authenticate with service account
      const saKey = JSON.parse(DRIVE_SA_KEY.value());
      const auth = new google.auth.JWT(
        saKey.client_email,
        null,
        saKey.private_key,
        ["https://www.googleapis.com/auth/spreadsheets"]
      );
      const sheets = google.sheets({ version: "v4", auth });

      if (req.method === "GET") {
        return await handleGet(req, res, sheets);
      } else if (req.method === "POST") {
        return await handlePost(req, res, sheets);
      } else {
        return res.status(405).json({ success: false, error: "Method not allowed" });
      }
    } catch (err) {
      console.error("[saveReview] Error:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * Handle GET — return reviews for a tool/email combination.
 */
async function handleGet(req, res, sheets) {
  const { toolId, email, callback } = req.query;

  if (!toolId) {
    const errResp = { success: false, error: "toolId is required" };
    if (callback) return res.send(`${callback}(${JSON.stringify(errResp)})`);
    return res.status(400).json(errResp);
  }

  // Read all rows from the "Reviews" sheet
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Reviews!A:K",
  });

  const rows = result.data.values || [];
  const headers = rows[0] || [];
  const dataRows = rows.slice(1);

  // Filter by toolId (and optionally email)
  const reviews = dataRows
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i] || ""));
      return obj;
    })
    .filter((r) => r.toolId === toolId)
    .filter((r) => !email || r.reviewerEmail === email);

  const response = { success: true, reviews };
  if (callback) {
    res.set("Content-Type", "application/javascript");
    return res.send(`${callback}(${JSON.stringify(response)})`);
  }
  return res.json(response);
}

/**
 * Handle POST — upsert a review row.
 */
async function handlePost(req, res, sheets) {
  // Support both JSON body and form-encoded data
  const data = req.body || {};
  const {
    toolId,
    itemId,
    itemTitle,
    status,
    note,
    highlights,
    screenshotUrl,
    reviewerEmail,
    reviewerName,
  } = data;

  if (!toolId || !itemId) {
    return res.status(400).json({
      success: false,
      error: "toolId and itemId are required",
    });
  }

  const timestamp = new Date().toISOString();
  const highlightsStr =
    typeof highlights === "string" ? highlights : JSON.stringify(highlights || []);

  // Ensure "Reviews" sheet exists with headers
  await ensureSheet(sheets);

  // Check if row already exists for this toolId + itemId + reviewerEmail
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Reviews!A:K",
  });

  const rows = existing.data.values || [];
  let existingRowIndex = -1;

  if (rows.length > 0) {
    for (let i = 1; i < rows.length; i++) {
      if (
        rows[i][0] === toolId &&
        rows[i][1] === itemId &&
        rows[i][6] === (reviewerEmail || "")
      ) {
        existingRowIndex = i;
        break;
      }
    }
  }

  const newRow = [
    toolId || "",
    itemId || "",
    itemTitle || "",
    status || "",
    note || "",
    highlightsStr,
    reviewerEmail || "",
    reviewerName || "",
    screenshotUrl || "",
    timestamp,
  ];

  if (existingRowIndex >= 0) {
    // Update existing row
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Reviews!A${existingRowIndex + 1}:J${existingRowIndex + 1}`,
      valueInputOption: "RAW",
      resource: { values: [newRow] },
    });
    console.log(`[saveReview] Updated row ${existingRowIndex + 1} for ${itemId}`);
  } else {
    // Append new row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Reviews!A:J",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      resource: { values: [newRow] },
    });
    console.log(`[saveReview] Appended row for ${itemId}`);
  }

  return res.json({ success: true, action: existingRowIndex >= 0 ? "updated" : "created" });
}

/**
 * Ensure the "Reviews" sheet exists with proper headers.
 */
async function ensureSheet(sheets) {
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: "sheets.properties.title",
    });

    const sheetNames = meta.data.sheets.map((s) => s.properties.title);

    if (!sheetNames.includes("Reviews")) {
      // Create the sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [
            {
              addSheet: {
                properties: { title: "Reviews" },
              },
            },
          ],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: "Reviews!A1:J1",
        valueInputOption: "RAW",
        resource: {
          values: [
            [
              "toolId",
              "itemId",
              "itemTitle",
              "status",
              "note",
              "highlights",
              "reviewerEmail",
              "reviewerName",
              "screenshotUrl",
              "timestamp",
            ],
          ],
        },
      });

      console.log("[saveReview] Created 'Reviews' sheet with headers");
    }
  } catch (err) {
    console.warn("[saveReview] ensureSheet error:", err.message);
  }
}
