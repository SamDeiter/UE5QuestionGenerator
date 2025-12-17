const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Load environment variables from .env file (for local development)
require("dotenv").config();

admin.initializeApp();

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

    // 4. Rate limiting check
    const rateLimitCheck = await checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. ${rateLimitCheck.message}`
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
      options,
      correct,
      type = "Multiple Choice", // Question type: "True/False" or "Multiple Choice"
      modeLabel,
      model = "gemini-2.0-flash",
    } = data;

    // Input validation
    if (!question || !options || !correct) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "question, options, and correct are required."
      );
    }

    // Rate limiting
    const rateLimitCheck = await checkRateLimit(userId, "critique");
    if (!rateLimitCheck.allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. ${rateLimitCheck.message}`
      );
    }

    try {
      let apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        try {
          apiKey = functions.config().gemini?.api_key;
        } catch {
          // Ignore functions.config() errors
        }
      }

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
        Question: ${question}
        Options: ${JSON.stringify(options)}
        Correct: ${correct}`;

      // Model fallback list: ALL available text-out models prioritized by quota
      const modelFallbacks = [
        model, // User-specified or default (gemini-2.0-flash)
        "gemini-2.0-flash-lite", // 0/4K RPM - huge quota
        "gemini-2.5-flash-lite", // 0/4K RPM - huge quota
        "gemini-2.5-flash", // 0/1K RPM - good quota
        "gemini-2.0-flash-exp", // 8/10 RPM - backup when rate limited
        "gemini-2.5-pro", // 0/150 RPM - slower but available
        "gemini-3-pro", // 0/25 RPM - last resort
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
          /SCORE:\s*(\d+)/i, // SCORE: 75
          /"score"\s*:\s*(\d+)/i, // "score": 75
          /\bscore\s*[:\-=]\s*(\d+)/i, // score: 75, score = 75
          /(\d+)\s*\/\s*100/i, // 75/100
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

      // Log usage
      await logApiUsage(userId, {
        model: usedModel,

        type: "critique",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

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

/**
 * Rate limiting helper
 * Checks if user has exceeded rate limits
 */
async function checkRateLimit(userId, type = "generation") {
  const db = admin.firestore();
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;

  // Get user's recent API calls
  const recentCalls = await db
    .collection("apiUsage")
    .where("userId", "==", userId)
    .where("timestamp", ">", new Date(oneMinuteAgo))
    .get();

  const callCount = recentCalls.size;

  // Rate limits (adjust as needed)
  const RATE_LIMITS = {
    generation: 10, // 10 requests per minute
    critique: 20, // 20 critiques per minute
  };

  const limit = RATE_LIMITS[type] || 10;

  if (callCount >= limit) {
    return {
      allowed: false,
      message: `You can make ${limit} ${type} requests per minute. Please wait.`,
    };
  }

  return { allowed: true };
}

/**
 * Log API usage for rate limiting and analytics
 */
async function logApiUsage(userId, data) {
  const db = admin.firestore();
  await db.collection("apiUsage").add({
    userId,
    ...data,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function extractGroundingSources(responseData) {
  const groundingMetadata = responseData.candidates?.[0]?.groundingMetadata;
  const sources = [];

  if (groundingMetadata?.groundingChunks) {
    groundingMetadata.groundingChunks.forEach((chunk) => {
      if (chunk.web?.uri && chunk.web?.title) {
        const url = chunk.web.uri.toLowerCase();

        // Only accept Epic Games documentation
        if (url.includes("dev.epicgames.com/documentation")) {
          sources.push({
            url: chunk.web.uri,
            title: chunk.web.title,
          });
        }
      }
    });
  }

  return sources;
}

// ============================================================================
// INVITE SYSTEM - Secure Registration with Invite Codes
// ============================================================================

const crypto = require("crypto");

/**
 * Check if a user is an admin (from Firestore admins collection)
 * @param {string} uid - User ID
 * @returns {Promise<boolean>}
 */
async function isAdminUser(uid) {
  if (!uid) return false;
  try {
    const adminDoc = await admin
      .firestore()
      .collection("admins")
      .doc(uid)
      .get();
    return adminDoc.exists && adminDoc.data()?.isAdmin === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * Cloud Function: validateInvite
 * Validates an invite code server-side with rate limiting
 * Does NOT require authentication (pre-signup validation)
 */
exports.validateInvite = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    const { code } = data;
    const db = admin.firestore();

    // === INPUT SANITIZATION ===
    if (!code || typeof code !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invite code is required"
      );
    }

    // Sanitize: alphanumeric only, max 16 chars
    const sanitizedCode = code
      .replace(/[^A-Za-z0-9]/g, "")
      .substring(0, 16)
      .toUpperCase();

    if (sanitizedCode.length < 8) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid invite code format"
      );
    }

    // === RATE LIMITING ===
    // TESTING: Set to true to enable rate limiting
    const ENABLE_RATE_LIMIT = false;

    // Use a hash of the request IP or a session identifier
    const clientId =
      context.rawRequest?.ip ||
      context.rawRequest?.headers?.["x-forwarded-for"] ||
      "unknown";
    const rateLimitRef = db
      .collection("inviteAttempts")
      .doc(clientId.replace(/[^a-zA-Z0-9]/g, "_"));

    try {
      if (ENABLE_RATE_LIMIT) {
        const rateLimitDoc = await rateLimitRef.get();

        if (rateLimitDoc.exists) {
          const rateData = rateLimitDoc.data();

          // Check if locked out
          if (
            rateData.lockedUntil &&
            rateData.lockedUntil.toDate() > new Date()
          ) {
            const remainingMins = Math.ceil(
              (rateData.lockedUntil.toDate() - new Date()) / 60000
            );
            throw new functions.https.HttpsError(
              "resource-exhausted",
              `Too many failed attempts. Try again in ${remainingMins} minutes.`
            );
          }

          // Check if too many recent attempts
          if (rateData.attempts >= 5) {
            // Lock for 1 hour
            await rateLimitRef.update({
              lockedUntil: admin.firestore.Timestamp.fromDate(
                new Date(Date.now() + 60 * 60 * 1000)
              ),
            });
            throw new functions.https.HttpsError(
              "resource-exhausted",
              "Too many failed attempts. Locked for 1 hour."
            );
          }
        }
      }

      // === VALIDATE INVITE CODE ===
      const inviteRef = db.collection("invites").doc(sanitizedCode);
      const inviteDoc = await inviteRef.get();

      if (!inviteDoc.exists) {
        // Increment failed attempts
        await rateLimitRef.set(
          {
            attempts: admin.firestore.FieldValue.increment(1),
            lastAttempt: admin.firestore.Timestamp.now(),
          },
          { merge: true }
        );
        throw new functions.https.HttpsError(
          "not-found",
          "Invalid invite code"
        );
      }

      const invite = inviteDoc.data();

      // Check if active
      if (!invite.isActive) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "This invite has been revoked"
        );
      }

      // Check expiration
      if (invite.expiresAt && invite.expiresAt.toDate() < new Date()) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "This invite has expired"
        );
      }

      // Check usage limit
      if (invite.maxUses !== -1 && invite.currentUses >= invite.maxUses) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "This invite has reached its usage limit"
        );
      }

      // === SUCCESS - Clear rate limit ===
      await rateLimitRef.delete();

      return {
        valid: true,
        role: invite.role || "user",
        expiresAt: invite.expiresAt
          ? invite.expiresAt.toDate().toISOString()
          : null,
        remainingUses:
          invite.maxUses === -1
            ? "unlimited"
            : invite.maxUses - invite.currentUses,
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error("Error validating invite:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to validate invite"
      );
    }
  });

/**
 * Cloud Function: consumeInvite
 * Marks an invite as used after successful authentication
 * REQUIRES authentication
 */
exports.consumeInvite = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    // MUST be authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in to use invite"
      );
    }

    const { code } = data;
    const userEmail = context.auth.token.email;
    const userId = context.auth.uid;
    const db = admin.firestore();

    // Sanitize code
    const sanitizedCode = (code || "")
      .replace(/[^A-Za-z0-9]/g, "")
      .substring(0, 16)
      .toUpperCase();

    if (!sanitizedCode) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invite code is required"
      );
    }

    try {
      const inviteRef = db.collection("invites").doc(sanitizedCode);
      const inviteDoc = await inviteRef.get();

      if (!inviteDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Invalid invite code"
        );
      }

      const invite = inviteDoc.data();

      // Check if already used by this user
      const alreadyUsed = invite.usedBy?.some(
        (u) => u.email === userEmail || u.uid === userId
      );
      if (alreadyUsed) {
        return { success: true, alreadyUsed: true, role: invite.role };
      }

      // NEW: Validate email if this is an email-specific invite
      if (invite.forEmail) {
        const normalizedUserEmail = userEmail.toLowerCase().trim();
        const normalizedInviteEmail = invite.forEmail.toLowerCase().trim();

        if (normalizedUserEmail !== normalizedInviteEmail) {
          throw new functions.https.HttpsError(
            "permission-denied",
            `This invite is for ${invite.forEmail} only. You are signed in as ${userEmail}.`
          );
        }
      }

      // Validate invite is still valid
      if (!invite.isActive) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Invite has been revoked"
        );
      }
      if (invite.expiresAt && invite.expiresAt.toDate() < new Date()) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Invite has expired"
        );
      }
      if (invite.maxUses !== -1 && invite.currentUses >= invite.maxUses) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Invite limit reached"
        );
      }

      // Update invite usage
      await inviteRef.update({
        currentUses: admin.firestore.FieldValue.increment(1),
        usedBy: admin.firestore.FieldValue.arrayUnion({
          email: userEmail,
          uid: userId,
          usedAt: admin.firestore.Timestamp.now(),
        }),
      });

      // Mark user as registered (for future access checks)
      await db
        .collection("registeredUsers")
        .doc(userId)
        .set(
          {
            email: userEmail,
            uid: userId,
            inviteCode: sanitizedCode,
            role: invite.role || "user",
            registeredAt: admin.firestore.Timestamp.now(),
          },
          { merge: true }
        );

      console.log(`Invite ${sanitizedCode} consumed by ${userEmail}`);

      return { success: true, role: invite.role || "user" };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error("Error consuming invite:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to consume invite"
      );
    }
  });

/**
 * Cloud Function: createInvite
 * Creates a new invite code (ADMIN ONLY)
 * Supports email-specific invites for targeted registration
 */
exports.createInvite = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    // ADMIN CHECK
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in"
      );
    }

    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required"
      );
    }

    const {
      maxUses = 1,
      expiresInDays = 7,
      role = "user",
      note = "",
      forEmail = null, // NEW: Optional email address for targeted invite
    } = data;
    const db = admin.firestore();

    try {
      // Validate and sanitize email if provided
      let sanitizedEmail = null;
      if (forEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(forEmail)) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Invalid email address format"
          );
        }
        sanitizedEmail = forEmail.toLowerCase().trim();
      }

      // Generate cryptographically secure code
      const code = crypto
        .randomBytes(9)
        .toString("base64")
        .replace(/[^A-Za-z0-9]/g, "")
        .substring(0, 12)
        .toUpperCase();

      // Calculate expiration (max 30 days)
      const expiresAt = new Date();
      expiresAt.setDate(
        expiresAt.getDate() + Math.min(Math.max(expiresInDays, 1), 30)
      );

      const inviteData = {
        code,
        createdBy: context.auth.uid,
        createdByEmail: context.auth.token.email,
        createdAt: admin.firestore.Timestamp.now(),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        maxUses: maxUses === -1 ? -1 : Math.max(1, maxUses),
        currentUses: 0,
        usedBy: [],
        role: ["admin", "reviewer"].includes(role) ? role : "user",
        isActive: true,
        note: (note || "").substring(0, 200), // Limit note length
        forEmail: sanitizedEmail, // NEW: Store the target email
      };

      await db.collection("invites").doc(code).set(inviteData);

      console.log(
        `Invite ${code} created by ${context.auth.token.email}${
          sanitizedEmail ? ` for ${sanitizedEmail}` : ""
        }`
      );

      // Build invite URL with optional email parameter
      let inviteUrl = `https://samdeiter.github.io/UE5QuestionGenerator/?invite=${code}`;
      if (sanitizedEmail) {
        inviteUrl += `&email=${encodeURIComponent(sanitizedEmail)}`;
      }

      return {
        success: true,
        code,
        inviteUrl,
        expiresAt: expiresAt.toISOString(),
        maxUses: inviteData.maxUses,
        forEmail: sanitizedEmail, // Return the email so UI can display it
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error("Error creating invite:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to create invite"
      );
    }
  });

