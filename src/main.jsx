import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ModalProvider from "./contexts/ModalProvider.jsx";
import { AccessibilityProvider } from "./contexts/AccessibilityContext.jsx";
import { ErrorReporterProvider } from "./contexts/ErrorReporterContext.jsx";
import "./index.css";

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
          <ModalProvider>
            <App />
          </ModalProvider>
        </ErrorReporterProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
