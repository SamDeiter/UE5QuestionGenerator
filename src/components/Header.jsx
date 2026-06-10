/**
 * Header - Main application header with responsive design
 *
 * Uses extracted sub-components:
 * - HeaderStatusBar: Desktop status display (tokens, cost, connection, API)
 * - HeaderUserInfo: User information with admin badge
 * - HeaderMobileMenu: Mobile dropdown menu
 */
import { useState, useEffect, useRef } from "react";
import Icon from "./Icon";
import Button from "./ui/Button";
import useConnectionStatus from "../hooks/useConnectionStatus";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { APP_VERSION, APP_MODES } from "../utils/constants";

// Sub-components
import HeaderStatusBar from "./Header/HeaderStatusBar";
import HeaderUserInfo from "./Header/HeaderUserInfo";
import HeaderMobileMenu from "./Header/HeaderMobileMenu";

const getVersionDisplay = () => {
  const isProd = import.meta.env.VITE_ENV === "production";
  // Get git commit hash from build-time define (set in vite.config.js)
  const gitCommit = typeof __GIT_COMMIT__ !== "undefined" ? __GIT_COMMIT__ : "";
  const commitSuffix = gitCommit ? `-${gitCommit}` : "";
  return {
    version: `${APP_VERSION}${commitSuffix}-${isProd ? "PROD" : "DEV"}`,
    isProd,
  };
};

const Header = ({
  apiKeyStatus,
  isCloudReady,
  onHome,
  creatorName,
  appMode,
  tokenUsage = { inputTokens: 0, outputTokens: 0, totalCost: 0 },
  onStartTutorial,
  isAdmin,
  onSignOut,
  user,
  userRole,
}) => {
  // Super Admin check - prefer Firestore role, fall back to env var
  const userEmail = user?.email?.toLowerCase();
  const envSuperAdmin =
    import.meta.env.VITE_SUPER_ADMIN_EMAIL?.trim()?.toLowerCase();
  const isSuperAdmin =
    userRole === "super_admin" ||
    (userEmail === envSuperAdmin && envSuperAdmin);
  const connectionStatus = useConnectionStatus();
  const { colorblindMode, toggleColorblindMode } = useAccessibility();
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

  const isReview = appMode === APP_MODES.REVIEW;
  const isAnalytics = appMode === APP_MODES.ANALYTICS;

  // Get mode-specific styles using object lookup instead of nested ternaries
  const getModeStyles = () => {
    if (isReview) {
      return {
        border: "border-indigo-600",
        title: "text-indigo-50",
        bg: "bg-slate-950 bg-gradient-to-r from-indigo-950/30 to-slate-950",
      };
    }
    if (isAnalytics) {
      return {
        border: "border-emerald-600",
        title: "text-emerald-50",
        bg: "bg-slate-950 bg-gradient-to-r from-emerald-950/30 to-slate-950",
      };
    }
    return {
      border: "border-orange-600",
      title: "text-orange-50",
      bg: "bg-slate-950",
    };
  };

  const modeStyles = getModeStyles();
  const borderColor = modeStyles.border;
  const titleColor = modeStyles.title;
  const headerBg = modeStyles.bg;

  const totalTokens =
    (tokenUsage.inputTokens || 0) + (tokenUsage.outputTokens || 0);
  const formattedTokens =
    totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens;
  const formattedCost = (tokenUsage.totalCost || 0).toFixed(6);

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
    if (appMode === APP_MODES.DATABASE)
      return "bg-blue-500/20 text-blue-300 border-blue-500/50";
    return "bg-orange-500/20 text-orange-300 border-orange-500/50";
  };

  const getBadgeText = () => {
    if (isReview) return "REVIEW MODE";
    if (isAnalytics) return "ANALYTICS";
    if (appMode === APP_MODES.DATABASE) return "DATABASE VIEW";
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
              src={`${import.meta.env.BASE_URL}logos/UE-Icon-2023-White.svg`}
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

        {/* Desktop Status Bar */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono">
          {/* Mode Badge */}
          <span
            className={`flex items-center h-7 px-2 rounded text-[10px] font-semibold uppercase tracking-wider border whitespace-nowrap ${getBadgeStyle()}`}
          >
            {getBadgeText()}
          </span>
          {/* Colorblind Mode Toggle */}
          <Button
            onClick={toggleColorblindMode}
            variant={colorblindMode ? "primary" : "secondary"}
            size="xs"
            className={`flex items-center gap-1 font-bold whitespace-nowrap ${
              colorblindMode
                ? "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/50"
                : "bg-slate-700 hover:bg-slate-600 text-slate-300"
            }`}
            title={
              colorblindMode ? "Colorblind mode ON" : "Enable colorblind mode"
            }
            aria-pressed={colorblindMode}
            aria-label="Toggle colorblind mode"
          >
            <Icon name="eye" size={12} />
            {colorblindMode ? "Colorblind ✓" : "Colorblind"}
          </Button>
          {/* Tutorial Button */}
          {onStartTutorial &&
            [
              APP_MODES.CREATE,
              APP_MODES.REVIEW,
              APP_MODES.DATABASE,
              APP_MODES.ANALYTICS,
            ].includes(appMode) && (
              <Button
                onClick={() => onStartTutorial(appMode)}
                size="xs"
                className="flex items-center gap-1 font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50 whitespace-nowrap"
                title={`Start ${appMode} tutorial`}
              >
                <Icon name="help-circle" size={12} />
                Tutorial
              </Button>
            )}
          {/* User Info (compact) */}
          <HeaderUserInfo
            creatorName={creatorName}
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
            onSignOut={onSignOut}
            formattedCost={formattedCost}
            compact={true}
          />
          {/* Status Bar */}
          <HeaderStatusBar
            formattedTokens={formattedTokens}
            tokenUsage={tokenUsage}
            connectionStatus={connectionStatus}
            apiKeyStatus={apiKeyStatus}
            isCloudReady={isCloudReady}
          />
        </div>

        {/* Mobile Hamburger Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          <Icon name={mobileMenuOpen ? "x" : "menu"} size={20} />
        </Button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <HeaderMobileMenu
          ref={menuRef}
          isCloudReady={isCloudReady}
          getVersionDisplay={getVersionDisplay}
          getBadgeStyle={getBadgeStyle}
          getBadgeText={getBadgeText}
          creatorName={creatorName}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          onSignOut={onSignOut}
          appMode={appMode}
          onStartTutorial={onStartTutorial}
          formattedTokens={formattedTokens}
          formattedCost={formattedCost}
          apiKeyStatus={apiKeyStatus}
          connectionStatus={connectionStatus}
          onClose={() => setMobileMenuOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;
