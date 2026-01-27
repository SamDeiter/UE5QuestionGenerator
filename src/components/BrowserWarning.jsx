/**
 * Browser Compatibility Warning Component
 *
 * Detects Safari and other potentially problematic browsers
 * and shows a dismissible warning recommending Chrome or Firefox.
 */
import { useState, useEffect } from "react";
import Icon from "./Icon";

// Storage key for dismissed warning
const BROWSER_WARNING_DISMISSED_KEY = "browser-warning-dismissed";
// Dismiss duration: 7 days in milliseconds
const DISMISS_DURATION_MS = 604800000; // 7 * 24 * 60 * 60 * 1000

/**
 * Detect Safari browser
 */
const isSafari = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium")
  );
};

/**
 * Detect incognito/private browsing mode
 * Uses filesystem API availability as a heuristic
 */
const detectIncognito = async () => {
  // Chrome/Edge incognito detection
  if ("storage" in navigator && "estimate" in navigator.storage) {
    try {
      const { quota } = await navigator.storage.estimate();
      // Incognito mode typically has very limited quota (< 120MB)
      const limitedQuotaThreshold = 120000000;
      if (quota && quota < limitedQuotaThreshold) {
        return true;
      }
    } catch {
      // Ignore errors
    }
  }
  return false;
};

/**
 * Check if warning was previously dismissed
 */
const wasWarningDismissed = () => {
  try {
    const dismissed = localStorage.getItem(BROWSER_WARNING_DISMISSED_KEY);
    if (!dismissed) return false;

    // Allow warning to show again after dismiss duration expires
    const dismissedAt = parseInt(dismissed, 10);
    return Date.now() - dismissedAt < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
};

/**
 * Save dismissal to localStorage
 */
const dismissWarning = () => {
  try {
    localStorage.setItem(BROWSER_WARNING_DISMISSED_KEY, Date.now().toString());
  } catch {
    // Ignore storage errors
  }
};

const BrowserWarning = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState(null); // 'safari' or 'incognito'
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkBrowser = async () => {
      if (wasWarningDismissed()) return;

      // Check for incognito first (higher priority issue)
      const isIncognito = await detectIncognito();
      if (isIncognito) {
        setWarningType("incognito");
        setShowWarning(true);
        return;
      }

      // Check for Safari
      if (isSafari()) {
        setWarningType("safari");
        setShowWarning(true);
      }
    };

    checkBrowser();
  }, []);

  const handleDismiss = () => {
    dismissWarning();
    setDismissed(true);
    setShowWarning(false);
  };

  if (!showWarning || dismissed) return null;

  const isIncognitoWarning = warningType === "incognito";

  return (
    <div className="bg-amber-900/80 border-b border-amber-700 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Icon
          name="alert-triangle"
          size={20}
          className="text-amber-400 flex-shrink-0"
        />
        <div className="text-sm text-amber-100">
          {isIncognitoWarning ? (
            <>
              <span className="font-semibold">Private/Incognito Mode:</span>{" "}
              Firebase authentication may not work correctly. Please use a{" "}
              <span className="font-bold">regular browser window</span> for the
              best experience.
            </>
          ) : (
            <>
              <span className="font-semibold">Safari Detected:</span> For the
              best experience, we recommend using{" "}
              <span className="font-bold">Chrome</span>,{" "}
              <span className="font-bold">Firefox</span>, or{" "}
              <span className="font-bold">Edge</span>. Some features may not
              work correctly in Safari.
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!isIncognitoWarning && (
          <a
            href="https://www.google.com/chrome/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors"
          >
            Get Chrome
          </a>
        )}
        <button
          onClick={handleDismiss}
          className="p-1.5 text-amber-400 hover:text-amber-200 hover:bg-amber-800/50 rounded transition-colors"
          title="Dismiss for 7 days"
          aria-label="Dismiss browser warning"
        >
          <Icon name="x" size={18} />
        </button>
      </div>
    </div>
  );
};

export default BrowserWarning;
