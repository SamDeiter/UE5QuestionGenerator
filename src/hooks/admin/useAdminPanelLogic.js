import { useEffect } from "react";
import { useAdminUsers } from "./useAdminUsers";
import { useAdminInvites } from "./useAdminInvites";
import { useAdminAnalytics } from "./useAdminAnalytics";

/**
 * useAdminPanelLogic Hook
 *
 * Manages the data and actions for the Admin Panel.
 * Delegated logic to specialized hooks.
 */
export const useAdminPanelLogic = (showMessage) => {
  // Use specialized hooks
  const {
    users,
    usersLoaded,
    usersLoading,
    loadUsers,
    refreshUsers,
    handleRevokeUser,
    handleChangeRole,
  } = useAdminUsers(showMessage);

  const {
    invites,
    invitesLoaded,
    invitesLoading,
    loadInvites,
    refreshInvites,
  } = useAdminInvites(showMessage);

  const { reviewerAnalytics, analyticsLoading, loadReviewerAnalytics } =
    useAdminAnalytics(showMessage);

  useEffect(() => {
    loadUsers();
    loadInvites();
    loadReviewerAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // Users
    users,
    usersLoaded,
    usersLoading,
    loadUsers,
    refreshUsers,
    handleRevokeUser,
    handleChangeRole,

    // Invites
    invites,
    invitesLoaded,
    invitesLoading,
    loadInvites,
    refreshInvites,

    // Analytics
    reviewerAnalytics,
    analyticsLoading,
    loadReviewerAnalytics,
  };
};
