import { useState, useMemo } from "react";
import Icon from "./Icon";
import {
  batchExportByDiscipline,
  groupQuestionsByLanguageAndDiscipline,
} from "../services/scormExporter";
import { logger } from "../utils/logger";

/**
 * Batch SCORM Export Modal
 * Export all questions grouped by discipline into separate SCORM packages
 */
const BatchScormExportModal = ({ questions, onClose }) => {
  const [config, setConfig] = useState({
    title: "UE5 Assessment",
    description: "Knowledge assessment",
    passingScore: 80,
    timeLimit: 45, // 45 minutes default
    questionsPerAttempt: 60, // Random questions selected per attempt
    shuffleQuestions: true, // Randomize question order
  });

  const [options, setOptions] = useState({
    downloadAsSingleZip: true,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Group questions by language+discipline; each becomes a separate package
  const groupedQuestions = useMemo(() => {
    return groupQuestionsByLanguageAndDiscipline(questions);
  }, [questions]);

  const groupKeys = Object.keys(groupedQuestions);

  // Track which groups (language+discipline combos) are selected for export
  const [selectedGroups, setSelectedGroups] = useState(
    () => new Set(groupKeys)
  );

  const toggleGroup = (key) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedGroups(new Set(groupKeys));
  const selectNone = () => setSelectedGroups(new Set());

  const handleExport = async () => {
    setError(null);
    setResult(null);
    setProgress({ current: 0, total: selectedGroups.size });
    setIsExporting(true);

    try {
      // Filter to only selected language+discipline groups
      const selectedQuestions = groupKeys
        .filter((key) => selectedGroups.has(key))
        .flatMap((key) => groupedQuestions[key].questions);

      if (selectedQuestions.length === 0) {
        setError("No packages selected for export");
        setIsExporting(false);
        return;
      }

      const exportResult = await batchExportByDiscipline(
        selectedQuestions,
        config,
        {
          downloadAsSingleZip: options.downloadAsSingleZip,
          onProgress: (p) => setProgress(p),
        }
      );

      logger.log("Batch SCORM export successful:", exportResult);
      setResult(exportResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg shadow-2xl max-w-lg w-full border border-slate-700 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="archive" size={20} />
            Batch SCORM Export
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
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Discipline Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-300">
                Packages to Export ({selectedGroups.size} of {groupKeys.length})
              </label>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={selectAll}
                  className="text-blue-400 hover:text-blue-300"
                  disabled={isExporting}
                >
                  Select All
                </button>
                <span className="text-slate-600">|</span>
                <button
                  onClick={selectNone}
                  className="text-blue-400 hover:text-blue-300"
                  disabled={isExporting}
                >
                  None
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Each language + discipline becomes its own SCORM package.
            </p>
            <div className="bg-slate-800 rounded border border-slate-700 max-h-40 overflow-y-auto">
              {groupKeys.map((key) => {
                const {
                  language,
                  discipline,
                  questions: groupQuestions,
                } = groupedQuestions[key];
                const questionCount = groupQuestions.length;
                const isSelected = selectedGroups.has(key);
                return (
                  <label
                    key={key}
                    className={`flex items-center justify-between px-3 py-2 border-b border-slate-700 last:border-b-0 cursor-pointer hover:bg-slate-700/50 transition-colors ${
                      isSelected ? "" : "opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleGroup(key)}
                        className="w-4 h-4 accent-blue-500"
                        disabled={isExporting}
                      />
                      <span className="text-sm text-slate-300">
                        <span className="text-slate-400 font-mono text-xs mr-2">
                          {language}
                        </span>
                        {discipline}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {questionCount} questions
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Base Title */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              Base Quiz Title
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none"
              placeholder="UE5 Assessment"
              disabled={isExporting}
            />
            <p className="text-xs text-slate-500 mt-1">
              Each package will be titled: "{config.title} - [Discipline]"
            </p>
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
          </div>

          {/* Time Limit */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              Time Limit Per Quiz
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
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
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
                min="10"
                max="200"
                value={config.questionsPerAttempt || ""}
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
                  ? `Each test loads ${config.questionsPerAttempt} random questions`
                  : "Use all available questions"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              All questions are exported; a random subset is selected each time
              the test loads.
            </p>
          </div>

          {/* Shuffle Option */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.shuffleQuestions}
                onChange={(e) =>
                  setConfig({ ...config, shuffleQuestions: e.target.checked })
                }
                className="w-4 h-4 accent-blue-500"
                disabled={isExporting}
              />
              <span className="text-sm text-slate-300">
                Randomize question order
              </span>
            </label>
            <p className="text-xs text-slate-500 ml-7 mt-1">
              Each test-taker gets questions in a different random order
            </p>
          </div>

          {/* Download Option */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.downloadAsSingleZip}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    downloadAsSingleZip: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-blue-500"
                disabled={isExporting}
              />
              <span className="text-sm text-slate-300">
                Download as single ZIP (contains all packages)
              </span>
            </label>
            <p className="text-xs text-slate-500 ml-7 mt-1">
              {options.downloadAsSingleZip
                ? "One download containing all discipline packages"
                : "Multiple downloads, one per discipline"}
            </p>
          </div>

          {/* Progress */}
          {isExporting && progress && (
            <div className="bg-slate-800 rounded p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">
                  Generating packages...
                </span>
                <span className="text-sm text-blue-400">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                  }}
                />
              </div>
              {progress.discipline && (
                <p className="text-xs text-slate-500 mt-2">
                  Processing: {progress.discipline} ({progress.questionCount}{" "}
                  questions)
                </p>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-green-900/20 border border-green-500 rounded p-4">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <Icon name="check-circle" size={20} />
                <span className="font-bold">Export Complete!</span>
              </div>
              <p className="text-sm text-slate-300">
                Generated {result.successfulExports} of{" "}
                {result.totalDisciplines} packages (one per language +
                discipline)
              </p>
              {result.masterFilename && (
                <p className="text-xs text-slate-500 mt-1">
                  Downloaded: {result.masterFilename}
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-700 shrink-0">
          <p className="text-xs text-slate-500">
            Total: {questions.length} questions across {groupKeys.length}{" "}
            language/discipline packages
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              disabled={isExporting}
            >
              {result ? "Close" : "Cancel"}
            </button>
            {!result && (
              <button
                onClick={handleExport}
                disabled={isExporting || selectedGroups.size === 0}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded font-semibold transition-colors flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <Icon name="loader" size={16} className="animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Icon name="download" size={16} />
                    Export All
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchScormExportModal;
