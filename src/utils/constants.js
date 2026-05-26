// APP_VERSION is automatically synced from package.json via vite.config.js
export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? `v${__APP_VERSION__}` : "v2.2.7";

export const LANGUAGE_FLAGS = {
  English: "🇺🇸",
  "Chinese (Simplified)": "🇨🇳",
  Japanese: "🇯🇵",
  Korean: "🇰🇷",
  Spanish: "🇪🇸",
  French: "🇫🇷",
  German: "🇩🇪",
  Italian: "🇮🇹",
  Portuguese: "🇵🇹",
  Russian: "🇷🇺",
};

export const LANGUAGE_CODES = {
  English: "US",
  "Chinese (Simplified)": "CN",
  Japanese: "JP",
  Korean: "KR",
  Spanish: "ES",
  French: "FR",
  German: "DE",
  Italian: "IT",
  Portuguese: "PT",
  Russian: "RU",
};

export const CATEGORY_KEYS = [
  "Beginner MC",
  "Beginner T/F",
  "Intermediate MC",
  "Intermediate T/F",
  "Expert MC",
  "Expert T/F",
];
export const TARGET_PER_CATEGORY = 40; // 40 MC + 40 T/F per difficulty
export const TARGET_TOTAL = 240; // 3 difficulties × 80 questions each
export const FIELD_DELIMITER = ",";

// Quality Score Thresholds
export const QUALITY_THRESHOLDS = {
  EXCELLENT: 90, // >= 90: Excellent quality, ready to accept
  PASS: 70, // >= 70: Good/acceptable quality
  MEDIOCRE: 50, // >= 50: Needs improvement
  // < 50: Poor quality, should reject
};

// Shorthand for common usage
export const QUALITY_PASS_THRESHOLD = QUALITY_THRESHOLDS.PASS;

// Toast Notification Durations (ms) - Kept short to prevent stacking
export const TOAST_DURATION = {
  SHORT: 1000, // Quick confirmations
  MEDIUM: 1500, // Standard messages
  LONG: 2500, // Important info
  EXTENDED: 4000, // Errors & warnings requiring attention
};

// AI/Gemini Configuration Constants
export const AI_CONFIG = {
  // Temperature settings (0.0 = deterministic, 1.0 = creative)
  DEFAULT_TEMPERATURE: 0.2, // Standard generation temperature
  TAGGING_TEMPERATURE: 0.3, // Slightly higher for tag classification
  // Model defaults
  DEFAULT_MODEL: "gemini-2.5-flash",
  // Log preview length
  API_KEY_PREVIEW_LENGTH: 10,
  // Retry/Loop limits
  MAX_CRITIQUE_RETRIES: 3,
  MAX_FEEDBACK_SCORE: 5,
};

// UI Constants
export const UI_LABELS = {
  APP_TITLE: "UE5 Question Generator",
  GENERATE_BTN: "GENERATE QUESTIONS",
  EXPORT_BTN: "Export",
  LOAD_BTN: "Load",
  DB_VIEW_BTN: "DB View",
  CLEAR_DATA_BTN: "Clear Local Data & Reset App",
  API_KEY_LABEL: "Google Gemini API Key",
  SHEET_URL_LABEL: "Google Apps Script URL",
};

export const DEFAULT_CONFIG = {
  apiKey: "",
  sheetUrl:
    "https://script.google.com/a/macros/epicgames.com/s/AKfycbxssaKhw3pOWkC9sPJE_6oMZuG66JYCgeEQFEHh010Q90wlHqH64oiVhFjE1JQkSTV6/exec",
  creatorName: "",
  reviewerName: "",
  discipline: "Tech Art",
  difficulty: "Beginner", // Changed from "Easy MC" to match useAppConfig
  type: "Multiple Choice",
  language: "English",
  batchSize: "6",
  model: "gemini-2.5-flash",
  tags: [],
};

