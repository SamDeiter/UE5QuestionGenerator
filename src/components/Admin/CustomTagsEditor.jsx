import React from "react";
import CollapsibleSection from "../CollapsibleSection";

const CustomTagsEditor = ({
  customTags,
  onSaveCustomTags,
  isCollapsed,
  onToggle,
}) => {
  return (
    <CollapsibleSection
      title="Custom Tags"
      icon="tag"
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      variant="orange"
    >
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
    </CollapsibleSection>
  );
};

export default CustomTagsEditor;
