const functions = require("firebase-functions");

// Import utility functions
const { checkRateLimit } = require("../middleware/rateLimiter");
const { logApiUsage } = require("../utils/apiUsage");
const { extractGroundingSources } = require("../utils/grounding");

/**
 * Cloud Function: generateQuestions
 * Securely calls the Gemini API with server-side API key
 *
 * This function:
 * 1. Validates the user is authenticated
 * 2. Implements rate limiting per user
 * 3. Calls Gemini API with server-side key
 * 4. Returns generated content
 */

exports.generateQuestions = functions
  .runWith({
    secrets: ["GEMINI_API_KEY"],
    timeoutSeconds: 60,
    memory: "256MB",
  })
  .https.onCall(async (data, context) => {
    // 1. Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to generate questions."
      );
    }
    // ... (start of function body remains)

    const userId = context.auth.uid;
    const {
      systemPrompt,
      userPrompt,
      temperature = 0.2,
      model = "gemini-1.5-flash", // Updated to stable model (2.0-flash-exp was returning 404)
    } = data;

    // 2. Input validation
    if (!systemPrompt || !userPrompt) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "systemPrompt and userPrompt are required."
      );
    }

    // 3. Rate limiting check (SECURITY: Prevents AI cost abuse)
    const hourlyLimit = await checkRateLimit(userId, "AI_HOURLY");
    if (!hourlyLimit.allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        hourlyLimit.reason || "Rate limit exceeded",
        {
          resetAt: hourlyLimit.resetAt?.toISOString(),
          resetInSeconds: Math.ceil((hourlyLimit.resetAt - new Date()) / 1000),
        }
      );
    }

    const dailyLimit = await checkRateLimit(userId, "AI_DAILY");
    if (!dailyLimit.allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        dailyLimit.reason || "Daily rate limit exceeded",
        {
          resetAt: dailyLimit.resetAt?.toISOString(),
        }
      );
    }

    try {
      // 4. Get API key from Secrets or Config
      // secrets using .runWith() are available in process.env
      let apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        // Fallback for local emulator or legacy config
        apiKey = functions.config().gemini?.api_key;
      }

      if (!apiKey) {
        console.error("[ERROR] GEMINI_API_KEY secret is not set.");
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Server configuration error: API Key missing."
        );
      }

      // ... rest of logic

      console.log("[DEBUG] API key found, length:", apiKey.length);

      // 5. Call Gemini API
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      console.log(
        "[DEBUG] Calling Gemini API (SKIPPED FOR DEBUGGING) with model:",
        model
      );

      const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [
          {
            googleSearch: {}, // Enable grounding
          },
        ],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: 8192,
        },
      };

      console.log("[DEBUG] Payload prepared, calling fetch...");

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[ERROR] Gemini API failed: ${response.status} ${response.statusText}`,
          errorText
        );
        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText}`
        );
      }

      const responseData = await response.json();
      const generatedText =
        responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      const sources = extractGroundingSources(responseData);

      if (!generatedText) {
        console.error(
          "[ERROR] No content in Gemini response:",
          JSON.stringify(responseData)
        );
        throw new Error("No content generated from Gemini");
      }

      // Log usage
      await logApiUsage(userId, {
        model: model,
        type: "generation",
      });

      return {
        success: true,
        textResponse: generatedText,
        groundingSources: sources,
      };
    } catch (error) {
      console.error("[ERROR] Error details:", JSON.stringify(error, null, 2));
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate questions: ${error.message}`
      );
    }
  });
