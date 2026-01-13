/**
 * ConflictModal Component
 *
 * Displays version conflict resolution UI when two users edit the same question.
 *
 * Resolution Options:
 * 1. Discard Local Changes (reload server version) - SAFE
 * 2. Overwrite Server Changes (force local version) - DANGEROUS
 * 3. Manual Merge (review field-by-field) - ADVANCED
 */

import React, { useState } from "react";
import Icon from "./Icon";
import CollapsibleSection from "./CollapsibleSection";
import { useAccessibility } from "../contexts/AccessibilityContext";

const ConflictModal = ({ isOpen, onClose, conflictData, onResolve }) => {
  const { colorblindMode } = useAccessibility();
  const cb = colorblindMode;

  const [selectedOption, setSelectedOption] = useState(null);
  const [showDiff, setShowDiff] = useState(false);

  // Colorblind-safe colors - must use full class strings for Tailwind JIT
  const discardCardClasses =
    selectedOption === "DISCARD"
      ? cb
        ? "border-blue-500 bg-blue-900/20"
        : "border-green-500 bg-green-900/20"
      : cb
      ? "border-slate-700 bg-slate-800/30 hover:border-blue-500/50"
      : "border-slate-700 bg-slate-800/30 hover:border-green-500/50";
  const discardRadioClasses =
    selectedOption === "DISCARD"
      ? cb
        ? "border-blue-500 bg-blue-500"
        : "border-green-500 bg-green-500"
      : "border-slate-600";
  const discardTitleColor = cb ? "text-blue-400" : "text-green-400";
  const discardBadgeClasses = cb
    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
    : "bg-green-500/20 text-green-400 border-green-500/30";

  /**
   * Returns styles for the resolution button based on selected option
   */
  const getResolveButtonStyles = () => {
    if (selectedOption === "DISCARD") {
      return cb
        ? "bg-blue-600 hover:bg-blue-500 text-white"
        : "bg-green-600 hover:bg-green-500 text-white";
    }
    if (selectedOption === "OVERWRITE") {
      return cb
        ? "bg-rose-600 hover:bg-rose-500 text-white"
        : "bg-red-600 hover:bg-red-500 text-white";
    }
    return "bg-slate-700 text-slate-400 cursor-not-allowed";
  };

  /**
   * Returns text for the resolution button based on selected option
   */
  const getResolveButtonText = () => {
    if (selectedOption === "DISCARD") {
      return "Reload Latest Version";
    }
    if (selectedOption === "OVERWRITE") {
      return "Force Overwrite";
    }
    return "Select an Option";
  };

  if (!isOpen || !conflictData) return null;

  const { serverQuestion, serverVersion, localChanges, expectedVersion } =
    conflictData;

  const handleResolve = (action) => {
    if (onResolve) {
      onResolve(action);
    }
    onClose();
  };

  // Generate a simple diff view
  const renderDiff = () => {
    if (!serverQuestion || !localChanges) return null;

    const changedFields = Object.keys(localChanges).filter((key) => {
      return (
        JSON.stringify(localChanges[key]) !==
        JSON.stringify(serverQuestion[key])
      );
    });

    if (changedFields.length === 0) {
      return (
        <p className="text-slate-400 text-sm italic">No changes detected</p>
      );
    }

    return (
      <div className="space-y-4">
        {changedFields.map((field) => (
          <div
            key={field}
            className="border border-slate-700 rounded-lg p-4 bg-slate-900/50"
          >
            <h4 className="text-sm font-bold text-cyan-400 mb-2 uppercase tracking-wide">
              {field}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-red-400 font-semibold mb-1">
                  SERVER (v{serverVersion})
                </p>
                <pre className="text-xs text-slate-300 bg-red-900/20 p-2 rounded border border-red-800/50 overflow-auto max-h-32">
                  {JSON.stringify(serverQuestion[field], null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-xs text-yellow-400 font-semibold mb-1">
                  YOUR CHANGES (v{expectedVersion})
                </p>
                <pre className="text-xs text-slate-300 bg-yellow-900/20 p-2 rounded border border-yellow-800/50 overflow-auto max-h-32">
                  {JSON.stringify(localChanges[field], null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border-2 border-red-500/50 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 p-6 border-b border-red-500/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Icon
                  name="alert-triangle"
                  size={24}
                  className="text-red-400"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-red-400">
                  Version Conflict Detected
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Another user saved changes while you were editing
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <Icon name="x" size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Conflict Info */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-sm">
              <Icon name="info" size={16} className="text-cyan-400" />
              <span className="text-slate-300">
                You were editing version{" "}
                <span className="font-bold text-white">{expectedVersion}</span>,
                but the server is now at version{" "}
                <span className="font-bold text-white">{serverVersion}</span>.
              </span>
            </div>
          </div>

          {/* Resolution Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">
              Choose how to resolve:
            </h3>

            {/* Option 1: Discard (Recommended) */}
            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${discardCardClasses}`}
              onClick={() => setSelectedOption("DISCARD")}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center ${discardRadioClasses}`}
                >
                  {selectedOption === "DISCARD" && (
                    <Icon name="check" size={12} className="text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold ${discardTitleColor}`}>
                      Reload and Discard My Changes
                    </h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${discardBadgeClasses}`}
                    >
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    Safely reload the latest server version. Your changes will
                    be lost, but you can re-edit the updated question.
                  </p>
                </div>
              </div>
            </div>

            {/* Option 2: Overwrite (Dangerous) */}
            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedOption === "OVERWRITE"
                  ? "border-red-500 bg-red-900/20"
                  : "border-slate-700 bg-slate-800/30 hover:border-red-500/50"
              }`}
              onClick={() => setSelectedOption("OVERWRITE")}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center ${
                    selectedOption === "OVERWRITE"
                      ? "border-red-500 bg-red-500"
                      : "border-slate-600"
                  }`}
                >
                  {selectedOption === "OVERWRITE" && (
                    <Icon name="check" size={12} className="text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-red-400">
                      Overwrite Server Changes
                    </h4>
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                      DANGEROUS
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    Force save your changes.{" "}
                    <span className="text-red-400 font-semibold">
                      This will delete the other user's changes permanently.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <CollapsibleSection
              title={`${showDiff ? "Hide" : "View"} Detailed Changes`}
              icon="eye"
              isCollapsed={!showDiff}
              onToggle={() => setShowDiff(!showDiff)}
              variant="slate"
              className="!border-2 !border-slate-700 hover:!border-cyan-500/50 !p-1"
            >
              <div className="p-3 border border-slate-700 rounded-lg bg-slate-900/50">
                {renderDiff()}
              </div>
            </CollapsibleSection>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleResolve(selectedOption)}
              disabled={!selectedOption}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${getResolveButtonStyles()}`}
            >
              {getResolveButtonText()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictModal;
