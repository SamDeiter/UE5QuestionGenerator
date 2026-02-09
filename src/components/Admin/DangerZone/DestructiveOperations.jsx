import React from "react";
import Icon from "../../Icon";

const DestructiveOperations = ({
  onClearLocal,
  onFactoryReset,
  isResetting,
  isAdmin,
  onNukeAll,
  isNuking,
  nukeProgress,
}) => {
  return (
    <div className="space-y-3">
      <button
        onClick={onClearLocal}
        className="w-full px-4 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 text-sm font-bold rounded border border-red-900/50 transition-colors flex items-center justify-center gap-2"
      >
        <Icon name="trash-2" size={16} />
        Clear Local Data (Keep Cloud Backup)
      </button>

      <button
        onClick={onFactoryReset}
        disabled={isResetting}
        className="w-full px-4 py-3 bg-red-950 hover:bg-red-900 text-red-500 text-sm font-bold rounded border-2 border-red-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isResetting ? (
          <>
            <Icon name="loader" size={16} className="animate-spin" />{" "}
            Resetting...
          </>
        ) : (
          <>
            <Icon name="bomb" size={16} /> FACTORY RESET (Delete Everything)
          </>
        )}
      </button>

      {/* Admin-only: Nuke All Questions */}
      {isAdmin && (
        <div className="mt-4 pt-4 border-t border-red-900/50">
          <p className="text-[10px] text-orange-400 mb-2 font-semibold">
            🔐 ADMIN ONLY
          </p>
          <button
            onClick={onNukeAll}
            disabled={isNuking}
            className="w-full px-4 py-3 bg-orange-950 hover:bg-orange-900 text-orange-400 text-sm font-bold rounded border-2 border-orange-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isNuking ? (
              <>
                <Icon name="loader" size={16} className="animate-spin" />
                Nuking... ({nukeProgress.current}/{nukeProgress.total})
              </>
            ) : (
              <>
                <Icon name="zap" size={16} /> NUKE ALL QUESTIONS (All Users)
              </>
            )}
          </button>
          <p className="text-[9px] text-orange-400/60 mt-1 text-center">
            Deletes ALL questions from ALL users in the database
          </p>
        </div>
      )}
    </div>
  );
};

export default DestructiveOperations;
