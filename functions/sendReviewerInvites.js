// ============================================================================
// EMAIL SENDING - SendGrid Integration
// ============================================================================

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

/**
 * Helper: Check if user is admin
 * (duplicated from main index.js to make this module independent)
 */
async function isAdminUser(uid) {
  try {
    const db = admin.firestore();
    const adminDoc = await db.collection("admins").doc(uid).get();

    if (adminDoc.exists) {
      return true;
    }

    // Also check Super Admin email
    const userRecord = await admin.auth().getUser(uid);
    const userEmail = userRecord.email?.toLowerCase().trim();
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "")
      .toLowerCase()
      .trim();

    if (userEmail && superAdminEmail && userEmail === superAdminEmail) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * Cloud Function: sendReviewerInvites
 * Sends personalized invite emails to reviewers via SendGrid
 * ADMIN ONLY
 */
exports.sendReviewerInvites = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
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

    // Get SendGrid API key from Firebase config
    const apiKey = functions.config().sendgrid?.api_key;
    if (!apiKey) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "SendGrid API key not configured"
      );
    }

    sgMail.setApiKey(apiKey);

    const { invites } = data;

    if (!invites || !Array.isArray(invites) || invites.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invites array is required"
      );
    }

    console.log(`📧 Sending ${invites.length} invite emails...`);

    const results = {
      sent: [],
      failed: [],
    };

    // Send emails sequentially to avoid rate limits
    for (const invite of invites) {
      try {
        const { email, inviteUrl, code, note } = invite;

        if (!email || !inviteUrl) {
          results.failed.push({
            email: email || "unknown",
            error: "Missing required fields",
          });
          continue;
        }

        // Extract reviewer name from note (e.g., "Targeted REVIEWER invite for John Doe")
        const reviewerName =
          note?.match(/for (.+)$/)?.[1] || email.split("@")[0];

        const msg = {
          to: email,
          from: "samdeiter@gmail.com", // Must be verified sender in SendGrid
          subject: "Invitation: UE5 Question Generator Reviewer Access",
          html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #667eea; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .doc-button { display: inline-block; background: #10b981; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
    .checklist { background: white; padding: 20px; border-radius: 6px; border-left: 4px solid #667eea; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
    code { background: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">🎮 UE5 Question Generator</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Reviewer Access Invitation</p>
  </div>
  
  <div class="content">
    <p>Hi <strong>${reviewerName}</strong>,</p>
    
    <p>You've been invited to join the <strong>UE5 Question Generator</strong> as a Reviewer!</p>
    
    <h3>🔗 Your Personalized Invite Link</h3>
    <p>Click the button below to get started:</p>
    
    <center>
      <a href="${inviteUrl}" class="button">Accept Invitation</a>
    </center>
    
    <p style="font-size: 12px; color: #666;">Or copy this link: <code>${inviteUrl}</code></p>
    
    <p>This link is personalized for <strong>${email}</strong> and will expire in <strong>30 days</strong>.</p>
    
    <h3>📚 How It Works</h3>
    <p>For a complete guide on how to review questions, please read the documentation:</p>
    <center>
      <a href="https://epicgames.box.com/s/5pm328c5svam08ae0xmqmjmk87qsmevy" class="doc-button">📄 View Documentation PDF</a>
    </center>
    
    <h3>📋 What We Need From You</h3>
    <ul>
      <li><strong>Time commitment</strong>: Approximately 2-3 hours per week</li>
      <li><strong>Focus areas</strong>: Unreal Engine 5 (Blueprints, C++, Lighting, Materials, etc.)</li>
      <li><strong>Target</strong>: Review 20-30 questions per week</li>
    </ul>
    
    <div class="checklist">
      <h3 style="margin-top: 0;">✅ Before You Start</h3>
      <ul style="list-style: none; padding: 0;">
        <li>✅ Use <strong>Chrome or Edge</strong> (latest version)</li>
        <li>✅ Have your <strong>Google account</strong> ready for sign-in</li>
        <li>✅ Ensure <strong>stable internet connection</strong></li>
        <li>✅ Built-in <strong>tutorial</strong> will guide you through the app</li>
      </ul>
    </div>
    
    <h3>💬 Need Help?</h3>
    <p>Contact: <a href="mailto:sam.deiter@epicgames.com">sam.deiter@epicgames.com</a></p>
  </div>
  
  <div class="footer">
    <p>This invite link is unique to you. Please do not share it with others.</p>
    <p>Invite Code: <code>${code}</code></p>
  </div>
</body>
</html>
          `,
        };

        await sgMail.send(msg);
        results.sent.push(email);
        console.log(`✅ Sent to ${email}`);

        // Small delay to avoid rate limits (SendGrid allows ~600/min on free tier)
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Failed to send to ${invite.email}:`, error);
        results.failed.push({
          email: invite.email,
          error: error.message || "Unknown error",
        });
      }
    }

    console.log(
      `📊 Email sending complete: ${results.sent.length} sent, ${results.failed.length} failed`
    );

    return {
      success: true,
      sent: results.sent,
      failed: results.failed,
      total: invites.length,
    };
  });