/**
 * Cloud Function: revokeInvite
 * Revokes an existing invite code (ADMIN ONLY)
 */
exports.revokeInvite = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    // ADMIN CHECK
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in"
      );
    }

    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required"
      );
    }

    const { code } = data;
    const db = admin.firestore();

    const sanitizedCode = (code || "")
      .replace(/[^A-Za-z0-9]/g, "")
      .substring(0, 16)
      .toUpperCase();

    if (!sanitizedCode) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invite code is required"
      );
    }

    try {
      const inviteRef = db.collection("invites").doc(sanitizedCode);
      const inviteDoc = await inviteRef.get();

      if (!inviteDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Invite not found");
      }

      await inviteRef.update({
        isActive: false,
        revokedAt: admin.firestore.Timestamp.now(),
        revokedBy: context.auth.uid,
      });

      console.log(
        `Invite ${sanitizedCode} revoked by ${context.auth.token.email}`
      );

      return { success: true };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error("Error revoking invite:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to revoke invite"
      );
    }
  });

/**
 * Cloud Function: checkUserRegistration
 * Checks if a user is registered (has used a valid invite)
 */
exports.checkUserRegistration = functions
  .runWith({ timeoutSeconds: 15, memory: "128MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      return { registered: false };
    }

    const db = admin.firestore();
    const userId = context.auth.uid;

    try {
      const userDoc = await db.collection("registeredUsers").doc(userId).get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        return {
          registered: true,
          role: userData.role || "user",
          registeredAt: userData.registeredAt?.toDate()?.toISOString(),
        };
      }

      // Also check if user is an admin (admins don't need invites)
      const isAdmin = await isAdminUser(userId);
      if (isAdmin) {
        return { registered: true, role: "admin" };
      }

      return { registered: false };
    } catch (error) {
      console.error("Error checking registration:", error);
      return { registered: false };
    }
  });

