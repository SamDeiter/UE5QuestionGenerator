/**
 * TrainingDataExport - Export training data for AI fine-tuning
 *
 * Extracted from AdminPanel.jsx - Super Admin only
 * Now includes:
 * - Original JSON export (all accepted questions)
 * - JSONL export of correction pairs for fine-tuning
 * - NEW: Combined export (corrections + rejected questions)
 */

import React, { useState } from "react";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";
import { downloadTrainingData } from "../../utils/analyticsStore";
import {
  downloadTrainingDataAsFile,
  downloadAllTrainingData,
} from "../../services/trainingDataService";
import { logger } from "../../utils/logger";
import { TOAST_DURATION } from "../../utils/constants";
import { useMessage } from "../../contexts/MessageContext";

const TrainingDataExport = ({ isCollapsed, onToggle }) => {
  const { showMessage } = useMessage();
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState(null);

  const handleExportCorrectionPairs = async () => {
    setIsExporting(true);
    setExportType("corrections");
    try {
      const result = await downloadTrainingDataAsFile();
      if (showMessage) {
        showMessage(
          `✅ Exported ${result.count} correction pairs as JSONL`,
          TOAST_DURATION.LONG
        );
      }
    } catch (error) {
      logger.error("Export failed:", error);
      if (showMessage) {
        showMessage(
          `❌ Export failed: ${error.message}`,
          TOAST_DURATION.EXTENDED
        );
      }
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    setExportType("all");
    try {
      const result = await downloadAllTrainingData();
      if (showMessage) {
        showMessage(
          `✅ Exported ${result.count} total records (${result.corrections} corrections, ${result.rejected} rejected)`,
          TOAST_DURATION.EXTENDED
        );
      }
    } catch (error) {
      logger.error("Export failed:", error);
      if (showMessage) {
        showMessage(
          `❌ Export failed: ${error.message}`,
          TOAST_DURATION.EXTENDED
        );
      }
    } finally {
      setIsExporting(false);
      setExportType(null);
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

        {/* Correction Pairs JSONL Export */}
        <button
          onClick={handleExportCorrectionPairs}
          disabled={isExporting}
          className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-600 disabled:to-slate-600 text-white rounded font-bold transition-all flex items-center justify-center gap-2"
        >
          {isExporting && exportType === "corrections" ? (
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
          Original vs. corrected pairs for fine-tuning
        </p>

        <hr className="border-slate-700" />

        {/* All Training Data (Corrections + Rejected) */}
        <button
          onClick={handleExportAll}
          disabled={isExporting}
          className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 disabled:from-slate-600 disabled:to-slate-600 text-white rounded font-bold transition-all flex items-center justify-center gap-2"
        >
          {isExporting && exportType === "all" ? (
            <>
              <Icon name="loader" className="animate-spin" size={16} />
              Exporting All...
            </>
          ) : (
            <>
              <Icon name="database" size={16} />
              Export All Training Data (JSONL)
            </>
          )}
        </button>
        <p className="text-xs text-slate-500 text-center">
          Corrections + rejected questions (negative examples)
        </p>
      </div>
    </CollapsibleSection>
  );
};

export default TrainingDataExport;
