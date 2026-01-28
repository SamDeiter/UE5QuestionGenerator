/**
 * HeaderStatusBar - Displays token usage, cost, connection status, and API indicators
 */
import Icon from "../Icon";
import { triggerManualSync, clearOfflineQueue } from "../../services/firebase";
import { useAccessibility } from "../../contexts/AccessibilityContext";

const HeaderStatusBar = ({
  formattedTokens,
  tokenUsage,
  connectionStatus,
  apiKeyStatus,
  isCloudReady,
}) => {
  const { colorblindMode } = useAccessibility();
  const cb = colorblindMode;

  // Colorblind-safe colors
  const successText = cb ? "text-blue-400" : "text-green-400";
  const errorText = cb ? "text-rose-400" : "text-red-400";
  const successBg = cb ? "bg-blue-500" : "bg-green-500";

  return (
    <div
      className="flex items-center h-7 gap-1.5 px-2 rounded border border-slate-700 whitespace-nowrap text-[10px]"
      role="status"
      aria-live="polite"
      title={`Input: ${tokenUsage.inputTokens || 0} | Output: ${
        tokenUsage.outputTokens || 0
      }`}
    >
      {/* Token Display */}
      <div className="flex items-center gap-1 text-purple-400">
        <Icon name="zap" size={10} />
        <span className="font-semibold">{formattedTokens}</span>
      </div>
      <div className="w-px h-3 bg-slate-700"></div>
      {/* Connection Status (only if needed) */}
      {(!connectionStatus.isOnline ||
        connectionStatus.queuedCount > 0 ||
        connectionStatus.syncInProgress) && (
        <>
          <div className="w-px h-3 bg-slate-700"></div>
          {!connectionStatus.isOnline && (
            <div
              className="flex items-center gap-1 text-yellow-400 font-bold animate-pulse"
              title="You are offline. Changes will sync when connection is restored."
            >
              <Icon name="wifi-off" size={12} />
              <span>OFFLINE</span>
            </div>
          )}
          {connectionStatus.queuedCount > 0 && (
            <div className="flex items-center gap-1.5 px-1 bg-slate-800/80 rounded-lg group relative">
              <button
                onClick={triggerManualSync}
                className="flex items-center gap-0.5 text-orange-400 font-bold hover:text-orange-300 transition-colors py-0.5"
                aria-label={`${connectionStatus.queuedCount} items queued. Click to sync now.`}
              >
                <Icon name="upload-cloud" size={12} />
                <span>{connectionStatus.queuedCount}</span>
                <span className="text-[8px] ml-0.5">SYNC</span>
              </button>
              {/* Tooltip for queue details */}
              <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                <div className="text-[10px] font-bold text-slate-300 border-b border-slate-800 pb-1.5 mb-2 flex justify-between items-center">
                  PENDING SYNC
                  <span className="text-orange-500 font-mono">
                    {connectionStatus.queuedCount}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {connectionStatus.queueDetails?.items
                    ?.slice(0, 5)
                    .map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-400 truncate max-w-[100px]">
                            {item.text || item.id}
                          </span>
                          <span className="text-[8px] font-bold px-1 rounded bg-slate-800 text-slate-500 uppercase">
                            {item.status || "draft"}
                          </span>
                        </div>
                        <div className="text-[8px] text-slate-600 font-mono">
                          {item.timestamp
                            ? new Date(item.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Pending..."}
                        </div>
                      </div>
                    ))}
                  {connectionStatus.queuedCount > 5 && (
                    <div className="text-[8px] text-slate-500 italic pt-1 text-right">
                      ...and {connectionStatus.queuedCount - 5} more
                    </div>
                  )}
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-800 flex gap-1 pointer-events-auto">
                  <button
                    onClick={triggerManualSync}
                    className="flex-1 text-[9px] font-bold uppercase tracking-wide bg-blue-600 hover:bg-blue-500 text-white rounded px-2 py-1 transition-colors"
                  >
                    Retry Sync
                  </button>
                  <button
                    onClick={() => {
                      clearOfflineQueue();
                      window.location.reload();
                    }}
                    className="flex-1 text-[9px] font-bold uppercase tracking-wide bg-red-600 hover:bg-red-500 text-white rounded px-2 py-1 transition-colors"
                  >
                    Clear Queue
                  </button>
                </div>
              </div>
            </div>
          )}
          {connectionStatus.syncInProgress && (
            <div
              className="flex items-center gap-0.5 text-blue-400 font-bold px-1"
              title="Synchronization in progress..."
            >
              <Icon name="refresh-cw" size={12} className="animate-spin" />
              <span>SYNC</span>
            </div>
          )}
        </>
      )}
      <div className="w-px h-3 bg-slate-700"></div>
      {/* API Key Status - Shortened */}
      <span
        className={`font-semibold ${
          apiKeyStatus.includes("Loaded") ||
          apiKeyStatus.includes("Auto") ||
          apiKeyStatus.includes("Cloud")
            ? successText
            : errorText
        }`}
      >
        API: {apiKeyStatus}
      </span>
      <div className="w-px h-3 bg-slate-700"></div>
      {/* Cloud/Local indicator */}
      {isCloudReady ? (
        <div className="flex items-center gap-1 font-semibold whitespace-nowrap">
          <div
            className={`w-1.5 h-1.5 ${successBg} rounded-full animate-pulse`}
          ></div>
          <span className={successText}>CLOUD</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 font-semibold whitespace-nowrap">
          <span className="text-orange-400">LOCAL</span>
        </div>
      )}
    </div>
  );
};

export default HeaderStatusBar;