/**
 * Cloud Function: setupInitialAdmin
 * One-time setup function to add initial admin user
 * Can only be called by the specified email
 */
exports.setupInitialAdmin = functions
  .runWith({ timeoutSeconds: 30, memory: "128MB" })
  .https.onCall(async (data, context) => {
    // Must be authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in"
      );
    }

    const userEmail = context.auth.token.email;
    const userId = context.auth.uid;
    const db = admin.firestore();

    // Only allow specific emails to become initial admin
    const ALLOWED_INITIAL_ADMINS = [
      process.env.SUPER_ADMIN_EMAIL || "",
      // [personal email] removed - regular user (non-admin)
    ];

    if (!ALLOWED_INITIAL_ADMINS.includes(userEmail.toLowerCase())) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not authorized for initial admin setup"
      );
    }

    try {
      // Add to admins collection
      await db.collection("admins").doc(userId).set({
        email: userEmail,
        isAdmin: true,
        createdAt: admin.firestore.Timestamp.now(),
        createdBy: "setupInitialAdmin",
      });

      // Add to registeredUsers collection
      await db.collection("registeredUsers").doc(userId).set(
        {
          email: userEmail,
          uid: userId,
          role: "admin",
          registeredAt: admin.firestore.Timestamp.now(),
          inviteCode: "INITIAL_ADMIN_SETUP",
        },
        { merge: true }
      );

      console.log(`Initial admin setup complete for ${userEmail}`);

      return {
        success: true,
        message: `${userEmail} is now an admin`,
        role: "admin",
      };
    } catch (error) {
      console.error("Error in setupInitialAdmin:", error);
      throw new functions.https.HttpsError("internal", "Failed to setup admin");
    }
  });

