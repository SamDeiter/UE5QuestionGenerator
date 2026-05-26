import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { AccessibilityProvider } from "./contexts/AccessibilityContext.jsx";
import { ErrorReporterProvider } from "./contexts/ErrorReporterContext.jsx";
import { MessageProvider } from "./contexts/MessageContext.jsx";
import { ModalProvider } from "./contexts/ModalContext.jsx";
import { notifyUpdateAvailable } from "./components/UpdateAvailableBanner.jsx";
import "./index.css";

// PWA: register the service worker in "prompt" mode so we can show an
// in-app banner when a new version is waiting. The Reload button in
// UpdateAvailableBanner calls updateSW(true) -> skipWaiting + reload.
// In dev (no SW emitted), this import is a no-op stub.
if (import.meta.env.PROD) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh() {
          notifyUpdateAvailable(updateSW);
        },
        onRegisterError(err) {
          // Don't crash the app if SW registration fails
          // (e.g. blocked by extension, unsupported browser).
          console.warn("[pwa] SW registration failed", err);
        },
      });
    })
    .catch((err) => {
      console.warn("[pwa] virtual:pwa-register import failed", err);
    });
}

// Import AuthManager (the import itself is lightweight)
import { authManager } from "./services/AuthManager";

// PERFORMANCE: Defer auth initialization until after first paint
// This allows the UI to render immediately while Firebase Auth loads in background
// The app will show a loading state until auth state is determined
const initAuthDeferred = () => {
  // Use requestIdleCallback for minimal impact on initial render
  // Falls back to setTimeout for browsers without requestIdleCallback
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(() => authManager.init(), { timeout: 100 });
  } else {
    setTimeout(() => authManager.init(), 0);
  }
};
initAuthDeferred();

// Import cleanup utility to expose window.cleanupProductionDatabase for console access
// Lazy load debug tools to avoid bundling Firestore in the main chunk
if (import.meta.env.DEV) {
  window.loadDebugTools = () => import("./utils/databaseCleanup.js");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AccessibilityProvider>
        <ErrorReporterProvider>
          <MessageProvider>
            <ModalProvider>
              <App />
            </ModalProvider>
          </MessageProvider>
        </ErrorReporterProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
