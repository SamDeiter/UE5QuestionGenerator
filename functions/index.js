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
      model = "gemini-2.0-flash",
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
    const { question, options, correct, modeLabel } = data;

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
        } catch (configError) {
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
            "score": number, // 0-100 (Integer only) - Use the FULL range appropriately
            "critique": "string", // Detailed feedback with specific suggestions
            "rewrite": {
                "question": "string", // Improved question text
                "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
                "correct": "string" // Correct letter (A, B, C, or D)
            },
            "changes": "string" // Brief explanation of what was changed and why
        }

        Question: ${question}
        Options: ${JSON.stringify(options)}
        Correct: ${correct}`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
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

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
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
        model: "gemini-2.0-flash-exp",
        type: "critique",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        score: result.score,
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
    // Use a hash of the request IP or a session identifier
    const clientId =
      context.rawRequest?.ip ||
      context.rawRequest?.headers?.["x-forwarded-for"] ||
      "unknown";
    const rateLimitRef = db
      .collection("inviteAttempts")
      .doc(clientId.replace(/[^a-zA-Z0-9]/g, "_"));

    try {
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

    const { maxUses = 1, expiresInDays = 7, role = "user", note = "" } = data;
    const db = admin.firestore();

    try {
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
        role: role === "admin" ? "admin" : "user",
        isActive: true,
        note: (note || "").substring(0, 200), // Limit note length
      };

      await db.collection("invites").doc(code).set(inviteData);

      console.log(`Invite ${code} created by ${context.auth.token.email}`);

      return {
        success: true,
        code,
        inviteUrl: `https://samdeiter.github.io/UE5QuestionGenerator/?invite=${code}`,
        expiresAt: expiresAt.toISOString(),
        maxUses: inviteData.maxUses,
      };
    } catch (error) {
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
      "sam.deiter@epicgames.com",
      "samdeiter@gmail.com",
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
