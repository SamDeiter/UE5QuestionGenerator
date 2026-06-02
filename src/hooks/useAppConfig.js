import { useEffect, useRef } from "react";
import { getLocalPref, setLocalPref } from "../utils/localPrefs";
import { logger } from "../utils/logger";
import { STORAGE_KEYS } from "../utils/constants";
import { validateDisplayName } from "../utils/nameValidation";
import { useModals } from "../contexts/ModalContext";
import { useAppConfigStore } from "../store/appConfigStore";

/**
 * @param {Object} options
 * @param {Object} options.user - Firebase user object (optional)
 *
 * appMode / config / a few UI flags now live in `appConfigStore` (zustand) so
 * consumers can read them without prop-drilling. This hook keeps the business
 * logic: modal coupling, name validation, language switch, and the localStorage
 * persistence effects. Its return shape is unchanged.
 */
export const useAppConfig = ({ user = null } = {}) => {
  // Modal visibility now lives in ModalContext; this hook drives the
  // setters via business logic (e.g. name validation, language change).
  const {
    showNameModal,
    setShowNameModal,
    showGenSettings,
    setShowGenSettings,
    showSettings,
    setShowSettings,
    showApiKey,
    setShowApiKey,
  } = useModals();

  // Domain state from the store (single source of truth).
  const appMode = useAppConfigStore((s) => s.appMode);
  const setAppMode = useAppConfigStore((s) => s.setAppMode);
  const config = useAppConfigStore((s) => s.config);
  const setConfig = useAppConfigStore((s) => s.setConfig);
  const showApiError = useAppConfigStore((s) => s.showApiError);
  const setShowApiError = useAppConfigStore((s) => s.setShowApiError);
  const batchSizeWarning = useAppConfigStore((s) => s.batchSizeWarning);
  const setBatchSizeWarning = useAppConfigStore((s) => s.setBatchSizeWarning);
  const pendingNavigationUniqueId = useAppConfigStore(
    (s) => s.pendingNavigationUniqueId
  );
  const setPendingNavigationUniqueId = useAppConfigStore(
    (s) => s.setPendingNavigationUniqueId
  );

  // Check if running in internal Canvas environment (has auto-injected API key)
  const isInternalEnvironment =
    typeof window !== "undefined" && typeof window.__app_id !== "undefined";

  // Authentication status — true when Firebase user is resolved
  const isAuthReady = !!user;

  // SECURITY WARNING: Storing API keys in localStorage is insecure!
  // This is a temporary solution. For production:
  // 1. Move API calls to a backend proxy server
  // 2. Never expose API keys in client-side code
  // 3. Use server-side authentication with the Gemini API

  // API key status computed values
  // Cloud Functions are available when user is authenticated (checked via Firebase Auth in App.jsx)
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

  // Track if this is the initial mount
  const hasInitialized = useRef(false);

  // Effects
  useEffect(() => {
    // Skip the first render to allow localStorage to hydrate
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // Only show modal if name is truly empty after initial load
      const savedConfig = getLocalPref(STORAGE_KEYS.CONFIG);
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
          validation.sanitized
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
          validation.error
        );
        setShowNameModal(true);
      }
    }
  }, [user?.displayName, config.creatorName]);

  useEffect(() => {
    setLocalPref(STORAGE_KEYS.CONFIG, config);
  }, [config]);

  // Persist appMode to localStorage independently for faster restoration
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.APP_MODE, appMode);
    }
  }, [appMode]);

  // Handlers
  const handleLanguageSwitch = (lang, uniqueId = null) => {
    logger.log(
      "🌍 [handleLanguageSwitch] Switching global language filter to:",
      lang,
      "| Navigate to uniqueId:",
      uniqueId
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
