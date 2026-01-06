/**
 * TrainingDataExport - Export training data for AI fine-tuning
 *
 * Extracted from AdminPanel.jsx - Super Admin only
 */

import React from "react";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";
import { downloadTrainingData } from "../../utils/analyticsStore";

const TrainingDataExport = ({ isCollapsed, onToggle }) => {
  return (
    <CollapsibleSection
      title="Training Data"
      icon="download"
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      variant="purple"
    >
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
    </CollapsibleSection>
  );
};

export default TrainingDataExport;
