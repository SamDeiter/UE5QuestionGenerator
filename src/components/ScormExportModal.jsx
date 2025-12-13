import { useState } from "react";
import Icon from "./Icon";
import {
  exportToScorm,
  validateQuestionsForExport,
} from "../services/scormExporter";

/**
 * SCORM Export Modal
 * Allows users to configure and export selected questions as SCORM 1.2 package
 */
const ScormExportModal = ({ questions, onClose }) => {
  const [config, setConfig] = useState({
    title: "UE5 Knowledge Assessment",
    description: "Test your Unreal Engine 5 knowledge",
    passingScore: 80,
    timeLimit: 30, // minutes
  });

  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

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
      console.warn("SCORM Export Warnings:", validation.warnings);
    }

    setIsExporting(true);

    try {
      const result = await exportToScorm(questions, config);
      console.log("SCORM export successful:", result);

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
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
            </select>
          </div>

          {/* Question Count */}
          <div className="bg-slate-800 rounded p-3 border border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Selected Questions:</span>
              <span className="font-bold text-blue-400">
                {questions.length}
              </span>
            </div>
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
