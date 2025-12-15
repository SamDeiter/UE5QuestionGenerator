import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ModalProvider from "./contexts/ModalProvider.jsx";
import "./index.css";

// Import cleanup utility to expose window.cleanupProductionDatabase for console access
import "./utils/databaseCleanup.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ModalProvider>
        <App />
      </ModalProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
