import React from "react";
import Icon from "../../Icon";

const MigrationTools = ({
  isMigrating,
  onBackfill,
  migrationResult,
  colorblindMode,
}) => {
  return (
    <div className="bg-blue-900/20 p-3 rounded border border-blue-900/50 mb-3">
      <p className="text-xs text-blue-300 mb-2 font-semibold">
        🔧 Data Migration
      </p>
      <button
        onClick={onBackfill}
        disabled={isMigrating}
        className="w-full px-4 py-2 bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 text-xs font-bold rounded border border-blue-900/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isMigrating ? (
          <>
            <Icon name="loader" size={14} className="animate-spin" />{" "}
            Migrating...
          </>
        ) : (
          <>
            <Icon name="user-check" size={14} /> Backfill Creator Names
          </>
        )}
      </button>
      {migrationResult && (
        <p
          className={`text-xs ${colorblindMode ? "text-blue-400" : "text-green-400"} mt-2 text-center`}
        >
          ✓ {migrationResult.message}
        </p>
      )}
      <p className="text-[9px] text-blue-400/60 mt-1">
        Adds your name to questions showing "N/A"
      </p>
    </div>
  );
};

export default MigrationTools;
