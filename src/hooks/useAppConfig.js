import { useState, useEffect, useRef } from "react";
import { getSecureItem, setSecureItem } from "../utils/secureStorage";
import { logger } from "../utils/logger";
import { DEFAULT_CONFIG, STORAGE_KEYS, APP_MODES } from "../utils/constants";
import { validateDisplayName } from "../utils/nameValidation";

/**
 * @param {Object} options
 * @param {Object} options.user - Firebase user object (optional)
 */
export const useAppConfig = ({ user = null } = {}) => {
  // Application mode: 'landing' (home screen), 'create' (generation mode), 'review' (review mode), 'database' (view all)
  const [appMode, setAppMode] = useState(() => {
    // 1. Check URL parameters (Highest priority)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get("mode");
      if (modeParam && Object.values(APP_MODES).includes(modeParam)) {
        logger.log("🔗 Found app mode in URL:", modeParam);
        return modeParam;
      }
    }

    // 2. Fallback to localStorage
    if (typeof window === "undefined") return APP_MODES.LANDING;
    return localStorage.getItem(STORAGE_KEYS.APP_MODE) || APP_MODES.LANDING;
  });

  // Check if running in internal Canvas environment (has auto-injected API key)
  const isInternalEnvironment =
    typeof window !== "undefined" && typeof window.__app_id !== "undefined";

  // Authentication status - always ready for local/Sheets operations
  const isAuthReady = true;

  // SECURITY WARNING: Storing API keys in localStorage is insecure!
  // This is a temporary solution. For production:
  // 1. Move API calls to a backend proxy server
  // 2. Never expose API keys in client-side code
  // 3. Use server-side authentication with the Gemini API

  // Main application configuration (persisted to localStorage)
  const [config, setConfig] = useState(() => {
    const saved = getSecureItem(STORAGE_KEYS.CONFIG);

    // Merge saved config with defaults
    const initialConfig = saved
      ? { ...DEFAULT_CONFIG, ...saved }
      : { ...DEFAULT_CONFIG };

    // Ensure all required fields have default values (double-check)
    initialConfig.creatorName = initialConfig.creatorName || "";
    initialConfig.reviewerName = initialConfig.reviewerName || "";
    initialConfig.apiKey = initialConfig.apiKey || "";

    return initialConfig;
  });

  // API key status computed values
  // Cloud Functions are available when user is authenticated (checked via Firebase Auth in App.jsx)
  // We'll accept auth status as a prop to determine if Cloud Functions are available
  const hasClientKey = config.apiKey && config.apiKey.length > 5;
  const isApiReady = isInternalEnvironment || hasClientKey || isAuthReady; // Cloud Functions count as "ready"
  const effectiveApiKey = isInternalEnvironment ? "" : config.apiKey;

  // Status priority: Internal > Cloud Functions > Client Key > Not Set
  let apiKeyStatus;
  if (isInternalEnvironment) {
    apiKeyStatus = "Auto-Injected";
  } else if (hasClientKey) {
    apiKeyStatus = "Loaded";
  } else if (isAuthReady) {
    apiKeyStatus = "Cloud Functions"; // User is authenticated, can use server-side API
  } else {
    apiKeyStatus = "Not Set";
  }

  // UI States
  const [showNameModal, setShowNameModal] = useState(false);
  const [showGenSettings, setShowGenSettings] = useState(true);
  const [showApiError, setShowApiError] = useState(false);
  const [batchSizeWarning, setBatchSizeWarning] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Track if this is the initial mount
  const hasInitialized = useRef(false);

  // Effects
  useEffect(() => {
    // Skip the first render to allow localStorage to hydrate
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // Only show modal if name is truly empty after initial load
      const savedConfig = getSecureItem(STORAGE_KEYS.CONFIG);
      if (!savedConfig?.creatorName && !config.creatorName) {
        setShowNameModal(true);
      }
      return;
    }
    // After initial mount, show modal if name becomes empty
    if (!config.creatorName) setShowNameModal(true);
  }, [config.creatorName]);

  // Auto-populate creatorName from Firebase user displayName
  useEffect(() => {
    if (user?.displayName && !config.creatorName) {
      const validation = validateDisplayName(user.displayName);
      if (validation.valid) {
        logger.log(
          "🔄 Auto-setting creatorName from Firebase displayName:",
          validation.sanitized,
        );
        setConfig((prev) => ({
          ...prev,
          creatorName: validation.sanitized,
          reviewerName: validation.sanitized,
        }));
        setShowNameModal(false);
      } else {
        // DisplayName exists but is invalid, show modal for manual entry
        logger.log(
          "⚠️ Firebase displayName invalid, prompting for name:",
          validation.error,
        );
        setShowNameModal(true);
      }
    }
  }, [user?.displayName, config.creatorName]);

  useEffect(() => {
    setSecureItem(STORAGE_KEYS.CONFIG, config);
  }, [config]);

  // Persist appMode to localStorage independently for faster restoration
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.APP_MODE, appMode);
    }
  }, [appMode]);

  // Handlers
  // pendingNavigationUniqueId tracks the uniqueId to navigate to after language switch
  const [pendingNavigationUniqueId, setPendingNavigationUniqueId] =
    useState(null);

  const handleLanguageSwitch = (lang, uniqueId = null) => {
    logger.log(
      "🌍 [handleLanguageSwitch] Switching global language filter to:",
      lang,
      "| Navigate to uniqueId:",
      uniqueId,
    );
    // Store the uniqueId for navigation after re-filter
    if (uniqueId) {
      setPendingNavigationUniqueId(uniqueId);
    }
    setConfig((prev) => ({ ...prev, language: lang }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Validate batch size
    if (name === "batchSize") {
      setBatchSizeWarning("");
    }

    setConfig((prev) => ({ ...prev, [name]: value }));

    if (name === "language") {
      handleLanguageSwitch(value);
    }
    if (name === "apiKey") {
      setShowApiError(false);
    }
  };

  const handleNameSave = (name) => {
    // Validate name using industry-standard rules
    const validation = validateDisplayName(name);
    if (!validation.valid) {
      logger.log("❌ Name validation failed:", validation.error);
      return { success: false, error: validation.error };
    }

    let cleanName = validation.sanitized;

    // Additional cleanup: Remove accidental duplications (e.g. "Sam Deiter Sam Deiter")
    if (cleanName.includes(" ") && cleanName.length > 5) {
      const parts = cleanName.split(" ");
      const mid = Math.floor(parts.length / 2);
      const firstHalf = parts.slice(0, mid).join(" ");
      const secondHalf = parts.slice(mid).join(" ");
      if (firstHalf === secondHalf && firstHalf.length > 2) {
        cleanName = firstHalf;
      }
    }

    setConfig((prev) => ({
      ...prev,
      creatorName: cleanName,
      reviewerName: cleanName,
    }));
    setShowNameModal(false);
    logger.log("✅ Name saved:", cleanName);
    return { success: true, error: null };
  };

  return {
    appMode,
    setAppMode,
    config,
    setConfig,
    isInternalEnvironment,
    isAuthReady,
    isApiReady,
    effectiveApiKey,
    apiKeyStatus,
    showNameModal,
    setShowNameModal,
    showGenSettings,
    setShowGenSettings,
    showApiError,
    setShowApiError,
    batchSizeWarning,
    setBatchSizeWarning,
    showSettings,
    setShowSettings,
    showApiKey,
    setShowApiKey,
    handleChange,
    handleNameSave,
    handleLanguageSwitch,
    pendingNavigationUniqueId,
    setPendingNavigationUniqueId,
  };
};