/**
 * Cloud Function: importAIScores
 * Bulk import AI quality scores (ADMIN ONLY)
 */
exports.importAIScores = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" }) // 9 minute timeout for large imports
  .https.onCall(async (data, context) => {
    // ADMIN CHECK
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in"
      );
    }

    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required to import scores"
      );
    }

    const { scores } = data;

    if (!scores || !Array.isArray(scores)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Scores must be an array"
      );
    }

    const db = admin.firestore();
    const timestamp = admin.firestore.Timestamp.now();

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    try {
      // Process in chunks of 500 (Firestore batch limit)
      for (let i = 0; i < scores.length; i += 500) {
        const chunk = scores.slice(i, i + 500);
        const batchOp = db.batch();

        for (const entry of chunk) {
          try {
            const questionTimestampId = Number(entry.id);
            const score = entry.originalScore;

            // Query for the question by its id field (not Firestore doc ID)
            const querySnapshot = await db
              .collection("questions")
              .where("id", "==", questionTimestampId)
              .limit(1)
              .get();

            if (!querySnapshot.empty) {
              const docRef = querySnapshot.docs[0].ref;
              batchOp.update(docRef, {
                aiScore: score,
                scoredAt: timestamp,
                scoreSource: "Strict_AI_Batch_Import",
              });
              updated++;
            } else {
              notFound++;
            }
          } catch (err) {
            console.error(`Error preparing update for ${entry.id}:`, err);
            errors++;
          }
        }

        // Commit this batch
        await batchOp.commit();
        console.log(
          `Imported batch ${Math.floor(i / 500) + 1}/${Math.ceil(
            scores.length / 500
          )}`
        );
      }

      return {
        success: true,
        updated,
        notFound,
        errors,
        total: scores.length,
      };
    } catch (error) {
      console.error("Error importing scores:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to import scores: ${error.message}`
      );
    }
  });

