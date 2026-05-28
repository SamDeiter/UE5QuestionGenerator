/**
 * Google Sheets API integration via JSONP.
 * NOTE: Uses Math.random for unique callback name generation (non-security).
 * NOTE: Regex patterns are for HTML tag stripping - input is from trusted sources.
 */
/* eslint-disable sonarjs/slow-regex */
import { sanitizeCSVField } from "../utils/security";

const stripHtmlTags = (str) => {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "");
};

/**
 * Validate that a Google Apps Script deployment URL points at the official
 * `script.google.com/macros/s/<id>/exec` endpoint. Throws on anything else,
 * including bare hosts, http://, javascript:, or attacker-controlled domains
 * that contain the substring "script.google.com" in the path or query.
 *
 * The Sheets bridge previously POSTed the entire question payload to any
 * URL a user typed into Settings. This validator is the chokepoint.
 */
export const assertAppsScriptUrl = (sheetUrl) => {
  if (!sheetUrl || typeof sheetUrl !== "string") {
    throw new Error("Google Apps Script URL is not configured.");
  }
  let parsed;
  try {
    parsed = new URL(sheetUrl);
  } catch {
    throw new Error("Google Apps Script URL is malformed.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error(
      "Google Apps Script URL must use https:// (refusing to send data over an insecure scheme)."
    );
  }
  if (parsed.hostname !== "script.google.com") {
    throw new Error(
      `Google Apps Script URL must be on script.google.com (got ${parsed.hostname}). ` +
        "Refusing to export to an unrecognized host."
    );
  }
  if (!/^\/macros\/s\/[^/]+\/exec$/.test(parsed.pathname)) {
    throw new Error(
      "Google Apps Script URL must end in /macros/s/<deployment-id>/exec."
    );
  }
  return parsed.toString();
};

// Apply CSV-formula sanitization + HTML strip in one pass for any string
// field sent to Apps Script. Sheets will execute leading =/+/-/@ as formulas
// unless we prefix them with a single quote.
const safeSheetsCell = (value) => {
  if (value === null || value === undefined) return "";
  return sanitizeCSVField(stripHtmlTags(String(value)));
};

export const fetchQuestionsFromSheets = (sheetUrl) => {
  const validUrl = assertAppsScriptUrl(sheetUrl);
  return new Promise((resolve, reject) => {
    // Create a unique callback name for JSONP
    // eslint-disable-next-line sonarjs/pseudo-random
    const callbackName = "jsonp_callback_" + Math.round(100000 * Math.random());

    // Define the callback function globally
    window[callbackName] = (data) => {
      delete window[callbackName];
      document.body.removeChild(script);
      if (data.status === "Success" && Array.isArray(data.data)) {
        resolve(data.data);
      } else {
        reject(new Error(data.message || "Invalid data format received"));
      }
    };

    // Create the script element
    const script = document.createElement("script");
    // Append callback parameter to validated URL.
    const separator = validUrl.includes("?") ? "&" : "?";
    script.src = `${validUrl}${separator}callback=${callbackName}&action=read`;
    script.onerror = () => {
      delete window[callbackName];
      document.body.removeChild(script);
      reject(
        new Error(
          "Connection failed. 1. Ensure you added the 'doGet' function. 2. Redeploy as 'New Version'. 3. Set Access to 'Anyone'."
        )
      );
    };

    // Append to body to trigger request
    document.body.appendChild(script);
  });
};

export const saveQuestionsToSheets = async (sheetUrl, questions) => {
  const validUrl = assertAppsScriptUrl(sheetUrl);

  // Transform into JSON array matching CSV structure (without headers).
  // Every string field goes through safeSheetsCell, which strips HTML and
  // prefixes leading =/+/-/@ with a single quote so Sheets renders the
  // value as text rather than executing it as a formula.
  const payloadData = questions.map((row, i) => {
    const cleanedSourceUrl =
      row.sourceUrl && !row.sourceUrl.includes("grounding-api")
        ? row.sourceUrl
        : "";
    const o = row.options || {};
    return {
      ID: (i + 1).toString(),
      uniqueId: safeSheetsCell(row.uniqueId),
      Status: safeSheetsCell(row.status || "accepted"),
      Discipline: safeSheetsCell(row.discipline),
      Type: safeSheetsCell(row.type),
      Difficulty: safeSheetsCell(row.difficulty),
      Question: safeSheetsCell(row.question),
      OptionA: safeSheetsCell(o.A),
      OptionB: safeSheetsCell(o.B),
      OptionC: safeSheetsCell(o.C),
      OptionD: safeSheetsCell(o.D || ""),
      Answer: safeSheetsCell(row.correct),
      Explanation: safeSheetsCell(row.explanation || ""),
      Language: safeSheetsCell(row.language || "English"),
      SourceFile: safeSheetsCell(cleanedSourceUrl),
      sourceExcerpt: safeSheetsCell(row.sourceExcerpt),
      creator: safeSheetsCell(row.creatorName),
      reviewer: safeSheetsCell(row.reviewerName),
      QualityScore: safeSheetsCell(
        row.critiqueScore || row.initialQuality || ""
      ),
      AICritique: safeSheetsCell(row.critique || ""),
      TokenCost: safeSheetsCell(row.tokenCost || ""),
      RejectionReason: safeSheetsCell(row.rejectionReason || ""),
      HumanVerifiedBy: safeSheetsCell(row.humanVerifiedBy || ""),
      RejectedAt: safeSheetsCell(row.rejectedAt || ""),
    };
  });

  // The new GAS expects a 'questions' array inside the 'data' parameter
  const finalPayload = { questions: payloadData };

  // Use a new tab to submit the form.
  // This ensures that if there is an Auth/Permission error (403), the user SEES it.
  // Hidden iframes swallow auth errors silently.
  const form = document.createElement("form");
  form.method = "POST";
  form.action = validUrl;
  form.target = "SheetsSaving"; // Open in popup window

  // Open popup window
  window.open("", "SheetsSaving", "width=600,height=500");

  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "data";
  input.value = JSON.stringify(finalPayload); // Stringify the final payload
  form.appendChild(input);

  document.body.appendChild(form);
  form.submit();

  // Clean up form after submission
  setTimeout(() => {
    document.body.removeChild(form);
  }, 1000);
};

export const clearQuestionsFromSheets = async (sheetUrl) => {
  let validUrl;
  try {
    validUrl = assertAppsScriptUrl(sheetUrl);
  } catch (e) {
    alert(`Error: ${e.message}`);
    return;
  }

  // Open a popup window that can be closed programmatically
  const popup = window.open("", "SheetsClearing", "width=600,height=400");
  if (popup) {
    popup.document.write(
      '<html><body style="background:#111827;color:#9ca3af;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>Clearing Google Sheets...</h2><p>Please wait...</p></div></body></html>'
    );
  }

  const form = document.createElement("form");
  form.method = "POST";
  // Append action as URL parameter so Google Apps Script can read it via e.parameter
  const separator = validUrl.includes("?") ? "&" : "?";
  form.action = `${validUrl}${separator}action=clear`;
  form.target = "SheetsClearing"; // Target the popup window

  document.body.appendChild(form);
  form.submit();

  setTimeout(() => {
    document.body.removeChild(form);
  }, 1000);
};
