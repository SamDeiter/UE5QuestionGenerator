/**
 * Vertex AI client for Gemini calls — wraps @google/genai SDK.
 *
 * Auth is via Application Default Credentials (ADC) automatically handled by
 * the SDK. The runtime service account must have roles/aiplatform.user.
 */
const { GoogleGenAI } = require("@google/genai");

const PROJECT_ID =
  process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "development-317819";
const LOCATION = process.env.VERTEX_LOCATION || "us-central1";

const _clients = {};

function _getClient(location = LOCATION) {
  if (!_clients[location]) {
    _clients[location] = new GoogleGenAI({
      vertexai: true,
      project: PROJECT_ID,
      location,
    });
  }
  return _clients[location];
}

/**
 * Call Vertex AI generateContent via the SDK.
 * Accepts the same REST payload shape used by callers:
 *   { contents, systemInstruction, generationConfig, tools }
 * Returns the SDK GenerateContentResponse (.text, .candidates).
 * Throws on any API error — callers should catch.
 */
async function generateContent(model, { contents, systemInstruction, generationConfig = {}, tools } = {}) {
  const ai = _getClient();
  // systemInstruction: REST shape is { parts: [{ text }] }; SDK accepts plain string
  const sysText = systemInstruction?.parts?.[0]?.text ?? systemInstruction ?? null;
  return ai.models.generateContent({
    model,
    contents,
    config: {
      ...(sysText && { systemInstruction: sysText }),
      ...generationConfig,
      ...(tools && { tools }),
    },
  });
}

module.exports = { generateContent, PROJECT_ID, LOCATION };
