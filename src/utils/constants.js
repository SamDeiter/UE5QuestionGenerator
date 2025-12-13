export const APP_VERSION = "v2.0.1";

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
export const TARGET_PER_CATEGORY = 33;
export const TARGET_TOTAL = 200;
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
