/**
 * EnvironmentInfo - Display environment and API configuration info
 *
 * Extracted from AdminPanel.jsx
 */

import React from "react";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";
import { useAccessibility } from "../../contexts/AccessibilityContext";
import { useMessage } from "../../contexts/MessageContext";

const EnvironmentInfo = ({ isCollapsed, onToggle }) => {
  const { showMessage } = useMessage();
  const { colorblindMode } = useAccessibility();
  const cb = colorblindMode;

  // Colorblind-safe colors
  const devColor = cb ? "text-blue-400" : "text-green-400";
  const prodColor = cb ? "text-rose-400" : "text-red-400";
  const devBtnClasses = cb
    ? "bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border-blue-700/50"
    : "bg-green-900/30 hover:bg-green-900/50 text-green-300 border-green-700/50";
  const prodBtnClasses = cb
    ? "bg-rose-900/30 hover:bg-rose-900/50 text-rose-300 border-rose-700/50"
    : "bg-red-900/30 hover:bg-red-900/50 text-red-300 border-red-700/50";

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
                ? prodColor
                : devColor
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
          className={`flex-1 px-2 py-1.5 ${devBtnClasses} text-xs font-bold rounded border transition-colors flex items-center justify-center gap-1`}
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
          className={`flex-1 px-2 py-1.5 ${prodBtnClasses} text-xs font-bold rounded border transition-colors flex items-center justify-center gap-1`}
        >
          <Icon name="clipboard" size={12} />
          Switch to PROD
        </button>
      </div>
    </CollapsibleSection>
  );
};

export default EnvironmentInfo;
