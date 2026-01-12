import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ModalProvider from "./contexts/ModalProvider.jsx";
import { AccessibilityProvider } from "./contexts/AccessibilityContext.jsx";
import { ErrorReporterProvider } from "./contexts/ErrorReporterContext.jsx";
import "./index.css";

// Import cleanup utility to expose window.cleanupProductionDatabase for console access
// Lazy load debug tools to avoid bundling Firestore in the main chunk
window.loadDebugTools = () => import("./utils/databaseCleanup.js");

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
