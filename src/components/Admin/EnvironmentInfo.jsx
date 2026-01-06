/**
 * EnvironmentInfo - Display environment and API configuration info
 *
 * Extracted from AdminPanel.jsx
 */

import React from "react";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";

const EnvironmentInfo = ({ showMessage, isCollapsed, onToggle }) => {
  return (
    <CollapsibleSection
      title="Environment Info"
      icon="server"
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      variant="slate"
    >
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Firebase Project:</span>
          <span className="text-slate-300 font-mono">
            {import.meta.env.VITE_FIREBASE_PROJECT_ID || "Not Set"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Environment:</span>
          <span
            className={`font-bold ${
              import.meta.env.VITE_FIREBASE_PROJECT_ID?.includes("prod")
                ? "text-red-400"
                : "text-green-400"
            }`}
          >
            {import.meta.env.VITE_FIREBASE_PROJECT_ID?.includes("prod")
              ? "🔴 PRODUCTION"
              : "🟢 DEVELOPMENT"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">API Mode:</span>
          <span className="text-cyan-400">Cloud Functions</span>
        </div>
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
        <button
          onClick={() => {
            navigator.clipboard.writeText("npm run dev:dev");
            showMessage(
              "Copied! Paste in terminal to switch to DEV environment.",
              3000
            );
          }}
          className="flex-1 px-2 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-300 text-xs font-bold rounded border border-green-700/50 transition-colors flex items-center justify-center gap-1"
        >
          <Icon name="clipboard" size={12} />
          Switch to DEV
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText("npm run dev:prod");
            showMessage(
              "Copied! Paste in terminal to switch to PROD environment.",
              3000
            );
          }}
          className="flex-1 px-2 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-300 text-xs font-bold rounded border border-red-700/50 transition-colors flex items-center justify-center gap-1"
        >
          <Icon name="clipboard" size={12} />
          Switch to PROD
        </button>
      </div>
    </CollapsibleSection>
  );
};

export default EnvironmentInfo;
