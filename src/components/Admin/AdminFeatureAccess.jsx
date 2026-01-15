import React from "react";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";

/**
 * AdminFeatureAccess Component
 *
 * Displays the feature access comparison between Reviewers and Admins.
 */
const AdminFeatureAccess = ({ isCollapsed, onToggle }) => {
  return (
    <CollapsibleSection
      title="Feature Access Overview"
      icon="eye"
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      variant="blue"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reviewers Card */}
        <div className="bg-slate-800/50 p-4 rounded border border-blue-500/30">
          <h3 className="text-sm font-bold text-blue-400 mb-3">
            🔍 Reviewers (Limited Access)
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <Icon name="list-checks" size={12} className="text-blue-400" />
              Review Mode (view & approve questions)
            </li>
            <li className="flex items-center gap-2">
              <Icon name="database" size={12} className="text-blue-400" />
              Database View (Extended Access)
            </li>
            <li className="flex items-center gap-2">
              <Icon name="bar-chart-2" size={12} className="text-blue-400" />
              Analytics Dashboard
            </li>
            <li className="flex items-center gap-2 text-slate-500">
              <Icon name="x" size={12} className="text-red-400" />
              <span className="line-through">Create Questions</span>
            </li>
            <li className="flex items-center gap-2 text-slate-500">
              <Icon name="x" size={12} className="text-red-400" />
              <span className="line-through">Admin Panel</span>
            </li>
          </ul>
        </div>

        {/* Admins Card */}
        <div className="bg-slate-800/50 p-4 rounded border border-purple-500/30">
          <h3 className="text-sm font-bold text-purple-400 mb-3">
            👑 Admins (Full Access)
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <Icon name="check" size={12} className="text-purple-400" />
              All Reviewer Features
            </li>
            <li className="flex items-center gap-2">
              <Icon name="plus-circle" size={12} className="text-purple-400" />
              Create Mode (generate questions)
            </li>
            <li className="flex items-center gap-2">
              <Icon
                name="clipboard-list"
                size={12}
                className="text-purple-400"
              />
              Test View (experimental features)
            </li>
            <li className="flex items-center gap-2">
              <Icon name="terminal" size={12} className="text-purple-400" />
              Prompt Lab (AI testing)
            </li>
            <li className="flex items-center gap-2">
              <Icon name="shield" size={12} className="text-purple-400" />
              Admin Panel (user management)
            </li>
            <li className="flex items-center gap-2">
              <Icon name="database" size={12} className="text-purple-400" />
              Database Editing (full CRUD)
            </li>
          </ul>
        </div>
      </div>
    </CollapsibleSection>
  );
};

export default AdminFeatureAccess;
