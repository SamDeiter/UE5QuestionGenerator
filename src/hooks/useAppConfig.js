import { useState, useEffect } from "react";
import { getSecureItem, setSecureItem } from "../utils/secureStorage";

export const useAppConfig = () => {
  // Application mode: 'landing' (home screen), 'create' (generation mode), 'review' (review mode), 'database' (view all)
  const [appMode, setAppMode] = useState("landing");

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
    const saved = getSecureItem("ue5_gen_config");
    const defaults = {
      discipline: "Technical Art",
      batchSize: "6",
      difficulty: "Beginner",
      type: "Multiple Choice", // Explicit type selection (no Balanced mode)
      language: "English",
      creatorName: "",
      reviewerName: "",
      apiKey: "",
      sheetUrl:
        "https://script.google.com/a/macros/epicgames.com/s/AKfycbxssaKhw3pOWkC9sPJE_6oMZuG66JYCgeEQFEHh010Q90wlHqH64oiVhFjE1JQkSTV6/exec",
      model: "gemini-2.0-flash",
      tags: [], // Selected sub-topic tags
    };

    const initialConfig = saved ? { ...defaults, ...saved } : defaults;

    // Ensure all required fields have default values
    initialConfig.creatorName = initialConfig.creatorName || "";
    initialConfig.reviewerName = initialConfig.reviewerName || "";
    initialConfig.apiKey = initialConfig.apiKey || "";
    initialConfig.sheetUrl = initialConfig.sheetUrl || defaults.sheetUrl;

    // Reset deprecated difficulty setting
    // if (initialConfig.difficulty === 'Balanced All') {
    //     initialConfig.difficulty = 'Easy MC';
    // }

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

  // DEBUG: Log the computed values
  console.log("🔍 [useAppConfig] API Status Debug:", {
    isInternalEnvironment,
    hasClientKey,
    isAuthReady,
    isApiReady,
    apiKeyStatus,
  });

  // UI States
  const [showNameModal, setShowNameModal] = useState(false);
  const [showGenSettings, setShowGenSettings] = useState(true);
  const [showApiError, setShowApiError] = useState(false);
  const [batchSizeWarning, setBatchSizeWarning] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Effects

  useEffect(() => {
    if (!config.creatorName) setShowNameModal(true);
  }, [config.creatorName]);
  useEffect(() => {
    setSecureItem("ue5_gen_config", config);
  }, [config]);

  // Handlers
  const handleLanguageSwitch = (lang) => {
    setConfig((prev) => ({ ...prev, language: lang }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Validate batch size for Balanced All mode
    if (name === "batchSize") {
      if (config.difficulty === "Balanced All") {
        const num = parseInt(value);
        if (num % 6 !== 0) {
          setBatchSizeWarning(
            "Batch size must be a multiple of 6 for Balanced Mode."
          );
        } else {
          setBatchSizeWarning("");
        }
      } else {
        setBatchSizeWarning("");
      }
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
    setConfig((prev) => ({ ...prev, creatorName: name, reviewerName: name }));
    setShowNameModal(false);
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
  };
};