export const STORAGE_KEYS = {
  CONFIG: "ue5_gen_config",
  QUESTIONS: "ue5_gen_questions",
  PREF_SEARCH: "ue5_pref_search",
  PREF_FILTER: "ue5_pref_filter",
  PREF_HISTORY: "ue5_pref_history",
  PREF_REVIEW_INDEX: "ue5_pref_review_index",
  PREF_LAST_ID: "ue5_pref_last_id",
  APP_MODE: "ue5_app_mode",
};

// Context Optimization Limits
export const CONTEXT_LIMITS = {
  MAX_TOKENS: 2000,
  MAX_EXCERPT_LENGTH: 500, // characters per excerpt
  CHUNK_SIZE: 1000,
};

/** Token cost thresholds for monitoring */
export const TOKEN_THRESHOLDS = {
  WARNING: 0.5, // $0.50 (Amber)
  CRITICAL: 1.0, // $1.00 (Red)
};

// UI Timing Constants
export const TIMING = {
  COOLDOWN_SECONDS: 60,
  DELETE_BATCH_SIZE: 10,
  AUTO_SAVE_INTERVAL: 10000, // ms
  MAX_POLLING_ATTEMPTS: 20,
  CACHE_TTL_MS: 30 * 1000,
  STALE_AUTH_MS: 45 * 60 * 1000,
  TOKEN_REFRESH_INTERVAL_MS: 50 * 60 * 1000, // 50 minutes (tokens expire at ~60 min)
  WRITE_PROBE_INTERVAL_MS: 15 * 60 * 1000, // 15 minutes - verify Firestore access periodically
  ANALYTICS_REFRESH_MS: 5000, // 5 seconds - refresh local token usage
  TOAST_SHORT: 2000,
  TOAST_MEDIUM: 3000,
  STATS_POLL_INTERVAL: 5 * 60 * 1000, // 5 minutes
};

// Standard Time Multipliers (in ms)
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  QUARTER: 90 * 24 * 60 * 60 * 1000,
};

// SCORM Export Defaults
export const SCORM_DEFAULTS = {
  PASSING_SCORE: 80,
  TIME_LIMIT_MINUTES: 30,
};

// Difficulty Distribution Weights for Quiz Question Selection
// Controls how many questions of each difficulty are selected per attempt.
// Shifted from equal thirds (33/33/33) to harder distribution to combat inflated scores.
export const DIFFICULTY_WEIGHTS = {
  EASY: 0.15, // 15% Easy questions (was ~33%)
  MEDIUM: 0.35, // 35% Medium questions (was ~33%)
  HARD: 0.5, // 50% Hard questions (was ~33%)
};

// Firestore Query Limits - Performance Optimization
export const FIRESTORE_LIMITS = {
  MAX_RESULTS: 500,
  DEFAULT_PAGE_SIZE: 20,
  MAX_QUERY_LIMIT: 100, // Maximum docs per query (non-admin) - prevents unbounded reads
  ADMIN_MAX_QUERY_LIMIT: 5000, // Admin maintenance tasks only
  MAX_BATCH_SIZE: 500, // Firestore batch write limit
  MAX_LISTENERS: 5, // Max concurrent real-time listeners
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minute cache TTL
  MIN_QUERY_INTERVAL_MS: 1000, // Rate limit between queries (1/sec)
  FULL_SYNC_COUNT: 50000, // Cap for full-sync path. Internally paginated in 2500-doc chunks, so this is just an upper bound.
};

// History Limits
export const HISTORY_LIMITS = {
  MAX_STATES_PER_QUESTION: 10,
};

// Generation & Processing Limits
export const GENERATION_LIMITS = {
  REJECTED_EXAMPLES_COUNT: 5,
  MIN_TAGS_PER_QUESTION: 3,
  TOTAL_TAGS_THRESHOLD: 3,
  MAX_GROUNDING_SOURCES: 3,
  BATCH_SIZE_PARALLEL_CRITIQUE: 3,
  ID_SUBSTRING_LENGTH: 4,
  MAX_RETRIES: 5,
  ERROR_TRUNCATE_LENGTH: 50, // Max chars to show in error messages
};

