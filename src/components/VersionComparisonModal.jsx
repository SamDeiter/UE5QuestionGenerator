/**
 * VersionComparisonModal - Shows side-by-side comparison of Original vs AI Rewrite
 *
 * Allows reviewers to choose which version to use when both exist.
 */
import { useState } from "react";
import Icon from "./Icon";

const VersionComparisonModal = ({
  isOpen,
  onClose,
  originalVersion,
  aiRewrite,
  _currentQuestion,
  onUseOriginal,
  onUseAIRewrite,
  versionSource, // 'original' | 'ai_rewrite' | 'human_edited'
}) => {
  const [selectedTab, setSelectedTab] = useState("comparison"); // 'comparison' | 'original' | 'ai'

  if (!isOpen) return null;

  const hasOriginal = originalVersion?.question;
  const hasAI = aiRewrite?.question;

  // Get version badge styling
  const getVersionBadge = (source) => {
    switch (source) {
      case "ai_rewrite":
        return {
          text: "AI Rewrite",
          bgColor: "bg-purple-600",
          icon: "sparkles",
        };
      case "human_edited":
        return { text: "Human Edited", bgColor: "bg-amber-600", icon: "edit" };
      default:
        return {
          text: "Original",
          bgColor: "bg-emerald-600",
          icon: "file-text",
        };
    }
  };

  const renderQuestionCard = (title, data, isActive, badgeInfo) => (
    <div
      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
        isActive
          ? "border-blue-500 bg-blue-950/30"
          : "border-slate-700 bg-slate-900/50"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon name={badgeInfo.icon} size={16} className="text-slate-400" />
          <span className="font-semibold text-white">{title}</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium text-white ${badgeInfo.bgColor}`}
        >
          {badgeInfo.text}
        </span>
      </div>

      {/* Question Text */}
      <div className="mb-4">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
          Question
        </div>
        <p className="text-slate-200 text-sm leading-relaxed">
          {data?.question || "N/A"}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <div className="text-xs text-slate-500 uppercase tracking-wide">
          Options
        </div>
        {["A", "B", "C", "D"].map((letter) => {
          const isCorrect = data?.correct === letter;
          return (
            <div
              key={letter}
              className={`flex gap-2 p-2 rounded-lg text-sm ${
                isCorrect
                  ? "bg-emerald-900/30 border border-emerald-700"
                  : "bg-slate-800/50"
              }`}
            >
              <span
                className={`font-bold ${
                  isCorrect ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                {letter}.
              </span>
              <span
                className={isCorrect ? "text-emerald-200" : "text-slate-300"}
              >
                {data?.options?.[letter] || "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="mt-4 flex items-center gap-2 text-blue-400 text-sm">
          <Icon name="check-circle" size={16} />
          <span>Currently Active</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <Icon name="git-compare" size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Compare Versions</h2>
              <p className="text-sm text-slate-400">
                Choose which version to use for this question
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Icon name="x" size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-4 border-b border-slate-800">
          {[
            { id: "comparison", label: "Side by Side", icon: "columns" },
            { id: "original", label: "Original Only", icon: "file-text" },
            { id: "ai", label: "AI Rewrite Only", icon: "sparkles" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              <Icon name={tab.icon} size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {selectedTab === "comparison" && (
            <div className="flex gap-4">
              {hasOriginal &&
                renderQuestionCard(
                  "Original Version",
                  originalVersion,
                  versionSource === "original",
                  getVersionBadge("original"),
                )}
              {hasAI &&
                renderQuestionCard(
                  "AI Rewrite",
                  aiRewrite,
                  versionSource === "ai_rewrite",
                  getVersionBadge("ai_rewrite"),
                )}
              {!hasOriginal && !hasAI && (
                <div className="text-center text-slate-500 py-8">
                  No version comparison available.
                </div>
              )}
            </div>
          )}

          {selectedTab === "original" && hasOriginal && (
            <div className="max-w-2xl mx-auto">
              {renderQuestionCard(
                "Original Version",
                originalVersion,
                versionSource === "original",
                getVersionBadge("original"),
              )}
            </div>
          )}

          {selectedTab === "ai" && hasAI && (
            <div className="max-w-2xl mx-auto">
              {renderQuestionCard(
                "AI Rewrite",
                aiRewrite,
                versionSource === "ai_rewrite",
                getVersionBadge("ai_rewrite"),
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-slate-700 bg-slate-900/50">
          <p className="text-sm text-slate-400">
            <Icon name="info" size={14} className="inline mr-1" />
            Selecting a version will update the question. This action can be
            undone by reopening this dialog.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            {hasOriginal && versionSource !== "original" && (
              <button
                onClick={() => {
                  onUseOriginal();
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
              >
                <Icon name="undo-2" size={16} />
                Use Original
              </button>
            )}
            {hasAI && versionSource !== "ai_rewrite" && (
              <button
                onClick={() => {
                  onUseAIRewrite();
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
              >
                <Icon name="sparkles" size={16} />
                Use AI Rewrite
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionComparisonModal;
