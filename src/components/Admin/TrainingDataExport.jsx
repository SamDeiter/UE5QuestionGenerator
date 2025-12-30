/**
 * TrainingDataExport - Export training data for AI fine-tuning
 *
 * Extracted from AdminPanel.jsx - Super Admin only
 */

import React from "react";
import Icon from "../Icon";
import { downloadTrainingData } from "../../utils/analyticsStore";

const TrainingDataExport = ({ isCollapsed, onToggle }) => {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-purple-500/30">
      <h2
        onClick={onToggle}
        className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-purple-400 mb-3 flex items-center gap-2"
      >
        <div className="flex items-center gap-2">
          <Icon name="download" size={18} /> Training Data
        </div>
        <Icon
          name={isCollapsed ? "chevron-down" : "chevron-up"}
          size={16}
          className="ml-auto opacity-50"
        />
      </h2>
      {!isCollapsed && (
        <div className="space-y-3">
          <button
            onClick={() => downloadTrainingData()}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold transition-all flex items-center justify-center gap-2"
          >
            <Icon name="download" size={16} />
            Download Full Training Dataset (JSON)
          </button>
          <p className="text-xs text-slate-500 text-center">
            exports all accepted questions in a format suitable for Gemini
            fine-tuning
          </p>
        </div>
      )}
    </div>
  );
};

export default TrainingDataExport;
