const admin = require("firebase-admin");

// Load environment variables from .env file (for local development)
require("dotenv").config();

admin.initializeApp();

// ============================================================================
// AI Functions
// ============================================================================
Object.assign(exports, require("./ai/generateQuestions"));
Object.assign(exports, require("./ai/generateCritique"));

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

// ============================================================================
// Migration Functions
// ============================================================================
Object.assign(exports, require("./migrations/migrateTranslations"));
Object.assign(exports, require("./migrations/importAIScores"));

// ============================================================================
// Email Functions
// ============================================================================
Object.assign(exports, require("./email/sendReviewerInvites"));
