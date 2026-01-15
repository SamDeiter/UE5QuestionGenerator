import { useState, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../services/firebase";
import { logger } from "../../utils/logger";
import { TOAST_DURATION } from "../../utils/constants";

const functions = getFunctions(app, "us-central1");

/**
 * useAdminUsers Hook
 *
 * Manages user-related data and actions for the Admin Panel.
 */
export const useAdminUsers = (showMessage) => {
  const [users, setUsers] = useState([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    if (usersLoaded || usersLoading) return;
    setUsersLoading(true);
    try {
      const listUsersFn = httpsCallable(functions, "listRegisteredUsers");
      const result = await listUsersFn({});
      setUsers(result.data.users || []);
      setUsersLoaded(true);
    } catch (error) {
      logger.error("Failed to load users:", error);
      showMessage(
        `❌ Failed to load users: ${error.message}`,
        TOAST_DURATION.EXTENDED
      );
    } finally {
      setUsersLoading(false);
    }
  }, [usersLoaded, usersLoading, showMessage]);

  const refreshUsers = useCallback(() => {
    setUsersLoaded(false);
    loadUsers();
  }, [loadUsers]);

  const handleRevokeUser = useCallback(
    async (userId, email) => {
      if (
        !confirm(
          `Revoke access for ${email}? They will be logged out and unable to access the app.`
        )
      )
        return;

      try {
        const revokeUserFn = httpsCallable(functions, "revokeUserAccess");
        await revokeUserFn({ userId });
        setUsers((prevUsers) => prevUsers.filter((u) => u.uid !== userId));
        showMessage(`✅ Access revoked for ${email}`, TOAST_DURATION.LONG);
        setTimeout(() => refreshUsers(), 500);
      } catch (error) {
        logger.error("❌ Revoke user error:", error);
        showMessage(
          `❌ Failed to revoke user: ${error.message}`,
          TOAST_DURATION.EXTENDED
        );
        refreshUsers();
      }
    },
    [showMessage, refreshUsers]
  );

  const handleChangeRole = useCallback(
    async (userId, currentRole, email) => {
      const newRole = currentRole === "admin" ? "reviewer" : "admin";
      if (!confirm(`Change ${email} from ${currentRole} to ${newRole}?`))
        return;

      try {
        const changeRoleFn = httpsCallable(functions, "changeUserRole");
        await changeRoleFn({ userId, role: newRole });
        setUsers((prevUsers) =>
          prevUsers.map((u) => (u.uid === userId ? { ...u, role: newRole } : u))
        );
        showMessage(`✅ ${email} is now ${newRole}`, TOAST_DURATION.LONG);
        refreshUsers();
      } catch (error) {
        showMessage(
          `❌ Failed to change role: ${error.message}`,
          TOAST_DURATION.EXTENDED
        );
        refreshUsers();
      }
    },
    [showMessage, refreshUsers]
  );

  return {
    users,
    usersLoaded,
    usersLoading,
    loadUsers,
    refreshUsers,
    handleRevokeUser,
    handleChangeRole,
  };
};