// ============================================================================
// USER MANAGEMENT - Admin Only Functions
// ============================================================================

/**
 * Cloud Function: listRegisteredUsers
 * Returns list of all registered users (ADMIN ONLY)
 */
exports.listRegisteredUsers = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    // ADMIN CHECK
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in"
      );
    }

    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required"
      );
    }

    const db = admin.firestore();

    try {
      const usersSnapshot = await db
        .collection("registeredUsers")
        .orderBy("registeredAt", "desc")
        .limit(100) // Safety limit
        .get();

      const users = usersSnapshot.docs.map((doc) => doc.data());

      return { users };
    } catch (error) {
      console.error("Error listing users:", error);
      throw new functions.https.HttpsError("internal", "Failed to list users");
    }
  });

/**
 * Cloud Function: listInvites
 * Returns list of all invites (ADMIN ONLY)
 */
exports.listInvites = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    // ADMIN CHECK
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in"
      );
    }

    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required"
      );
    }

    const db = admin.firestore();

    try {
      // Get active invites (simplified query to avoid composite index)
      const invitesSnapshot = await db
        .collection("invites")
        .where("isActive", "==", true)
        .limit(100)
        .get();

      // Sort in memory instead of using Firestore orderBy (avoids composite index)
      const invites = invitesSnapshot.docs
        .map((doc) => doc.data())
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return bTime - aTime; // Descending order (newest first)
        });

      return { invites };
    } catch (error) {
      console.error("Error listing invites:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to list invites"
      );
    }
  });

/**
 * Cloud Function: changeUserRole
 * Changes a user's role (ADMIN ONLY)
 */
exports.changeUserRole = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    // ADMIN CHECK
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in"
      );
    }

    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required"
      );
    }

    const { userId, role } = data;
    if (!userId || !role) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "User ID and Role are required"
      );
    }

    if (!["user", "admin", "reviewer"].includes(role)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid role");
    }

    // Prevent changing own role (safety check)
    if (userId === context.auth.uid) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Cannot change your own role"
      );
    }

    const db = admin.firestore();

    try {
      // Update registeredUsers collection
      await db.collection("registeredUsers").doc(userId).update({
        role: role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.uid,
      });

      // Update admins collection
      if (role === "admin") {
        await db.collection("admins").doc(userId).set(
          {
            email: "unknown", // We might need to fetch this if critical, but usually ID is enough
            isAdmin: true,
            promotedAt: admin.firestore.FieldValue.serverTimestamp(),
            promotedBy: context.auth.uid,
          },
          { merge: true }
        );
      } else {
        // Demote
        await db.collection("admins").doc(userId).delete();
      }

      console.log(
        `User ${userId} role changed to ${role} by ${context.auth.uid}`
      );

      return { success: true };
    } catch (error) {
      console.error("Error changing user role:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to change user role"
      );
    }
  });

/**
 * Cloud Function: revokeUserAccess
 * Revokes a user's access (ADMIN ONLY)
 */
exports.revokeUserAccess = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    // ADMIN CHECK
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in"
      );
    }

    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required"
      );
    }

    const { userId } = data;
    if (!userId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "User ID is required"
      );
    }

    if (userId === context.auth.uid) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Cannot revoke your own access"
      );
    }

    const db = admin.firestore();

    try {
      // 1. Disable in Firebase Auth
      await admin.auth().updateUser(userId, {
        disabled: true,
      });

      // 2. Remove from admins if present
      await db.collection("admins").doc(userId).delete();

      // 3. DELETE from registeredUsers (permanently remove)
      await db.collection("registeredUsers").doc(userId).delete();

      // 4. Revoke refresh tokens
      await admin.auth().revokeRefreshTokens(userId);

      console.log(
        `User ${userId} access revoked and deleted by ${context.auth.uid}`
      );

      return { success: true };
    } catch (error) {
      console.error("Error revoking user access:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to revoke user access"
      );
    }
  });

