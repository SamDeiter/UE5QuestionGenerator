/**
 * CustomTagsEditor - Manage custom tags for questions
 *
 * Extracted from AdminPanel.jsx
 */

import React from "react";
import Icon from "../Icon";

const CustomTagsEditor = ({
  customTags,
  onSaveCustomTags,
  isCollapsed,
  onToggle,
}) => {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-orange-500/30">
      <h2
        onClick={onToggle}
        className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-orange-400 mb-3 flex items-center gap-2"
      >
        <div className="flex items-center gap-2">
          <Icon name="tag" size={18} /> Custom Tags
        </div>
        <Icon
          name={isCollapsed ? "chevron-down" : "chevron-up"}
          size={16}
          className="ml-auto opacity-50"
        />
      </h2>
      {!isCollapsed && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Custom Tags (comma separated)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customTags}
                onChange={(e) => onSaveCustomTags(e.target.value)}
                placeholder="e.g. priority, v2_audit, check_contrast"
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:border-orange-500 outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Tags available in the simplified tag selector
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomTagsEditor;
