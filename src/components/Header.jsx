import { useState, useEffect, useRef } from "react";
import Icon from "./Icon";
import useConnectionStatus from "../hooks/useConnectionStatus";
import { signOutUser } from "../services/firebase";
import { APP_VERSION } from "../utils/constants";

const getVersionDisplay = () => {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "";
  console.log(
    "🔍 [Header] Project ID:",
    projectId,
    "| isProd:",
    projectId.includes("prod")
  );
  const isProd = projectId.includes("prod");
  // Get git commit hash from build-time define (set in vite.config.js)
  const gitCommit = typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : '';
  const commitSuffix = gitCommit ? `-${gitCommit}` : '';
  return { version: `${APP_VERSION}${commitSuffix}-${isProd ? "PROD" : "DEV"}`, isProd };
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close mobile menu on ESC key or click outside
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener("keydown", handleEsc);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);
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
      role="banner"
      aria-label="Application header"
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
            <h1
              className={`text-xl font-bold tracking-tight uppercase ${titleColor} transition-colors duration-500`}
            >
              {getTitle()}
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">{getSubtitle()}</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs font-mono">
          {/* Mode Badge */}
          <span
            className={`flex items-center h-7 px-2.5 rounded text-[11px] font-semibold uppercase tracking-wider border whitespace-nowrap ${getBadgeStyle()}`}
          >
            {getBadgeText()}
          </span>
          {/* Tutorial Button - First */}
          {onStartTutorial &&
            ["create", "review", "database", "analytics"].includes(appMode) && (
              <button
                onClick={() => onStartTutorial(appMode)}
                className="flex items-center h-7 gap-1.5 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-lg shadow-indigo-900/50 whitespace-nowrap"
                title={`Start ${appMode} tutorial`}
              >
                <Icon name="help-circle" size={14} />
                Tutorial
              </button>
            )}
          {/* User Info */}
          {creatorName && (
            <div className="flex items-center h-7 gap-2 font-medium text-slate-300 px-3 bg-slate-800/50 rounded-lg whitespace-nowrap">
              <Icon
                name={isAdmin ? "shield-check" : "user"}
                size={14}
                className={isAdmin ? "text-orange-500" : "text-green-500"}
              />
              <span>{creatorName}</span>
              {isAdmin && (
                <span className="text-[11px] font-semibold bg-orange-900/50 text-orange-400 px-1.5 py-0.5 rounded border border-orange-800 ml-1">
                  ADMIN
                </span>
              )}
              <button
                onClick={async () => {
                  if (onSignOut) onSignOut();
                  await signOutUser();
                }}
                className="ml-2 p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                title="Sign Out"
                aria-label="Sign out of application"
              >
                <Icon name="log-out" size={14} />
              </button>
            </div>
          )}
          {/* Consolidated Status Box: Tokens | Cost | Connection | API Key | CLOUD v2.0-DEV */}
          <div
            className="flex items-center h-7 gap-2 px-3 rounded border border-slate-700 whitespace-nowrap"
            role="status"
            aria-live="polite"
            title={`Input: ${tokenUsage.inputTokens || 0} | Output: ${
              tokenUsage.outputTokens || 0
            }`}
          >
            {/* Token Display */}
            <div className="flex items-center gap-1.5 text-purple-400">
              <Icon name="zap" size={12} />
              <span className="font-semibold">{formattedTokens}</span>
              <span className="text-slate-500">tokens</span>
            </div>
            <div className="w-px h-4 bg-slate-700"></div>
            {/* Cost Display */}
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="text-slate-500">$</span>
              <span className="font-semibold">{formattedCost}</span>
            </div>
            {/* Connection Status (only if needed) */}
            {(!connectionStatus.isOnline ||
              connectionStatus.queuedCount > 0 ||
              connectionStatus.syncInProgress) && (
              <>
                <div className="w-px h-4 bg-slate-700"></div>
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
                    <Icon
                      name="refresh-cw"
                      size={14}
                      className="animate-spin"
                    />
                    <span>SYNCING</span>
                  </div>
                )}
              </>
            )}
            <div className="w-px h-4 bg-slate-700"></div>
            {/* API Key Status */}
            <span
              className={`font-semibold ${
                apiKeyStatus.includes("Loaded") ||
                apiKeyStatus.includes("Auto") ||
                apiKeyStatus.includes("Cloud")
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              API Key: {apiKeyStatus}
            </span>
            <div className="w-px h-4 bg-slate-700"></div>
            {/* Cloud/Local + Version indicator */}
            {(() => {
              const { version, isProd } = getVersionDisplay();
              const versionColor = isProd ? "text-red-400" : "text-green-400";
              if (isCloudReady) {
                return (
                  <div className="flex items-center gap-1.5 font-semibold whitespace-nowrap">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400">CLOUD</span>
                    <span className={versionColor}>{version}</span>
                  </div>
                );
              } else {
                return (
                  <div className="flex items-center gap-1.5 font-semibold whitespace-nowrap">
                    <span className="text-orange-400">LOCAL</span>
                    <span className={versionColor}>{version}</span>
                  </div>
                );
              }
            })()}
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          <Icon name={mobileMenuOpen ? "x" : "menu"} size={20} />
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          ref={menuRef}
          className="md:hidden absolute left-0 right-0 top-full bg-slate-900 border-b border-slate-700 shadow-xl z-30 animate-in slide-in-from-top-2 duration-200"
          role="menu"
        >
          <div className="max-w-7xl mx-auto p-4 flex flex-col gap-3 text-xs font-mono">
            {/* Mode Badge */}
            <div className="flex items-center justify-between">
              <span
                className={`flex items-center h-7 px-2.5 rounded text-[11px] font-semibold uppercase tracking-wider border whitespace-nowrap ${getBadgeStyle()}`}
              >
                {getBadgeText()}
              </span>
              {/* Version/Cloud Status */}
              {(() => {
                const { version, isProd } = getVersionDisplay();
                const versionColor = isProd ? "text-red-400" : "text-green-400";
                return (
                  <div className="flex items-center gap-1.5 font-semibold">
                    {isCloudReady ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-green-400">CLOUD</span>
                      </>
                    ) : (
                      <span className="text-orange-400">LOCAL</span>
                    )}
                    <span className={versionColor}>{version}</span>
                  </div>
                );
              })()}
            </div>

            {/* User Info */}
            {creatorName && (
              <div className="flex items-center justify-between py-2 border-t border-slate-700">
                <div className="flex items-center gap-2 font-medium text-slate-300">
                  <Icon
                    name={isAdmin ? "shield-check" : "user"}
                    size={14}
                    className={isAdmin ? "text-orange-500" : "text-green-500"}
                  />
                  <span>{creatorName}</span>
                  {isAdmin && (
                    <span className="text-[11px] font-semibold bg-orange-900/50 text-orange-400 px-1.5 py-0.5 rounded border border-orange-800">
                      ADMIN
                    </span>
                  )}
                </div>
                <button
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    if (onSignOut) onSignOut();
                    await signOutUser();
                  }}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                  aria-label="Sign out of application"
                >
                  <Icon name="log-out" size={16} />
                </button>
              </div>
            )}

            {/* Tutorial Button */}
            {onStartTutorial &&
              ["create", "review", "database", "analytics"].includes(
                appMode
              ) && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onStartTutorial(appMode);
                  }}
                  className="flex items-center justify-center h-10 gap-2 px-4 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-lg shadow-indigo-900/50"
                >
                  <Icon name="help-circle" size={16} />
                  Start Tutorial
                </button>
              )}

            {/* Stats Row */}
            <div className="flex items-center justify-between py-2 border-t border-slate-700 text-[11px]">
              <div className="flex items-center gap-3">
                {/* Tokens */}
                <div className="flex items-center gap-1 text-purple-400">
                  <Icon name="zap" size={12} />
                  <span className="font-semibold">{formattedTokens}</span>
                  <span className="text-slate-500">tok</span>
                </div>
                {/* Cost */}
                <div className="flex items-center gap-1 text-emerald-400">
                  <span className="text-slate-500">$</span>
                  <span className="font-semibold">{formattedCost}</span>
                </div>
              </div>
              {/* API Status */}
              <span
                className={`font-semibold ${
                  apiKeyStatus.includes("Loaded") ||
                  apiKeyStatus.includes("Auto") ||
                  apiKeyStatus.includes("Cloud")
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                API: {apiKeyStatus}
              </span>
            </div>

            {/* Connection Status (if offline or syncing) */}
            {(!connectionStatus.isOnline ||
              connectionStatus.queuedCount > 0 ||
              connectionStatus.syncInProgress) && (
              <div className="flex items-center gap-3 py-2 border-t border-slate-700">
                {!connectionStatus.isOnline && (
                  <div className="flex items-center gap-1.5 text-yellow-400 font-bold animate-pulse">
                    <Icon name="wifi-off" size={14} />
                    <span>OFFLINE</span>
                  </div>
                )}
                {connectionStatus.queuedCount > 0 && (
                  <div className="flex items-center gap-1 text-orange-400 font-bold">
                    <Icon name="upload-cloud" size={14} />
                    <span>{connectionStatus.queuedCount} queued</span>
                  </div>
                )}
                {connectionStatus.syncInProgress && (
                  <div className="flex items-center gap-1 text-blue-400 font-bold animate-pulse">
                    <Icon
                      name="refresh-cw"
                      size={14}
                      className="animate-spin"
                    />
                    <span>SYNCING</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
