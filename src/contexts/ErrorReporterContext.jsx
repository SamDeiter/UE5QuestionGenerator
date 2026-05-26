/**
 * Error Reporter Context
 *
 * Captures and displays errors with detailed reports that users can send to support.
 */
import { createContext, useState, useCallback, useMemo } from "react";
import Icon from "../components/Icon";

const ErrorReporterContext = createContext(null);

// Maximum number of errors to keep in history
const MAX_ERROR_HISTORY = 10;

/**
 * Format error report for copying/sending
 */
const formatErrorReport = (error, userEmail, appVersion) => {
  const timestamp = new Date().toISOString();
  const userAgent = navigator.userAgent;
  const url = window.location.href;

  return `
=== UE5 Question Generator Error Report ===
Timestamp: ${timestamp}
User: ${userEmail || "Not signed in"}
App Version: ${appVersion || "Unknown"}
URL: ${url}
Browser: ${userAgent}

--- Error Details ---
Action: ${error.action || "Unknown"}
Message: ${error.message || "No message"}
Code: ${error.code || "No code"}

--- Technical Details ---
${error.technical || "No additional details"}

--- Context ---
${error.context || "No context provided"}
============================================
`.trim();
};

/**
 * Error Reporter Provider Component
 */
export const ErrorReporterProvider = ({ children, userEmail, appVersion }) => {
  const [errors, setErrors] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedError, setSelectedError] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  // Report an error
  const reportError = useCallback((error) => {
    const enrichedError = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...error,
    };

    setErrors((prev) => [enrichedError, ...prev].slice(0, MAX_ERROR_HISTORY));
    setShowBanner(true);

    // Auto-hide banner after 10 seconds
    setTimeout(() => setShowBanner(false), 10000);
  }, []);

  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors([]);
    setShowBanner(false);
  }, []);

  // Open report modal for specific error
  const openReportModal = useCallback(
    (error = null) => {
      setSelectedError(error || errors[0]);
      setShowReportModal(true);
      setShowBanner(false);
    },
    [errors]
  );

  // Copy error report to clipboard
  const copyErrorReport = useCallback(
    async (error) => {
      const report = formatErrorReport(error, userEmail, appVersion);
      try {
        await navigator.clipboard.writeText(report);
        return true;
      } catch {
        return false;
      }
    },
    [userEmail, appVersion]
  );

  // Send error report via email
  const sendErrorReport = useCallback(
    (error) => {
      const report = formatErrorReport(error, userEmail, appVersion);
      const subject = encodeURIComponent(
        `[Bug Report] ${error.action || "Error"} - UE5 Question Generator`
      );
      const body = encodeURIComponent(report);
      window.open(
        `mailto:sam.deiter@epicgames.com?subject=${subject}&body=${body}`,
        "_blank"
      );
    },
    [userEmail, appVersion]
  );

  const value = useMemo(
    () => ({
      errors,
      reportError,
      clearErrors,
      openReportModal,
      copyErrorReport,
      sendErrorReport,
      hasErrors: errors.length > 0,
    }),
    [
      errors,
      reportError,
      clearErrors,
      openReportModal,
      copyErrorReport,
      sendErrorReport,
    ]
  );

  return (
    <ErrorReporterContext.Provider value={value}>
      {children}

      {/* Error Banner (bottom of screen) */}
      {showBanner && errors.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-red-900/95 border border-red-500 rounded-lg shadow-2xl p-4 max-w-sm backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <Icon
                name="alert-triangle"
                size={20}
                className="text-red-400 flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-200">
                  Something went wrong
                </p>
                <p className="text-xs text-red-300/80 mt-1 truncate">
                  {errors[0]?.message || "An error occurred"}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => openReportModal(errors[0])}
                    className="px-3 py-1.5 text-xs font-bold rounded bg-red-600 hover:bg-red-500 text-white transition-colors"
                  >
                    Report Issue
                  </button>
                  <button
                    onClick={() => setShowBanner(false)}
                    className="px-3 py-1.5 text-xs font-medium rounded bg-red-800 hover:bg-red-700 text-red-200 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Report Modal */}
      {showReportModal && selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-red-900/50 border-b border-red-700/50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon name="alert-octagon" size={24} className="text-red-400" />
                <h2 className="text-lg font-bold text-red-200">Report Issue</h2>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 hover:bg-red-800/50 rounded-lg transition-colors"
              >
                <Icon name="x" size={18} className="text-red-300" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-300">
                Help us fix this issue by sending the error report below. Click{" "}
                <strong>Send to Support</strong> or <strong>Copy Report</strong>
                and share it with the development team.
              </p>

              {/* Error Details */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Action:</span>
                    <span className="text-slate-300 font-medium">
                      {selectedError.action || "Unknown"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Error:</span>
                    <span
                      className="text-red-400 font-medium truncate max-w-[200px]"
                      title={selectedError.message}
                    >
                      {selectedError.message || "No message"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Time:</span>
                    <span className="text-slate-400 font-mono text-xs">
                      {new Date(selectedError.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => sendErrorReport(selectedError)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
                >
                  <Icon name="mail" size={16} />
                  Send to Support
                </button>
                <button
                  onClick={async () => {
                    const success = await copyErrorReport(selectedError);
                    if (success) {
                      // Brief feedback
                      const btn = document.activeElement;
                      if (btn) {
                        btn.textContent = "✓ Copied!";
                        setTimeout(() => {
                          btn.innerHTML =
                            '<span class="flex items-center gap-2"><svg>...</svg>Copy Report</span>';
                        }, 2000);
                      }
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold transition-colors"
                >
                  <Icon name="copy" size={16} />
                  Copy Report
                </button>
              </div>

              {/* Error History */}
              {errors.length > 1 && (
                <div className="pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-500 mb-2">
                    Recent errors ({errors.length}):
                  </p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {errors.slice(0, 5).map((err, idx) => (
                      <button
                        key={err.id}
                        onClick={() => setSelectedError(err)}
                        className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                          err.id === selectedError.id
                            ? "bg-red-900/50 text-red-200"
                            : "hover:bg-slate-800 text-slate-400"
                        }`}
                      >
                        {idx + 1}. {err.action || "Error"} -{" "}
                        {new Date(err.timestamp).toLocaleTimeString()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ErrorReporterContext.Provider>
  );
};
