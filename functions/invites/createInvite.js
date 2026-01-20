const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const { isAdminUser } = require("../utils/isAdminUser");

/**
 * Cloud Function: createInvite
 * Creates a new invite code (ADMIN ONLY)
 * Supports email-specific invites and tool-specific permissions
 */
exports.createInvite = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    // 1. ADMIN CHECK
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    const isAdmin = await isAdminUser(context.auth.uid);
    // Explicitly allow owner
    const isOwner =
      context.auth.token.email === "samdeiter@gmail.com" ||
      context.auth.token.email === "samdeiter@epicgames.com";

    if (!isAdmin && !isOwner) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required",
      );
    }

    const {
      maxUses = 1,
      expiresInDays = 7,
      role = "reviewer",
      note = "",
      forEmail = null,
      tools = ["questions"], // Default to just Question Generator access
    } = data;
    const db = admin.firestore();

    try {
      // 2. Validate and sanitize email if provided
      let sanitizedEmail = null;
      if (forEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(forEmail)) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Invalid email address format",
          );
        }
        sanitizedEmail = forEmail.toLowerCase().trim();
      }

      // 3. Validate tools array
      if (!Array.isArray(tools)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "tools must be an array",
        );
      }

      // 4. Generate cryptographically secure code
      const code = crypto
        .randomBytes(9)
        .toString("base64")
        .replace(/[^A-Za-z0-9]/g, "")
        .substring(0, 12)
        .toUpperCase();

      // 5. Calculate expiration (max 30 days)
      const expiresAt = new Date();
      expiresAt.setDate(
        expiresAt.getDate() + Math.min(Math.max(expiresInDays, 1), 30),
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
        role: ["admin", "reviewer"].includes(role) ? role : "reviewer",
        isActive: true,
        note: (note || "").substring(0, 200),
        forEmail: sanitizedEmail,
        tools: tools, // Store granted tools in the invite
      };

      await db.collection("invites").doc(code).set(inviteData);

      console.log(
        `Invite ${code} created by ${context.auth.token.email} with tools: ${tools.join(", ")}`,
      );

      // 6. Build invite URL
      const inviteUrl = `https://samdeiter.github.io/UE5QuestionGenerator/?invite=${code}${sanitizedEmail ? `&email=${encodeURIComponent(sanitizedEmail)}` : ""}`;

      return {
        success: true,
        code,
        inviteUrl,
        expiresAt: expiresAt.toISOString(),
        maxUses: inviteData.maxUses,
        forEmail: sanitizedEmail,
        tools: tools,
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error("Error creating invite:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to create invite",
      );
    }
  });
