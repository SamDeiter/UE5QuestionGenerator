const functions = require("firebase-functions");
const { checkRateLimit } = require("../middleware/rateLimiter");
const { logApiUsage } = require("../utils/apiUsage");
const {
  sanitizeInput,
  validateNoPromptInjection,
} = require("../utils/inputSanitizer");

/**
 * Cloud Function: portkeyGenerate
 * Proxies AI generation requests through Portkey's gateway server-side.
 * Keeps the Portkey API key secure (never exposed to clients).
 *
 * Uses Portkey's OpenAI-compatible REST API directly (no SDK needed).
 */
exports.portkeyGenerate = functions
  .runWith({
    secrets: ["PORTKEY_API_KEY", "PORTKEY_VIRTUAL_KEY"],
    timeoutSeconds: 60,
    memory: "256MB",
  })
  .https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated."
      );
    }

    const userId = context.auth.uid;
    const {
      systemPrompt,
      userPrompt,
      temperature = 0.2,
      model = "gemini-3.5-flash",
      action = "generate", // "generate" | "critique" | "classify" | "tags"
    } = data;

    // 2. Input validation
    if (!systemPrompt || !userPrompt) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "systemPrompt and userPrompt are required."
      );
    }

    const sanitizedSystem = sanitizeInput(systemPrompt);
    const sanitizedUser = sanitizeInput(userPrompt);
    validateNoPromptInjection(sanitizedSystem);
    validateNoPromptInjection(sanitizedUser);

    // 3. Rate limiting
    const hourlyLimit = await checkRateLimit(userId, "AI_HOURLY");
    if (!hourlyLimit.allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        hourlyLimit.reason || "Rate limit exceeded",
        { resetAt: hourlyLimit.resetAt?.toISOString() }
      );
    }

    const dailyLimit = await checkRateLimit(userId, "AI_DAILY");
    if (!dailyLimit.allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        dailyLimit.reason || "Daily rate limit exceeded",
        { resetAt: dailyLimit.resetAt?.toISOString() }
      );
    }

    try {
      // 4. Get server-side secrets
      const apiKey = process.env.PORTKEY_API_KEY;
      const virtualKey = process.env.PORTKEY_VIRTUAL_KEY;

      if (!apiKey) {
        console.error("[ERROR] PORTKEY_API_KEY secret is not set.");
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Server configuration error: Portkey API key missing."
        );
      }

      // 5. Build messages (OpenAI format)
      const messages = [];
      if (sanitizedSystem) {
        messages.push({ role: "system", content: sanitizedSystem });
      }
      messages.push({ role: "user", content: sanitizedUser });

      // 6. Determine model prefix and options
      const portkeyModel = model.startsWith("@VERTEX_PROVIDER/")
        ? model
        : `@VERTEX_PROVIDER/${model}`;

      const requestBody = {
        messages,
        model: portkeyModel,
        temperature,
        max_tokens: 8192,
      };

      // For critique/tags, request JSON response
      if (action === "critique" || action === "tags") {
        requestBody.response_format = { type: "json_object" };
      }

      // 7. Call Portkey REST API (OpenAI-compatible)
      const headers = {
        "Content-Type": "application/json",
        "x-portkey-api-key": apiKey,
      };

      if (virtualKey) {
        headers["x-portkey-virtual-key"] = virtualKey;
      }

      const response = await fetch(
        "https://api.portkey.ai/v1/chat/completions",
        {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[ERROR] Portkey API failed: ${response.status}`,
          errorText
        );
        throw new Error(`Portkey API error: ${response.status}`);
      }

      const responseData = await response.json();
      const content = responseData.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content generated from Portkey");
      }

      // 8. Log usage
      await logApiUsage(userId, {
        model: model,
        type: action,
        service: "portkey",
      });

      return {
        success: true,
        textResponse: content,
      };
    } catch (error) {
      console.error("[ERROR] Portkey proxy error:", error.message);

      // If it's already an HttpsError, re-throw as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Portkey generation failed: ${error.message}`
      );
    }
  });