// Question Validation Limits
export const QUESTION_LIMITS = {
  MIN_CHOICES: 2,
  MAX_CHOICES: 6,
  MIN_QUESTION_LENGTH: 10,
  MAX_QUESTION_LENGTH: 500,
  MIN_EXPORT_QUESTIONS: 5, // Warn if exporting less than this
  MAX_EXPORT_QUESTIONS: 100, // Warn if exporting more than this
};

// Processing Constants
export const PROCESSING = {
  BATCH_SIZE: 500,
  ESTIMATED_REVIEW_SECONDS: 30,
};

// Tutorial System Settings
export const TUTORIAL = {
  MAX_ATTEMPT_COUNT: 20,
  POLL_INTERVAL: 100,
  RESIZE_THROTTLE: 100,
};

/** Tutorial system detailed config */
export const TUTORIAL_CONFIG = {
  MAX_ATTEMPTS: 20,
  POLL_INTERVAL: 100,
  THROTTLE_DELAY: 100,
  HIGHLIGHT_PADDING: 10,
  RESIZE_THROTTLE: 100,
  SECONDARY_SCROLL_DELAY: 500,
  FINAL_SCROLL_DELAY: 1500,
  Z_INDEX_BASE: 9999,
  Z_INDEX_TOOLTIP: 10000,
};

export const MAINTENANCE = {
  NUKE_BATCH_SIZE: 10,
};

/** Data maintenance and danger zone config */
export const MAINTENANCE_CONFIG = {
  NUKE_BATCH_SIZE: 10,
  MODAL_Z_INDEX: 50,
};

// Question Sources
export const QUESTION_SOURCES = {
  SESSION: "session",
  DATABASE: "database",
  IMPORT: "import",
};

// Question Statuses
export const QUESTION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  DELETED: "deleted",
};

// Answer Review States - Explicit reviewer assessment of answer correctness
export const ANSWER_STATE = {
  CORRECT: "correct",
  INCORRECT: "incorrect",
  UNSURE: "unsure",
};

// Doc Link Review States - Quality assessment of documentation link
export const DOC_LINK_STATE = {
  RELEVANT: "relevant",
  TOO_BROAD: "too_broad",
  INCORRECT: "incorrect",
  MISSING: "missing",
};

export const QUESTION_DIFFICULTY = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  EXPERT: "Expert",
};

// App Modes
export const APP_MODES = {
  LANDING: "landing",
  CREATE: "create",
  REVIEW: "review",
  DATABASE: "database",
  ANALYTICS: "analytics",
  TEST: "test",
  ADMIN: "admin",
  PLAYGROUND: "playground",
  TRANSLATE: "translate",
};

// Firestore Security - Reviewer Allowed Fields
// IMPORTANT: This list must match what's in config/firestore/firestore.rules
// Run `node scripts/validate-firestore-rules.js` to verify sync
export const REVIEWER_ALLOWED_FIELDS = [
  // Version and timestamps
  "version",
  "updatedAt",
  "firestoreUpdatedAt",
  // Status fields
  "status",
  "rejectionReason",
  "rejectionCategory",
  "rejectionNotes",
  "rejectedAt",
  "rejectedBy",
  "acceptedAt",
  "acceptedBy",
  // Review tracking
  "reviewedBy",
  "reviewedAt",
  "reviewCompletedAt",
  "reviewerName",
  "reviewDuration",
  "reviewStartedAt",
  // AI scoring
  "aiScore",
  "scoredAt",
  "scoreSource",
  // Critique and improvement
  "critique",
  "critiqueScore",
  "suggestedRewrite",
  "improvedScore",
  "improvementsApplied",
  // Human verification
  "humanVerified",
  "humanVerifiedBy",
  "humanVerifiedAt",
  // Notes
  "notes",
  // Doc link management (Phase 1)
  "sourceUrl",
  "sourceExcerpt",
  "docLinkSource",
  "docLinkModifiedBy",
  "docLinkModifiedAt",
  "docLinkModificationNote",
  "originalSourceUrl",
  "originalSourceExcerpt",
  // Explicit review states (Phase 2)
  "answerState",
  "docLinkState",
  // Needs research (Phase 4)
  "needsResearch",
  "needsResearchReason",
  "needsResearchAt",
  "needsResearchBy",
];
