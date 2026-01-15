import { useState, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../services/firebase";
import { logger } from "../../utils/logger";
import { TOAST_DURATION } from "../../utils/constants";

const functions = getFunctions(app, "us-central1");

/**
 * useAdminInvites Hook
 *
 * Manages invite-related data and actions for the Admin Panel.
 */
export const useAdminInvites = (showMessage) => {
  const [invites, setInvites] = useState([]);
  const [invitesLoaded, setInvitesLoaded] = useState(false);
  const [invitesLoading, setInvitesLoading] = useState(false);

  const loadInvites = useCallback(async () => {
    if (invitesLoaded || invitesLoading) return;
    setInvitesLoading(true);
    try {
      const listInvitesFn = httpsCallable(functions, "listInvites");
      const result = await listInvitesFn({});
      setInvites(result.data.invites || []);
      setInvitesLoaded(true);
    } catch (error) {
      logger.error("Failed to load invites:", error);
      showMessage(
        `❌ Failed to load invites: ${error.message}`,
        TOAST_DURATION.EXTENDED
      );
    } finally {
      setInvitesLoading(false);
    }
  }, [invitesLoaded, invitesLoading, showMessage]);

  const refreshInvites = useCallback(() => {
    setInvitesLoaded(false);
    loadInvites();
  }, [loadInvites]);

  return {
    invites,
    invitesLoaded,
    invitesLoading,
    loadInvites,
    refreshInvites,
  };
};