// ============================================================================
// TRANSLATION MIGRATION - Link Existing Translations with Originals
// ============================================================================

/**
 * Cloud Function: migrateTranslations
 * Links existing translated questions with their English originals via uniqueId
 * Uses Firebase Admin SDK for efficient bulk operations
 * SUPER ADMIN ONLY
 */
exports.migrateTranslations = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" }) // 9 minutes max
  .https.onCall(async (data, context) => {
    // SUPER ADMIN CHECK
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in"
      );
    }

    const isSuperAdmin = await isAdminUser(context.auth.uid);
    if (!isSuperAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only super admins can run migrations"
      );
    }

    console.log(
      `🔄 Translation migration started by ${context.auth.uid} (${context.auth.token.email})`
    );

    try {
      const db = admin.firestore();
      const questionsRef = db.collection("questions");

      // 1. Fetch all questions
      const snapshot = await questionsRef.get();
      const allQuestions = snapshot.docs.map((doc) => ({
        firestoreId: doc.id,
        ...doc.data(),
      }));

      console.log(`📊 Found ${allQuestions.length} total questions`);

      // 2. Find all translations (non-English questions)
      const translations = allQuestions.filter(
        (q) => q.language && q.language !== "English"
      );

      console.log(`🌍 Found ${translations.length} translated questions`);

      let fixedCount = 0;
      let alreadyLinkedCount = 0;
      let orphanedCount = 0;
      const batch = db.batch();
      let batchCount = 0;

      // 3. Process each translation
      for (const translation of translations) {
        // Skip if already has a uniqueId (already linked)
        if (translation.uniqueId) {
          alreadyLinkedCount++;

          // Verify English original exists
          const englishOriginal = allQuestions.find(
            (q) =>
              q.uniqueId === translation.uniqueId &&
              (q.language === "English" || !q.language)
          );

          if (!englishOriginal) {
            console.warn(
              `⚠️ Orphaned translation (has uniqueId but no English original):`,
              {
                id: translation.id,
                uniqueId: translation.uniqueId,
                language: translation.language,
              }
            );
            orphanedCount++;
          }
          continue;
        }

        // Find English original by matching key attributes
        const englishOriginal = allQuestions.find(
          (q) =>
            (q.language === "English" || !q.language) &&
            q.discipline === translation.discipline &&
            q.type === translation.type &&
            q.difficulty === translation.difficulty &&
            q.correct === translation.correct
        );

        if (englishOriginal) {
          // Generate or use existing uniqueId
          const sharedUniqueId =
            englishOriginal.uniqueId || crypto.randomUUID();

          console.log(`🔗 Linking translation to original:`, {
            originalId: englishOriginal.id,
            translationId: translation.id,
            translationLanguage: translation.language,
            sharedUniqueId,
          });

          // Update English original if it doesn't have uniqueId
          if (!englishOriginal.uniqueId) {
            const englishRef = questionsRef.doc(englishOriginal.firestoreId);
            batch.update(englishRef, {
              uniqueId: sharedUniqueId,
              language: "English", // Ensure language is set
            });
            batchCount++;
          }

          // Update translation with uniqueId
          const translationRef = questionsRef.doc(translation.firestoreId);
          batch.update(translationRef, {
            uniqueId: sharedUniqueId,
          });
          batchCount++;

          fixedCount++;

          // Firestore batch limit is 500 operations
          if (batchCount >= 450) {
            console.log(`📦 Committing batch of ${batchCount} updates...`);
            await batch.commit();
            batchCount = 0;
          }
        } else {
          console.warn(`⚠️ No English original found for translation:`, {
            id: translation.id,
            language: translation.language,
            discipline: translation.discipline,
          });
          orphanedCount++;
        }
      }

      // Commit remaining batch
      if (batchCount > 0) {
        console.log(`📦 Committing final batch of ${batchCount} updates...`);
        await batch.commit();
      }

      const stats = {
        totalQuestions: allQuestions.length,
        totalTranslations: translations.length,
        alreadyLinked: alreadyLinkedCount,
        newlyLinked: fixedCount,
        orphaned: orphanedCount,
      };

      console.log("✅ Migration complete!", stats);

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error("❌ Migration failed:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Migration failed: ${error.message}`
      );
    }
  });
