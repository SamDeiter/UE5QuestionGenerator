export const APP_VERSION = "v2.2.0";

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
  "Easy MC",
  "Easy T/F",
  "Medium MC",
  "Medium T/F",
  "Hard MC",
  "Hard T/F",
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

// Toast Notification Durations (ms)
export const TOAST_DURATION = {
  SHORT: 2000, // Quick confirmations
  MEDIUM: 3000, // Standard messages
  LONG: 5000, // Important info
  EXTENDED: 7000, // Errors & warnings requiring attention
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
