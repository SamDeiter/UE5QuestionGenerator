import { useState, useMemo } from "react";
import Icon from "./Icon";
import {
  exportToScorm,
  filterExportableQuestions,
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
const ScormExportModal = ({
  questions,
  allLanguageQuestions = [],
  discipline,
  onClose,
}) => {
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
  const [skipWarning, setSkipWarning] = useState(null);

  // Language variants share a uniqueId across rows; group the unfiltered
  // discipline set by language so we can offer per-language exports for the
  // same logical questions the user picked.
  const { questionsByLanguage, availableLanguages, countsByLanguage } =
    useMemo(() => {
      const uniqueIds = new Set(
        questions.map((q) => q.uniqueId || q.id).filter(Boolean)
      );
      const variantPool =
        allLanguageQuestions.length > 0 ? allLanguageQuestions : questions;
      const byLang = new Map();
      variantPool.forEach((q) => {
        const lang = q.language || "English";
        const key = q.uniqueId || q.id;
        // Only include variants of the questions the user actually selected.
        // If we couldn't derive uniqueIds (e.g. mock data missing them),
        // fall back to including everything so the export still works.
        if (uniqueIds.size > 0 && !uniqueIds.has(key)) return;
        if (!byLang.has(lang)) byLang.set(lang, []);
        byLang.get(lang).push(q);
      });
      // Sort with English first, then alphabetical.
      const langs = [...byLang.keys()].sort((a, b) => {
        if (a === "English") return -1;
        if (b === "English") return 1;
        return a.localeCompare(b);
      });
      const counts = {};
      langs.forEach((l) => {
        counts[l] = byLang.get(l).length;
      });
      return {
        questionsByLanguage: byLang,
        availableLanguages: langs,
        countsByLanguage: counts,
      };
    }, [questions, allLanguageQuestions]);

  const [selectedLanguages, setSelectedLanguages] = useState(
    () =>
      new Set(
        availableLanguages.includes("English")
          ? ["English"]
          : availableLanguages.slice(0, 1)
      )
  );

  const toggleLanguage = (lang) => {
    setSelectedLanguages((prev) => {
      const next = new Set(prev);
      if (next.has(lang)) next.delete(lang);
      else next.add(lang);
      return next;
    });
  };

  // Difficulty breakdown reflects the primary (user-selected) question set,
  // not the translated variants — counts are the same per uniqueId, and
  // showing per-language doesn't add information.
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
    setSkipWarning(null);

    if (selectedLanguages.size === 0) {
      setError("Select at least one language to export");
      return;
    }

    setIsExporting(true);

    const failures = [];
    const skipSummary = [];
    const langsToExport = availableLanguages.filter((l) =>
      selectedLanguages.has(l)
    );

    try {
      for (let i = 0; i < langsToExport.length; i++) {
        const lang = langsToExport[i];
        const langQuestions = questionsByLanguage.get(lang) || [];
        const { valid, skipped } = filterExportableQuestions(
          langQuestions,
          lang
        );
        if (skipped.length > 0) {
          skipSummary.push(`${lang}: ${skipped.length} skipped`);
        }
        if (valid.length === 0) {
          failures.push(`${lang}: no valid questions to export`);
          continue;
        }
        try {
          const result = await exportToScorm(valid, {
            ...config,
            language: lang,
            title:
              langsToExport.length > 1
                ? `${config.title} - ${lang}`
                : config.title,
          });
          logger.log(`SCORM export successful (${lang}):`, result);
        } catch (err) {
          logger.error(`SCORM export failed (${lang}):`, err);
          failures.push(`${lang}: ${err.message}`);
        }
        // Stagger downloads so the browser doesn't block subsequent ones.
        if (i < langsToExport.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (skipSummary.length > 0) {
        setSkipWarning(
          `Skipped invalid questions — ${skipSummary.join(", ")}. Check the console for details.`
        );
      }

      if (failures.length > 0) {
        setError(`Some exports failed: ${failures.join("; ")}`);
      } else if (skipSummary.length === 0) {
        // Clean run — close after a beat.
        setTimeout(() => {
          onClose();
        }, 1000);
      }
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

          {/* Languages */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              Languages to Export
            </label>
            {availableLanguages.length === 0 ? (
              <p className="text-xs text-slate-500">No questions to export.</p>
            ) : (
              <>
                <div className="bg-slate-800 rounded border border-slate-700 max-h-40 overflow-y-auto">
                  {availableLanguages.map((lang) => {
                    const isSelected = selectedLanguages.has(lang);
                    return (
                      <label
                        key={lang}
                        className={`flex items-center justify-between px-3 py-2 border-b border-slate-700 last:border-b-0 cursor-pointer hover:bg-slate-700/50 transition-colors ${
                          isSelected ? "" : "opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleLanguage(lang)}
                            className="w-4 h-4 accent-blue-500"
                            disabled={isExporting}
                          />
                          <span className="text-sm text-slate-300">{lang}</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {countsByLanguage[lang]} questions
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedLanguages.size > 1
                    ? `Generates ${selectedLanguages.size} separate SCORM zips, one per language.`
                    : "One SCORM zip will be downloaded."}
                </p>
                {availableLanguages.length === 1 && (
                  <p className="text-xs text-slate-500 mt-1">
                    No translated variants available for this question set.
                  </p>
                )}
              </>
            )}
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

          {/* Skip Warning */}
          {skipWarning && (
            <div className="bg-amber-900/20 border border-amber-500 rounded p-3">
              <p className="text-sm text-amber-300">{skipWarning}</p>
            </div>
          )}

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
            disabled={
              isExporting ||
              questions.length === 0 ||
              selectedLanguages.size === 0
            }
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
