import React from "react";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";

const ApiConfig = ({
  config,
  onChange,
  showApiKey,
  setShowApiKey,
  isCollapsed,
  onToggle,
  uiLabels,
}) => {
  return (
    <CollapsibleSection
      title="API Configuration"
      icon="key"
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      variant="indigo"
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
            {uiLabels.API_KEY_LABEL}
          </label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              name="apiKey"
              value={config.apiKey}
              onChange={onChange}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none pr-10"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <Icon name={showApiKey ? "eye-off" : "eye"} size={16} />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Required for generating questions. Stored locally.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
            {uiLabels.SHEET_URL_LABEL}
          </label>
          <input
            type="text"
            name="sheetUrl"
            value={config.sheetUrl}
            onChange={onChange}
            placeholder="https://script.google.com/..."
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:border-indigo-500 outline-none"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Required for Load/Export to Sheets.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Creator Name
            </label>
            <input
              type="text"
              name="creatorName"
              value={config.creatorName}
              onChange={onChange}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Reviewer Name
            </label>
            <input
              type="text"
              name="reviewerName"
              value={config.reviewerName}
              onChange={onChange}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};

export default ApiConfig;
