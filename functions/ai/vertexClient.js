/**
 * Vertex AI client for Gemini calls.
 *
 * Replaces the legacy Generative Language API (api-key) path. Auth is via the
 * function's Application Default Credentials (ADC) — NO API key. The runtime
 * service account must have roles/aiplatform.user on the project.
 *
 * The Vertex generateContent request/response shape matches the GL API, so
 * existing payloads (incl. tools:[{ googleSearch: {} }] grounding) and response
 * parsing (candidates[].content.parts[].text, groundingMetadata) are unchanged.
 */
const { GoogleAuth } = require("google-auth-library");

// In Cloud Functions, GCLOUD_PROJECT is set automatically to the deploy project
// (development-317819). The literal is a fallback for local/emulator runs.
const PROJECT_ID =
  process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "development-317819";

// Region hosting both the functions and the Vertex Gemini models.
const LOCATION = process.env.VERTEX_LOCATION || "us-central1";

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

let _client;

async function getAccessToken() {
  if (!_client) {
    _client = await auth.getClient();
  }
  const { token } = await _client.getAccessToken();
  if (!token) {
    throw new Error("Failed to obtain ADC access token for Vertex AI");
  }
  return token;
}

function vertexGenerateContentUrl(model) {
  return (
    `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}` +
    `/locations/${LOCATION}/publishers/google/models/${model}:generateContent`
  );
}

/**
 * POST a generateContent request to Vertex AI. Returns the raw fetch Response
 * so callers keep their existing res.ok / res.json() handling.
 */
async function callVertexGenerateContent(model, payload) {
  const token = await getAccessToken();
  return fetch(vertexGenerateContentUrl(model), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

module.exports = {
  callVertexGenerateContent,
  vertexGenerateContentUrl,
  getAccessToken,
  PROJECT_ID,
  LOCATION,
};
