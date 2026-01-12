import React, { useState } from "react";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";
import { logger } from "../../utils/logger";

const UserList = ({
  users,
  isCollapsed,
  isLoading,
  onToggle,
  handleChangeRole,
  handleRevokeUser,
}) => {
  // Multi-select state for bulk actions
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkRevoking, setBulkRevoking] = useState(false);

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
      logger.error("Date formatting error:", e);
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

  // Toggle single user selection
  const toggleUserSelection = (uid) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(uid)) {
        newSet.delete(uid);
      } else {
        newSet.add(uid);
      }
      return newSet;
    });
  };

  // Toggle select all (non-admin users only - admins shouldn't be bulk revoked)
  const toggleSelectAll = () => {
    const nonAdminUsers = users.filter((u) => u.role !== "admin");
    if (selectedUsers.size === nonAdminUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(nonAdminUsers.map((u) => u.uid)));
    }
  };

  // Bulk revoke selected users
  const handleBulkRevoke = async () => {
    if (selectedUsers.size === 0) return;

    const selectedEmails = users
      .filter((u) => selectedUsers.has(u.uid))
      .map((u) => u.email)
      .join(", ");

    if (
      !confirm(
        `Revoke access for ${selectedUsers.size} user(s)?\n${selectedEmails}`
      )
    )
      return;

    setBulkRevoking(true);
    let _successCount = 0;
    let failCount = 0;

    for (const uid of selectedUsers) {
      const user = users.find((u) => u.uid === uid);
      if (user) {
        try {
          await handleRevokeUser(uid, user.email, true); // true = suppress individual confirmation
          _successCount++;
        } catch (error) {
          logger.error(`Failed to revoke ${user.email}:`, error);
          failCount++;
        }
      }
    }

    setSelectedUsers(new Set());
    setBulkRevoking(false);
  };

  const nonAdminCount = users?.filter((u) => u.role !== "admin").length || 0;

  return (
    <CollapsibleSection
      title={`Registered Users (${users?.length || 0})`}
      icon="users"
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      variant="blue"
    >
      {/* Bulk Actions Bar */}
      {users && users.length > 0 && (
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-600/30">
          <button
            onClick={toggleSelectAll}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            {selectedUsers.size === nonAdminCount && nonAdminCount > 0
              ? "Deselect All"
              : `Select All (${nonAdminCount} non-admin)`}
          </button>
          {selectedUsers.size > 0 && (
            <button
              onClick={handleBulkRevoke}
              disabled={bulkRevoking}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 text-white text-xs rounded transition-all flex items-center gap-1"
            >
              {bulkRevoking ? (
                <Icon name="loader" className="animate-spin" size={12} />
              ) : (
                <Icon name="trash-2" size={12} />
              )}
              Revoke Selected ({selectedUsers.size})
            </button>
          )}
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {isLoading && (
          <div className="flex items-center justify-center p-4 text-slate-400">
            <Icon name="loader" className="animate-spin mr-2" size={16} />
            Loading users...
          </div>
        )}

        {!isLoading && (!users || users.length === 0) && (
          <p className="text-slate-500 text-sm">No users found.</p>
        )}

        {!isLoading &&
          users &&
          users.length > 0 &&
          users.map((user) => (
            <div
              key={user.uid}
              className={`bg-slate-700/50 p-3 rounded flex items-center justify-between border transition-colors ${
                selectedUsers.has(user.uid)
                  ? "ring-2 ring-blue-500 border-blue-500/50"
                  : "border-slate-600/30 hover:border-slate-500/50"
              }`}
            >
              {/* Checkbox for non-admin users */}
              {user.role !== "admin" ? (
                <input
                  type="checkbox"
                  checked={selectedUsers.has(user.uid)}
                  onChange={() => toggleUserSelection(user.uid)}
                  className="mr-3 w-4 h-4 accent-blue-500 cursor-pointer"
                  aria-label={`Select user ${user.email}`}
                />
              ) : (
                <div className="mr-3 w-4" /> // Spacer for admin rows
              )}

              <div className="flex-1">
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
          ))}
      </div>
    </CollapsibleSection>
  );
};

export default UserList;
