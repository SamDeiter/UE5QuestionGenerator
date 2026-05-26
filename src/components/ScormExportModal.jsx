import { useState, useMemo } from "react";
import Icon from "./Icon";
import {
  exportToScorm,
  validateQuestionsForExport,
} from "../services/scormExporter";
import { logger } from "../utils/logger";
import {
  bucketByDifficulty,
  simulateAttemptDistribution,
} from "../utils/quizUtils";

/**
 * SCORM Export Modal
 * Allows users to configure and export selected questions as SCORM 1.2 package
 */
const ScormExportModal = ({ questions, discipline, onClose }) => {
  // Auto-generate title based on discipline
  const defaultTitle = discipline
    ? `UE5 ${discipline} Assessment`
    : "UE5 Knowledge Assessment";

  const [config, setConfig] = useState({
    title: defaultTitle,
    description: `Test your Unreal Engine 5 ${discipline || "knowledge"}`,
    passingScore: 80,
    timeLimit: 60, // minutes (default: 1 hour)
    questionsPerAttempt: 60, // Random subset drawn per attempt; null = use all
  });

  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  // Count questions by difficulty (handles both "Easy/Medium/Hard" and
  // "Beginner/Intermediate/Expert" vocabularies — see classifyDifficulty).
  const difficultyBreakdown = useMemo(
    () => bucketByDifficulty(questions),
    [questions]
  );

  // Simulate what one quiz attempt will actually contain at runtime, so the
  // modal reflects the SCORM template's weighted distribution instead of a
  // hardcoded "20 of each" promise.
  const attemptPreview = useMemo(
    () =>
      simulateAttemptDistribution(difficultyBreakdown, {
        questionsPerAttempt: config.questionsPerAttempt,
      }),
    [difficultyBreakdown, config.questionsPerAttempt]
  );

  const handleExport = async () => {
    setError(null);

    // Validate questions
    const validation = validateQuestionsForExport(questions);

    if (!validation.valid) {
      setError(validation.errors.join(", "));
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      logger.warn("SCORM Export Warnings:", validation.warnings);
    }

    setIsExporting(true);

    try {
      const result = await exportToScorm(questions, config);
      logger.log("SCORM export successful:", result);

      // Close modal after successful export
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg shadow-2xl max-w-md w-full border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="download" size={20} />
            Export to SCORM 1.2
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            disabled={isExporting}
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Quiz Title */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              Quiz Title
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none"
              placeholder="UE5 Knowledge Assessment"
              disabled={isExporting}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={config.description}
              onChange={(e) =>
                setConfig({ ...config, description: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none resize-none"
              rows={2}
              placeholder="Brief description of the assessment"
              disabled={isExporting}
            />
          </div>

          {/* Passing Score */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              Passing Score: {config.passingScore}%
            </label>
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={config.passingScore}
              onChange={(e) =>
                setConfig({ ...config, passingScore: parseInt(e.target.value) })
              }
              className="w-full"
              disabled={isExporting}
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Time Limit */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              Time Limit
            </label>
            <select
              value={config.timeLimit}
              onChange={(e) =>
                setConfig({ ...config, timeLimit: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none"
              disabled={isExporting}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes (1 hour)</option>
            </select>
          </div>

          {/* Questions Per Attempt */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              Questions Per Attempt
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="500"
                value={config.questionsPerAttempt ?? ""}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    questionsPerAttempt: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                className="w-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none"
                placeholder="All"
                disabled={isExporting}
              />
              <span className="text-xs text-slate-500">
                {config.questionsPerAttempt
                  ? `Each test-taker gets ${config.questionsPerAttempt} random questions`
                  : "Leave blank to use the full bank per attempt"}
              </span>
            </div>
          </div>

          {/* Question Bank Info */}
          <div className="bg-slate-800 rounded p-3 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Question Bank:</span>
              <span className="font-bold text-blue-400">
                {difficultyBreakdown.total} questions
              </span>
            </div>
            <div className="flex gap-2 text-xs flex-wrap">
              <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded">
                Easy: {difficultyBreakdown.easy}
              </span>
              <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded">
                Med: {difficultyBreakdown.medium}
              </span>
              <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded">
                Hard: {difficultyBreakdown.hard}
              </span>
              {difficultyBreakdown.other > 0 && (
                <span
                  className="px-2 py-1 bg-slate-700/60 text-slate-300 rounded"
                  title="Questions whose difficulty value didn't match Easy/Beginner, Medium/Intermediate, or Hard/Expert"
                >
                  Other: {difficultyBreakdown.other}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              📋 Each attempt draws ~{attemptPreview.easy} Easy /{" "}
              {attemptPreview.medium} Medium / {attemptPreview.hard} Hard
              {attemptPreview.other > 0
                ? ` + ${attemptPreview.other} uncategorized`
                : ""}{" "}
              = {attemptPreview.total} questions (weighted 15% / 35% / 50%,
              redistributed when a pool is empty).
            </p>
            {(difficultyBreakdown.easy === 0 ||
              difficultyBreakdown.hard === 0) && (
              <p className="text-xs text-amber-400/90 mt-2">
                ⚠ Your question bank is missing{" "}
                {[
                  difficultyBreakdown.easy === 0 && "Easy / Beginner",
                  difficultyBreakdown.hard === 0 && "Hard / Expert",
                ]
                  .filter(Boolean)
                  .join(" and ")}{" "}
                questions. Every attempt will skew toward the difficulties you
                have.
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || questions.length === 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded font-semibold transition-colors flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Icon name="loader" size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Icon name="download" size={16} />
                Generate Package
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScormExportModal;
