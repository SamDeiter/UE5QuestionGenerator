import Icon from "./Icon";
import useConnectionStatus from "../hooks/useConnectionStatus";
import { signOutUser } from "../services/firebase";

const APP_VERSION = "v2.0";
const getVersionDisplay = () => {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "";
  console.log(
    "🔍 [Header] Project ID:",
    projectId,
    "| isProd:",
    projectId.includes("prod")
  );
  const isProd = projectId.includes("prod");
  return { version: `${APP_VERSION}-${isProd ? "PROD" : "DEV"}`, isProd };
};

const Header = ({
  apiKeyStatus,
  isCloudReady,
  onHome,
  creatorName,
  appMode,
  tokenUsage = { inputTokens: 0, outputTokens: 0, totalCost: 0 },
  _onRestartTutorial,
  onStartTutorial,
  isAdmin,
  onSignOut,
}) => {
  const connectionStatus = useConnectionStatus();
  const isReview = appMode === "review";
  const isAnalytics = appMode === "analytics";
  const borderColor = isReview
    ? "border-indigo-600"
    : isAnalytics
    ? "border-emerald-600"
    : "border-orange-600";
  const titleColor = isReview
    ? "text-indigo-50"
    : isAnalytics
    ? "text-emerald-50"
    : "text-orange-50";
  const headerBg = isReview
    ? "bg-slate-950 bg-gradient-to-r from-indigo-950/30 to-slate-950"
    : isAnalytics
    ? "bg-slate-950 bg-gradient-to-r from-emerald-950/30 to-slate-950"
    : "bg-slate-950";

  const totalTokens =
    (tokenUsage.inputTokens || 0) + (tokenUsage.outputTokens || 0);
  const formattedTokens =
    totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens;
  const formattedCost = (tokenUsage.totalCost || 0).toFixed(4);

  const getTitle = () => {
    if (isReview) return "Review & Audit Console";
    if (isAnalytics) return "Analytics Dashboard";
    return "UE5 Question Generator";
  };

  const getSubtitle = () => {
    if (isReview) return "Quality Assurance • Translation • Verification";
    if (isAnalytics)
      return "Generation Metrics • Quality Trends • URL Validation";
    return "Universal Scenario-Based Generator • Official Docs Only";
  };

  const getBadgeStyle = () => {
    if (isReview)
      return "bg-indigo-500/20 text-indigo-300 border-indigo-500/50";
    if (isAnalytics)
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
    if (appMode === "database")
      return "bg-blue-500/20 text-blue-300 border-blue-500/50";
    return "bg-orange-500/20 text-orange-300 border-orange-500/50";
  };

  const getBadgeText = () => {
    if (isReview) return "REVIEW MODE";
    if (isAnalytics) return "ANALYTICS";
    if (appMode === "database") return "DATABASE VIEW";
    return "CREATE MODE";
  };

  return (
    <header
      className={`${headerBg} text-white p-6 shadow-xl border-b ${borderColor} relative z-20 transition-all duration-500`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={onHome}
          title="Back to Home"
        >
          <div className="p-2 transition-colors duration-500">
            <img
              src="/UE5QuestionGenerator/logos/UE-Icon-2023-White.svg"
              alt="UE5 Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1
                className={`text-xl font-bold tracking-tight uppercase ${titleColor} transition-colors duration-500`}
              >
                {getTitle()}
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getBadgeStyle()}`}
              >
                {getBadgeText()}
              </span>
              {(() => {
                const { version, isProd } = getVersionDisplay();
                return (
                  <span
                    className={`text-xs font-mono border rounded px-1.5 py-0.5 ${
                      isProd
                        ? "text-red-400 border-red-800 bg-red-950/30"
                        : "text-green-400 border-green-800 bg-green-950/30"
                    }`}
                  >
                    {version}
                  </span>
                );
              })()}
            </div>
            <p className="text-slate-400 text-xs mt-0.5">{getSubtitle()}</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-xs font-mono">
          {creatorName && (
            <div className="flex items-center gap-1.5 font-bold text-slate-300 px-3 py-1 bg-slate-800/50 rounded-lg">
              <Icon
                name={isAdmin ? "shield-check" : "user"}
                size={14}
                className={isAdmin ? "text-orange-500" : "text-green-500"}
              />
              <span>{creatorName}</span>
              {isAdmin && (
                <span className="text-[10px] bg-orange-900/50 text-orange-400 px-1 py-0.5 rounded border border-orange-800 ml-1">
                  ADMIN
                </span>
              )}
              <button
                onClick={async () => {
                  if (onSignOut) onSignOut();
                  await signOutUser();
                }}
                className="ml-2 p-1 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                title="Sign Out"
              >
                <Icon name="log-out" size={14} />
              </button>
            </div>
          )}
          {/* Token & Cost Display */}
          <div
            className="flex items-center gap-2 px-3 py-1 rounded border border-slate-700 bg-slate-800/30"
            title={`Input: ${tokenUsage.inputTokens || 0} | Output: ${
              tokenUsage.outputTokens || 0
            }`}
          >
            <div className="flex items-center gap-1 text-purple-400">
              <Icon name="zap" size={12} />
              <span className="font-bold">{formattedTokens}</span>
              <span className="text-slate-500">tok</span>
            </div>
            <div className="w-px h-4 bg-slate-700"></div>
            <div className="flex items-center gap-1 text-emerald-400">
              <span className="text-slate-500">$</span>
              <span className="font-bold">{formattedCost}</span>
            </div>
          </div>
          {onStartTutorial &&
            ["create", "review", "database", "analytics"].includes(appMode) && (
              <button
                onClick={() => onStartTutorial(appMode)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-lg shadow-indigo-900/50"
                title={`Start ${appMode} tutorial`}
              >
                <Icon name="help-circle" size={14} />
                Tutorial
              </button>
            )}
          <div className="flex items-center gap-2 px-3 py-1 rounded border border-slate-700">
            {/* Connection Status */}
            {!connectionStatus.isOnline && (
              <div
                className="flex items-center gap-1.5 text-yellow-400 font-bold animate-pulse"
                title="You are offline. Changes will sync when connection is restored."
              >
                <Icon name="wifi-off" size={14} />
                <span>OFFLINE</span>
              </div>
            )}
            {connectionStatus.queuedCount > 0 && (
              <div
                className="flex items-center gap-1 text-orange-400 font-bold"
                title={`${connectionStatus.queuedCount} items queued for sync`}
              >
                <Icon name="upload-cloud" size={14} />
                <span>{connectionStatus.queuedCount}</span>
              </div>
            )}
            {connectionStatus.syncInProgress && (
              <div
                className="flex items-center gap-1 text-blue-400 font-bold animate-pulse"
                title="Syncing queued items..."
              >
                <Icon name="refresh-cw" size={14} className="animate-spin" />
                <span>SYNCING</span>
              </div>
            )}
            {(!connectionStatus.isOnline ||
              connectionStatus.queuedCount > 0 ||
              connectionStatus.syncInProgress) && (
              <div className="w-px h-4 bg-slate-700"></div>
            )}
            <span
              className={`font-bold ${
                apiKeyStatus.includes("Loaded") || apiKeyStatus.includes("Auto")
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              API Key: {apiKeyStatus}
            </span>
            {isCloudReady ? (
              (() => {
                const projectId =
                  import.meta.env.VITE_FIREBASE_PROJECT_ID || "";
                const isProd = projectId.includes("prod");
                const envLabel = isProd ? "PROD" : "DEV";
                const envColor = isProd ? "text-red-400" : "text-green-400";
                const dotColor = isProd ? "bg-red-500" : "bg-green-500";
                return (
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold border-l border-slate-700 pl-2 ml-2">
                    <div
                      className={`w-2 h-2 ${dotColor} rounded-full animate-pulse`}
                    ></div>
                    <span>CLOUD</span>
                    <span className={`${envColor} font-bold`}>{envLabel}</span>
                  </div>
                );
              })()
            ) : (
              <span className="text-orange-400 font-bold border-l border-slate-700 pl-2 ml-2">
                LOCAL MODE
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
