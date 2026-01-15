/**
 * HeaderUserInfo - Displays user information with admin badge and sign out
 */
import Icon from "../Icon";
import { signOutUser } from "../../services/firebase";
import { logger } from "../../utils/logger";

const HeaderUserInfo = ({
  creatorName,
  isAdmin,
  isSuperAdmin,
  onSignOut,
  formattedCost = null,
  compact = false,
  onMenuClose = null,
  showMessage = null,
}) => {
  if (!creatorName) return null;

  const handleSignOut = async () => {
    if (onMenuClose) onMenuClose();
    if (onSignOut) onSignOut();
    // Clear any cached state
    localStorage.removeItem("ue5_session_agent_id");
    try {
      await signOutUser();
    } catch (error) {
      logger.error("Sign out failed:", error);
    }
  };

  // Mobile version (larger, with border)
  if (!compact) {
    return (
      <div className="flex items-center justify-between py-2 border-t border-slate-700">
        <div className="flex items-center gap-2 font-medium text-slate-300">
          <Icon
            name={isAdmin ? "shield-check" : "user"}
            size={14}
            className={isAdmin ? "text-orange-500" : "text-green-500"}
          />
          <span>{creatorName}</span>
          {isAdmin && (
            <span
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${
                isSuperAdmin
                  ? "bg-purple-900/50 text-purple-400 border-purple-800"
                  : "bg-orange-900/50 text-orange-400 border-orange-800"
              }`}
            >
              {isSuperAdmin ? "SUPER" : "ADMIN"}
            </span>
          )}
          {formattedCost !== null && (
            <div className="flex items-center gap-1 border-l border-slate-700 pl-2 ml-1 text-emerald-400">
              <span className="text-slate-500 text-[10px]">$</span>
              <span className="font-bold">{formattedCost}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
          aria-label="Sign out of application"
        >
          <Icon name="log-out" size={16} />
        </button>
      </div>
    );
  }

  // Desktop version (compact)
  return (
    <div className="flex items-center h-7 gap-1.5 font-medium text-slate-300 px-2 bg-slate-800/50 rounded-lg whitespace-nowrap text-[10px]">
      <Icon
        name={isAdmin ? "shield-check" : "user"}
        size={12}
        className={isAdmin ? "text-orange-500" : "text-green-500"}
      />
      <span>{creatorName}</span>
      {isAdmin && (
        <span
          className={`text-[9px] font-semibold px-1 py-0.5 rounded border ml-0.5 ${
            isSuperAdmin
              ? "bg-purple-900/50 text-purple-400 border-purple-800"
              : "bg-orange-900/50 text-orange-400 border-orange-800"
          }`}
        >
          {isSuperAdmin ? "SUPER" : "ADMIN"}
        </span>
      )}
      {formattedCost !== null && (
        <div className="flex items-center gap-1 border-l border-slate-700 pl-1.5 ml-0.5 text-emerald-400">
          <span className="text-slate-500">$</span>
          <span className="font-bold">{formattedCost}</span>
        </div>
      )}
      <button
        onClick={handleSignOut}
        className="ml-1 p-1 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
        title="Sign Out"
        aria-label="Sign out of application"
      >
        <Icon name="log-out" size={12} />
      </button>
    </div>
  );
};

export default HeaderUserInfo;
