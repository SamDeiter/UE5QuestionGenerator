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

// Colorblind-Safe Color Palette
// Uses blue/orange/purple instead of green/yellow/red for better visibility
export const COLORBLIND_COLORS = {
  EXCELLENT: {
    bg: "bg-blue-900/30",
    border: "border-blue-700/50",
    text: "text-blue-300",
    icon: "✓",
    label: "Excellent",
  },
  GOOD: {
    bg: "bg-amber-900/30",
    border: "border-amber-700/50",
    text: "text-amber-300",
    icon: "⚠",
    label: "Good",
  },
  MEDIOCRE: {
    bg: "bg-purple-900/30",
    border: "border-purple-700/50",
    text: "text-purple-300",
    icon: "⊛",
    label: "Mediocre",
  },
  CRITICAL: {
    bg: "bg-rose-900/30",
    border: "border-rose-700/50",
    text: "text-rose-300",
    icon: "✗",
    label: "Critical",
  },
};

// Toast Notification Durations (ms) - Kept short to prevent stacking
export const TOAST_DURATION = {
  SHORT: 1000, // Quick confirmations
  MEDIUM: 1500, // Standard messages
  LONG: 2500, // Important info
  EXTENDED: 4000, // Errors & warnings requiring attention
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
  sheetUrl: "",
  creatorName: "",
  reviewerName: "",
  discipline: "Technical Art",
  difficulty: "Easy MC",
  language: "English",
};

export const ERROR_MESSAGES = {
  NO_API_KEY: "Please enter your Google Gemini API Key in Settings.",
  NO_SHEET_URL: "Please configure Google Sheets URL in settings first.",
  GEN_FAILED: "Generation failed. Please check your API key and try again.",
};

export const STORAGE_KEYS = {
  CONFIG: "ue5_gen_config",
  QUESTIONS: "ue5_gen_questions",
  PREF_SEARCH: "ue5_pref_search",
  PREF_FILTER: "ue5_pref_filter",
  PREF_HISTORY: "ue5_pref_history",
  PREF_REVIEW_INDEX: "ue5_pref_review_index",
  PREF_LAST_ID: "ue5_pref_last_id",
};

// Context Optimization Limits
export const CONTEXT_LIMITS = {
  MAX_TOKENS: 2000,
  MAX_EXCERPT_LENGTH: 500, // characters per excerpt
  CHUNK_SIZE: 1000,
};

// Token Usage Warning Levels (percentage thresholds)
export const TOKEN_WARNING_LEVELS = {
  DANGER: 90, // >= 90%: Critical, near limit
  WARNING: 70, // >= 70%: Caution, approaching limit
};

// UI Timing Constants
export const TIMING = {
  COOLDOWN_SECONDS: 60,
  DELETE_BATCH_SIZE: 10,
  AUTO_SAVE_INTERVAL: 10000, // ms
  MAX_POLLING_ATTEMPTS: 20,
};

// SCORM Export Defaults
export const SCORM_DEFAULTS = {
  PASSING_SCORE: 80,
  TIME_LIMIT_MINUTES: 30,
};

// Firestore Query Limits
export const FIRESTORE_LIMITS = {
  MAX_RESULTS: 500,
  DEFAULT_PAGE_SIZE: 20,
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
};
