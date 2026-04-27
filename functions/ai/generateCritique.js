const functions = require("firebase-functions");
const { checkRateLimit } = require("../middleware/rateLimiter");
const admin = require("firebase-admin");

// Import utility functions
const { logApiUsage } = require("../utils/apiUsage");
const { sanitizeInput } = require("../utils/inputSanitizer");


/**
 * Cloud Function: generateCritique
 * Securely calls Gemini API for question critique
 */

exports.generateCritique = functions
  .runWith({
    secrets: ["GEMINI_API_KEY"],
    timeoutSeconds: 60,
    memory: "256MB",
  })
  .https.onCall(async (data, context) => {
    // Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated."
      );
    }

    const userId = context.auth.uid;
    const {
      question,
      options: rawOptions,
      correct,
      type = "Multiple Choice", // Question type: "True/False" or "Multiple Choice"
      modeLabel,
      model = "gemini-2.5-flash",
    } = data;

    // Normalize options: accept both array ["A","B"] and object {A:"...",B:"..."}
    let options;
    if (Array.isArray(rawOptions)) {
      options = rawOptions;
    } else if (rawOptions && typeof rawOptions === "object") {
      options = Object.values(rawOptions);
    } else {
      options = rawOptions;
    }

    // Input validation (strict type/shape checks)
    if (!question || typeof question !== "string" || question.trim().length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "question must be a non-empty string."
      );
    }
    if (!Array.isArray(options) || options.length < 2) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "options must be an array with at least 2 elements."
      );
    }
    if (!correct || typeof correct !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "correct must be a non-empty string."
      );
    }
    const validTypes = ["Multiple Choice", "True/False"];
    if (type && !validTypes.includes(type)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `type must be one of: ${validTypes.join(", ")}`
      );
    }

    // SECURITY: Sanitize inputs to prevent XSS
    const sanitizedQuestion = sanitizeInput(question);
    const sanitizedOptions = options.map((opt) => sanitizeInput(opt));
    const sanitizedCorrect = sanitizeInput(correct);

    // Rate limiting (SECURITY: Prevents AI cost abuse)
    const [hourlyLimit2, dailyLimit2] = await Promise.all([
      checkRateLimit(userId, "AI_HOURLY"),
      checkRateLimit(userId, "AI_DAILY"),
    ]);

    if (!hourlyLimit2.allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        hourlyLimit2.reason || "Rate limit exceeded",
        {
          resetAt: hourlyLimit2.resetAt?.toISOString(),
        }
      );
    }
    if (!dailyLimit2.allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        dailyLimit2.reason || "Daily rate limit exceeded",
        {
          resetAt: dailyLimit2.resetAt?.toISOString(),
        }
      );
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Gemini API key not configured."
        );
      }

      // Build critique prompt - Balanced and constructive evaluation
      const systemPrompt =
        "Expert UE5 Technical Reviewer. Output valid JSON only. Evaluate objectively and provide constructive feedback.";

      let strictnessInstruction = "";
      if (modeLabel === "Strict") {
        strictnessInstruction = `
            CONTEXT: The user requested a STRICT, FOUNDATIONAL question. 
            - If this is obscure, tricky, or niche: DEDUCT 20 POINTS. 
            - If it has multiple valid workflows (ambiguous) without context: DEDUCT 30 POINTS.
            - Must be textbook quality.`;
      } else if (modeLabel === "Wild") {
        strictnessInstruction = `
            CONTEXT: The user requested a WILD, EDGE-CASE question. 
            - If this is basic or obvious ("Documentation 101"): DEDUCT 20 POINTS.
            - Must be challenging and specific.`;
      }

      const userPrompt = `Evaluate this UE5 question as a Senior Technical Reviewer for a professional certification exam.
        ${strictnessInstruction}
        
        **SCORING GUIDELINES:** Score based on ACTUAL quality. Use the FULL 0-100 range appropriately:
        - 90-100: Excellent - Clear, accurate, well-written, strong distractors, verifiable source
        - 80-89: Good - Minor issues but professionally acceptable
        - 70-79: Acceptable - Needs polish but fundamentally sound
        - 60-69: Needs Work - Multiple issues requiring revision
        - Below 60: Poor - Major problems with accuracy, clarity, or structure
        
        **EVALUATION CRITERIA:**
        1. Technical Accuracy: Is the answer factually correct for UE5?
        2. Clarity: Is the question clear and unambiguous?
        3. Distractors: Are wrong answers plausible but definitively incorrect?
        4. Professional Tone: Is it suitable for certification/interview use?
        5. Source Quality: Can the answer be verified from official documentation?
        
        MANDATORY OUTPUT FORMAT: Return ONLY a raw JSON object (no markdown formatting) with this structure:
        {
            "score": number, // 0-100 (Integer only) - Original question score
            "improvedScore": number, // 0-100 (Integer only) - Score for your IMPROVED rewrite (should be higher)
            "critique": "string", // Detailed feedback with specific suggestions
            "rewrite": {
                "question": "string", // Improved question text
                "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
                "correct": "string" // Correct letter (A, B, C, or D)
            },
            "changes": "string" // Brief explanation of what was changed and why
        }
        
        CRITICAL CONSTRAINT: The rewritten question MUST maintain the same question TYPE.
        - If this is a True/False question (only A=TRUE, B=FALSE options), the rewrite MUST also be True/False.
        - If this is a Multiple Choice question (A, B, C, D options), the rewrite MUST also have 4 options.
        - DO NOT convert True/False questions to Multiple Choice or vice versa.
        
        IMPORTANT: Both "score" AND "improvedScore" are REQUIRED. The improvedScore should reflect the quality of your rewritten version.

        Question Type: ${type}
        Question: ${sanitizedQuestion}
        Options: ${JSON.stringify(sanitizedOptions)}
        Correct: ${sanitizedCorrect}`;

      // Model fallback list: prioritized by quota; gemini-1.5/2.0 retired
      const modelFallbacks = [
        model, // User-specified or default (gemini-2.5-flash)
        "gemini-2.5-flash-lite", // huge quota, cheapest
        "gemini-2.5-flash", // good balance
        "gemini-2.5-pro", // slower but more capable
      ];

      let response;
      let lastError;
      let usedModel = model;

      // Try each model in order until one works
      for (const fallbackModel of modelFallbacks) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`;

          response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userPrompt }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
              },
            }),
          });

          if (response.ok) {
            usedModel = fallbackModel;
            console.log(`✅ Successfully used model: ${fallbackModel}`);
            break; // Success! Exit the loop
          }

          // If 404, try next model
          if (response.status === 404) {
            console.log(`⚠️ Model ${fallbackModel} not found, trying next...`);
            lastError = new Error(`Model ${fallbackModel} not found (404)`);
            continue;
          }

          // For other errors, throw immediately
          throw new Error(`API error: ${response.statusText}`);
        } catch (error) {
          lastError = error;
          console.error(`❌ Error with model ${fallbackModel}:`, error.message);
          // Continue to next model
        }
      }

      // If all models failed, throw the last error
      if (!response || !response.ok) {
        throw lastError || new Error("All model fallbacks failed");
      }

      const responseData = await response.json();
      const rawText =
        responseData.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Parse JSON response
      let result;
      try {
        const cleanJson = rawText.replace(/```json\n?|\n?```/g, "").trim();
        result = JSON.parse(cleanJson);
      } catch {
        // Fallback: extract score if JSON parsing fails
        // Try multiple patterns to extract score (Robust Fallback)
        let score = null;
        const patterns = [
          /SCORE:\s{0,5}(\d+)/i, // SCORE: 75 (limited whitespace)
          /"score"\s{0,3}:\s{0,3}(\d+)/i, // "score": 75
          /\bscore\s{0,3}[:=]\s{0,3}(\d+)/i, // score: 75, score = 75 (no backtracking)
          /(\d{1,3})\/100/i, // 75/100
          /^(\d{1,3})(?!\d)/m, // Just a number at start of line (0-999)
        ];

        for (const pattern of patterns) {
          const match = rawText.match(pattern);
          if (match) {
            const parsed = parseInt(match[1]);
            if (parsed >= 0 && parsed <= 100) {
              score = parsed;
              break;
            }
          }
        }

        result = {
          score: score !== null ? score : 0, // Default to 0 to signal failure/review needed
          critique: rawText,
          rewrite: null,
          changes: null,
        };
      }

      // Log usage (fire-and-forget — don't block return)
      logApiUsage(userId, {
        model: usedModel,
        type: "critique",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      }).catch((err) => console.warn("[logApiUsage] failed:", err.message));

      return {
        success: true,
        score: result.score,
        improvedScore: result.improvedScore || null,
        text: result.critique || result.text,
        rewrite: result.rewrite,
        changes: result.changes,
      };
    } catch (error) {
      console.error("Error in generateCritique:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate critique: ${error.message}`
      );
    }
  });
