import Icon from "../Icon";
import { auth } from "../../services/firebase";
import { signOut } from "firebase/auth";

/**
 * InviteHeader - Header for the invite/registration screen
 * Shows current user's email if logged in (for context)
 * Clearly explains that access requires an invite from an admin
 */
const InviteHeader = () => {
  const currentUser = auth.currentUser;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <div className="text-center mb-6">
      {/* Access Denied Icon - Shield with Lock */}
      <div className="w-20 h-20 bg-amber-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-500/50">
        <Icon name="shield-x" size={40} className="text-amber-500" />
      </div>

      {/* Clear Title */}
      <h1 className="text-2xl font-bold text-white mb-2">
        🔒 Invite-Only Access
      </h1>

      {/* Explanation */}
      <div className="bg-slate-800/50 rounded-lg p-4 mb-4 text-left">
        <p className="text-slate-300 text-sm mb-3">
          This application is restricted to invited users only. You need a valid
          <span className="text-orange-400 font-semibold"> invite code </span>
          from an administrator to access the system.
        </p>

        {/* Current User Info */}
        {currentUser && (
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
            <p className="text-slate-500 text-xs mb-1">Signed in as:</p>
            <p className="text-white font-medium text-sm truncate">
              {currentUser.email}
            </p>
          </div>
        )}

        <p className="text-slate-400 text-xs">
          <strong>Don't have an invite code?</strong> Contact an administrator
          to request access.
        </p>
      </div>

      {/* Invite Code Label */}
      <p className="text-slate-400 text-sm">
        Enter your invite code below to get started:
      </p>

      {/* Sign Out Option */}
      {currentUser && (
        <button
          onClick={handleSignOut}
          className="mt-4 text-sm text-slate-500 hover:text-red-400 transition-colors underline"
        >
          Not you? Sign out and try a different account
        </button>
      )}
    </div>
  );
};

export default InviteHeader;
