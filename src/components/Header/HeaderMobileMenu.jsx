/**
 * HeaderMobileMenu - Mobile dropdown menu for header
 */
import { forwardRef } from "react";
import Icon from "../Icon";
import Button from "../ui/Button";
import HeaderUserInfo from "./HeaderUserInfo";
import { APP_MODES } from "../../utils/constants";
import { useAccessibility } from "../../contexts/AccessibilityContext";

const HeaderMobileMenu = forwardRef(
  (
    {
      isCloudReady,
      getVersionDisplay,
      getBadgeStyle,
      getBadgeText,
      creatorName,
      isAdmin,
      isSuperAdmin,
      onSignOut,
      appMode,
      onStartTutorial,
      formattedTokens,
      formattedCost,
      apiKeyStatus,
      connectionStatus,
      onClose,
    },
    ref
  ) => {
    const { colorblindMode } = useAccessibility();
    const cb = colorblindMode;

    // Colorblind-safe colors
    const successColor = cb ? "text-blue-400" : "text-green-400";
    const successBg = cb ? "bg-blue-500" : "bg-green-500";
    const errorColor = cb ? "text-rose-400" : "text-red-400";

    const { version, isProd } = getVersionDisplay();
    const versionColor = isProd ? errorColor : successColor;

    return (
      <div
        id="mobile-menu"
        ref={ref}
        className="lg:hidden absolute left-0 right-0 top-full bg-slate-900 border-b border-slate-700 shadow-xl z-30 animate-in slide-in-from-top-2 duration-200"
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
            <div className="flex items-center gap-1.5 font-semibold">
              {isCloudReady ? (
                <>
                  <div
                    className={`w-2 h-2 ${successBg} rounded-full animate-pulse`}
                  />
                  <span className={successColor}>CLOUD</span>
                </>
              ) : (
                <span className="text-orange-400">LOCAL</span>
              )}
              <span className={versionColor}>{version}</span>
            </div>
          </div>

          {/* User Info */}
          <HeaderUserInfo
            creatorName={creatorName}
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
            onSignOut={onSignOut}
            compact={false}
            onMenuClose={onClose}
          />

          {/* Tutorial Button */}
          {onStartTutorial &&
            [
              APP_MODES.CREATE,
              APP_MODES.REVIEW,
              APP_MODES.DATABASE,
              APP_MODES.ANALYTICS,
            ].includes(appMode) && (
              <Button
                onClick={() => {
                  onClose();
                  onStartTutorial(appMode);
                }}
                size="sm"
                variant="primary"
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50"
              >
                <Icon name="help-circle" size={16} />
                Start Tutorial
              </Button>
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
                  ? successColor
                  : errorColor
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
                  <Icon name="refresh-cw" size={14} className="animate-spin" />
                  <span>SYNCING</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

HeaderMobileMenu.displayName = "HeaderMobileMenu";

export default HeaderMobileMenu;
