import React from "react";
import Icon from "../Icon";

const UserList = ({
  users,
  isCollapsed,
  onToggle,
  handleChangeRole,
  handleRevokeUser,
}) => {
  // Robust date formatter
  const formatDate = (dateVal) => {
    if (!dateVal) return "N/A";
    try {
      // Handle Firestore Timestamp objects if they still arrive as such
      const date =
        dateVal.toDate instanceof Function
          ? dateVal.toDate()
          : new Date(dateVal);
      return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString();
    } catch (e) {
      console.error("Date formatting error:", e);
      return "Invalid Date";
    }
  };

  const getRoleBadgeClasses = (role) => {
    switch (role) {
      case "admin":
        return "bg-indigo-900 text-indigo-200";
      case "reviewer":
        return "bg-indigo-600 text-white";
      default:
        return "bg-slate-600 text-slate-300";
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-blue-500/30">
      <h2
        onClick={onToggle}
        className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-blue-400 mb-3 flex items-center gap-2"
      >
        <div className="flex items-center gap-2">
          <Icon name="users" size={18} /> Registered Users ({users?.length || 0}
          )
        </div>
        <Icon
          name={isCollapsed ? "chevron-down" : "chevron-up"}
          size={16}
          className="ml-auto opacity-50"
        />
      </h2>
      {!isCollapsed && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {!users || users.length === 0 ? (
            <p className="text-slate-500 text-sm">No users found.</p>
          ) : (
            users.map((user) => (
              <div
                key={user.uid}
                className="bg-slate-700/50 p-3 rounded flex items-center justify-between border border-slate-600/30 hover:border-slate-500/50 transition-colors"
              >
                <div>
                  <div className="text-white font-medium text-sm flex items-center gap-2">
                    {user.email}
                    {user.role === "admin" && (
                      <Icon
                        name="shield"
                        size={12}
                        className="text-yellow-400"
                        title="Admin User"
                      />
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${getRoleBadgeClasses(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                    Joined: {formatDate(user.registeredAt)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleChangeRole(user.uid, user.role, user.email)
                    }
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded transition-all"
                    title={
                      user.role === "admin"
                        ? "Demote to User"
                        : "Promote to Admin"
                    }
                  >
                    <Icon
                      name={user.role === "admin" ? "arrow-down" : "arrow-up"}
                      size={12}
                    />
                  </button>

                  <button
                    onClick={() => handleRevokeUser(user.uid, user.email)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-all"
                    title="Revoke Access"
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default UserList;
