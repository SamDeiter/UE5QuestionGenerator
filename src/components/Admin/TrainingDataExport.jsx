/**
 * TrainingDataExport - Export training data for AI fine-tuning
 *
 * Extracted from AdminPanel.jsx - Super Admin only
 * Now includes:
 * - Original JSON export (all accepted questions)
 * - NEW: JSONL export of correction pairs for fine-tuning
 */

import React, { useState } from "react";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";
import { downloadTrainingData } from "../../utils/analyticsStore";
import { downloadTrainingDataAsFile } from "../../services/trainingDataService";

const TrainingDataExport = ({ isCollapsed, onToggle, showMessage }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCorrectionPairs = async () => {
    setIsExporting(true);
    try {
      const result = await downloadTrainingDataAsFile();
      if (showMessage) {
        showMessage(
          `✅ Exported ${result.count} correction pairs as JSONL`,
          3000
        );
      }
    } catch (error) {
      console.error("Export failed:", error);
      if (showMessage) {
        showMessage(`❌ Export failed: ${error.message}`, 5000);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <CollapsibleSection
      title="Training Data"
      icon="download"
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      variant="purple"
    >
      <div className="space-y-3">
        {/* Original JSON Export */}
        <button
          onClick={() => downloadTrainingData()}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold transition-all flex items-center justify-center gap-2"
        >
          <Icon name="download" size={16} />
          Download Accepted Questions (JSON)
        </button>
        <p className="text-xs text-slate-500 text-center">
          All accepted questions in JSON format
        </p>

        <hr className="border-slate-700" />

        {/* NEW: Correction Pairs JSONL Export */}
        <button
          onClick={handleExportCorrectionPairs}
          disabled={isExporting}
          className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-600 disabled:to-slate-600 text-white rounded font-bold transition-all flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <Icon name="loader" className="animate-spin" size={16} />
              Exporting...
            </>
          ) : (
            <>
              <Icon name="file-text" size={16} />
              Export Correction Pairs (JSONL)
            </>
          )}
        </button>
        <p className="text-xs text-slate-500 text-center">
          Original vs. corrected pairs for Vertex AI/Gemini fine-tuning
        </p>
      </div>
    </CollapsibleSection>
  );
};

export default TrainingDataExport;
