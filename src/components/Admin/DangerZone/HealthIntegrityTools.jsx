import React from "react";
import Icon from "../../Icon";

const HealthIntegrityTools = ({ isRepairing, onRepair, repairResult }) => {
  return (
    <div className="bg-emerald-900/20 p-3 rounded border border-emerald-900/50 mb-3">
      <p className="text-xs text-emerald-300 mb-2 font-semibold">
        🛡️ Health & Integrity
      </p>
      <button
        onClick={onRepair}
        disabled={isRepairing}
        className="w-full px-4 py-2 bg-emerald-900/20 hover:bg-emerald-900/40 text-emerald-400 text-xs font-bold rounded border border-emerald-900/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isRepairing ? (
          <>
            <Icon name="loader" size={14} className="animate-spin" />{" "}
            Repairing...
          </>
        ) : (
          <>
            <Icon name="shield-check" size={14} /> Repair Statuses & Timestamps
          </>
        )}
      </button>
      {repairResult && (
        <p className="text-[10px] text-emerald-400 mt-2 text-center">
          ✓ {repairResult.message}
        </p>
      )}
      <p className="text-[9px] text-emerald-400/60 mt-1">
        Fixes "Other" statuses and misaligned timestamps.
      </p>
    </div>
  );
};

export default HealthIntegrityTools;
