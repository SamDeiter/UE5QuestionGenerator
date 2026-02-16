const admin = require("firebase-admin");

// Load environment variables from .env file (for local development)
require("dotenv").config();

admin.initializeApp();

// ============================================================================
// AI Functions
// ============================================================================
Object.assign(exports, require("./ai/generateQuestions"));
Object.assign(exports, require("./ai/generateCritique"));
// NOTE: Uncomment when PORTKEY_API_KEY and PORTKEY_VIRTUAL_KEY secrets are set
// Object.assign(exports, require("./ai/portkeyProxy"));

// ============================================================================
// Invite Functions
// ============================================================================
Object.assign(exports, require("./invites/validateInvite"));
Object.assign(exports, require("./invites/consumeInvite"));
Object.assign(exports, require("./invites/createInvite"));
Object.assign(exports, require("./invites/revokeInvite"));

// ============================================================================
// User Management Functions
// ============================================================================
Object.assign(exports, require("./users/listRegisteredUsers"));
Object.assign(exports, require("./users/changeUserRole"));
Object.assign(exports, require("./users/revokeUserAccess"));
Object.assign(exports, require("./users/checkUserRegistration"));
Object.assign(exports, require("./users/setupInitialAdmin"));
Object.assign(exports, require("./users/checkToolAccess"));
Object.assign(exports, require("./users/logAuthFailure"));

// ============================================================================
// Migration Functions
// ============================================================================
Object.assign(exports, require("./migrations/migrateTranslations"));
Object.assign(exports, require("./migrations/importAIScores"));
Object.assign(exports, require("./migrations/unifiedAccessMigration"));
Object.assign(exports, require("./migrations/backfillCustomClaims"));
Object.assign(exports, require("./migrations/cleanupAuditLogs"));
Object.assign(exports, require("./migrations/backfillQuestionStats"));

// ============================================================================
// Email Functions
// ============================================================================
Object.assign(exports, require("./email/sendReviewerInvites"));

// ============================================================================
// Firestore Triggers (Aggregations)
// ============================================================================
Object.assign(exports, require("./triggers/questionStatsUpdater"));
