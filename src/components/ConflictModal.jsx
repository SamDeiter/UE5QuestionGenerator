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

const ConflictModal = ({ isOpen, onClose, conflictData, onResolve }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [showDiff, setShowDiff] = useState(false);

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
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedOption === "DISCARD"
                  ? "border-green-500 bg-green-900/20"
                  : "border-slate-700 bg-slate-800/30 hover:border-green-500/50"
              }`}
              onClick={() => setSelectedOption("DISCARD")}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center ${
                    selectedOption === "DISCARD"
                      ? "border-green-500 bg-green-500"
                      : "border-slate-600"
                  }`}
                >
                  {selectedOption === "DISCARD" && (
                    <Icon name="check" size={12} className="text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-green-400">
                      Reload and Discard My Changes
                    </h4>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
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

            {/* Option 3: View Diff */}
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="w-full border-2 border-slate-700 rounded-lg p-4 bg-slate-800/30 hover:border-cyan-500/50 transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="eye" size={20} className="text-cyan-400" />
                  <span className="font-semibold text-white">
                    {showDiff ? "Hide" : "View"} Detailed Changes
                  </span>
                </div>
                <Icon
                  name={showDiff ? "chevron-up" : "chevron-down"}
                  size={20}
                  className="text-slate-400"
                />
              </div>
            </button>

            {/* Diff View */}
            {showDiff && (
              <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/50">
                {renderDiff()}
              </div>
            )}
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
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                selectedOption === "DISCARD"
                  ? "bg-green-600 hover:bg-green-500 text-white"
                  : selectedOption === "OVERWRITE"
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-slate-700 text-slate-400 cursor-not-allowed"
              }`}
            >
              {selectedOption === "DISCARD"
                ? "Reload Latest Version"
                : selectedOption === "OVERWRITE"
                ? "Force Overwrite"
                : "Select an Option"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictModal;
