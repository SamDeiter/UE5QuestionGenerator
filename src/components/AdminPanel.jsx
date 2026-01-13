/**
 * Admin Panel - User Management
 *
 * Allows admins to:
 * - View all registered users
 * - Generate invite codes
 * - Revoke user access
 * - Promote/demote users
 */

import React, { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../services/firebase";
import Icon from "./Icon";
import CollapsibleSection from "./CollapsibleSection";
import { UI_LABELS } from "../utils/constants";

import {
  getReviewerAnalytics,
  formatDuration,
  formatDate as formatAnalyticsDate,
} from "../utils/reviewerAnalytics";
import { logger } from "../utils/logger";
const ReviewerAnalytics = React.lazy(() => import("./Admin/ReviewerAnalytics"));
const DatabaseManagement = React.lazy(() =>
  import("./Admin/DatabaseManagement")
);
const ApiConfig = React.lazy(() => import("./Admin/ApiConfig"));
const UserList = React.lazy(() => import("./Admin/UserList"));
const InviteManagement = React.lazy(() => import("./Admin/InviteManagement"));
const CustomTagsEditor = React.lazy(() => import("./Admin/CustomTagsEditor"));
const EnvironmentInfo = React.lazy(() => import("./Admin/EnvironmentInfo"));
const TrainingDataExport = React.lazy(() =>
  import("./Admin/TrainingDataExport")
);
const SystemHealth = React.lazy(() => import("./Admin/SystemHealth"));
const AuditLogs = React.lazy(() => import("./Admin/AuditLogs"));

const functions = getFunctions(app, "us-central1");

const AdminPanel = ({
  showMessage,
  config,
  handleChange,
  showApiKey,
  setShowApiKey,
  _isApiReady,
  customTags,
  onSaveCustomTags,
  currentUser, // Add currentUser prop
}) => {
  // Super Admin check - case-insensitive with trim
  const userEmail = currentUser?.email?.toLowerCase();
  const envSuperAdmin =
    import.meta.env.VITE_SUPER_ADMIN_EMAIL?.trim()?.toLowerCase();
  const isSuperAdmin = userEmail === envSuperAdmin && envSuperAdmin;

  // Collapsible sections state
  const [collapsed, setCollapsed] = useState({
    featureAccess: true,
    inviteManagement: true, // Merged: generateInvite + activeInvites
    registeredUsers: true,
    reviewerActivity: true, // NEW: Reviewer Activity Analytics section
    systemHealth: true, // NEW: System Health diagnostics
    auditLogs: true, // NEW: Audit Trail
    apiConfig: true,
    customTags: true,
    trainingData: true,
    envInfo: true,
    databaseMgmt: true,
  });

  const toggleSection = (section) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [reviewerAnalytics, setReviewerAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // PERFORMANCE: Separate loading states for load-on-expand pattern
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesLoaded, setInvitesLoaded] = useState(false);

  // Safe wrapper for handleChange to prevent React warnings
  const safeHandleChange = handleChange || (() => {});

  // PERFORMANCE: Load users only when section is expanded (load-on-expand pattern)
  const loadUsers = async () => {
    if (usersLoaded || usersLoading) return; // Already loaded or loading
    setUsersLoading(true);
    try {
      const listUsersFn = httpsCallable(functions, "listRegisteredUsers");
      const result = await listUsersFn({});
      setUsers(result.data.users || []);
      setUsersLoaded(true);
    } catch (error) {
      logger.error("Failed to load users:", error);
      showMessage(`❌ Failed to load users: ${error.message}`, 5000);
    } finally {
      setUsersLoading(false);
    }
  };

  // PERFORMANCE: Load invites only when section is expanded
  const loadInvites = async () => {
    if (invitesLoaded || invitesLoading) return; // Already loaded or loading
    setInvitesLoading(true);
    try {
      const listInvitesFn = httpsCallable(functions, "listInvites");
      const result = await listInvitesFn({});
      setInvites(result.data.invites || []);
      setInvitesLoaded(true);
    } catch (error) {
      logger.error("Failed to load invites:", error);
      showMessage(`❌ Failed to load invites: ${error.message}`, 5000);
    } finally {
      setInvitesLoading(false);
    }
  };

  // Refresh function for after mutations (invites/users)
  const refreshUsers = () => {
    setUsersLoaded(false);
    loadUsers();
  };
  const refreshInvites = () => {
    setInvitesLoaded(false);
    loadInvites();
  };

  const handleRevokeUser = async (userId, email) => {
    if (
      !confirm(
        `Revoke access for ${email}? They will be logged out and unable to access the app.`
      )
    )
      return;

    try {
      const revokeUserFn = httpsCallable(functions, "revokeUserAccess");
      await revokeUserFn({ userId });

      // Immediately remove user from UI (optimistic update)
      setUsers((prevUsers) => prevUsers.filter((u) => u.uid !== userId));

      showMessage(`✅ Access revoked for ${email}`, 3000);

      // Wait a moment for server-side deletion to complete before refreshing
      setTimeout(() => refreshUsers(), 500);
    } catch (error) {
      logger.error("❌ Revoke user error:", error);
      showMessage(`❌ Failed to revoke user: ${error.message}`, 5000);
      // Reload data to restore UI state if revocation failed
      refreshUsers();
    }
  };

  const handleChangeRole = async (userId, currentRole, email) => {
    // Simple toggle between admin and reviewer (no user role)
    const newRole = currentRole === "admin" ? "reviewer" : "admin";
    if (!confirm(`Change ${email} from ${currentRole} to ${newRole}?`)) return;

    try {
      const changeRoleFn = httpsCallable(functions, "changeUserRole");
      await changeRoleFn({ userId, role: newRole });

      // Immediately update user role in UI (optimistic update)
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.uid === userId ? { ...u, role: newRole } : u))
      );

      showMessage(`✅ ${email} is now ${newRole}`, 3000);

      // Refresh data from server to ensure consistency
      refreshUsers();
    } catch (error) {
      showMessage(`❌ Failed to change role: ${error.message}`, 5000);
      // Reload data to restore UI state if role change failed
      refreshUsers();
    }
  };

  // NEW: Load reviewer activity analytics
  const loadReviewerAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const data = await getReviewerAnalytics();
      setReviewerAnalytics(data);
    } catch (error) {
      logger.error("Failed to load reviewer analytics:", error);
      showMessage(`❌ Failed to load analytics: ${error.message}`, 5000);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // PERFORMANCE: No blocking loading spinner - UI renders immediately

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Icon name="shield" size={20} />
          Admin Panel
        </h1>
      </div>

      {/* Grid layout for compact cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Feature Access Overview */}
        <CollapsibleSection
          title="Feature Access Overview"
          icon="eye"
          isCollapsed={collapsed.featureAccess}
          onToggle={() => toggleSection("featureAccess")}
          variant="blue"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 p-4 rounded border border-blue-500/30">
              <h3 className="text-sm font-bold text-blue-400 mb-3">
                🔍 Reviewers (Limited Access)
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Icon
                    name="list-checks"
                    size={12}
                    className="text-blue-400"
                  />
                  Review Mode (view & approve questions)
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="database" size={12} className="text-blue-400" />
                  Database View (Extended Access)
                </li>
                <li className="flex items-center gap-2">
                  <Icon
                    name="bar-chart-2"
                    size={12}
                    className="text-blue-400"
                  />
                  Analytics Dashboard
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <Icon name="x" size={12} className="text-red-400" />
                  <span className="line-through">Create Questions</span>
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <Icon name="x" size={12} className="text-red-400" />
                  <span className="line-through">Admin Panel</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-800/50 p-4 rounded border border-purple-500/30">
              <h3 className="text-sm font-bold text-purple-400 mb-3">
                👑 Admins (Full Access)
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Icon name="check" size={12} className="text-purple-400" />
                  All Reviewer Features
                </li>
                <li className="flex items-center gap-2">
                  <Icon
                    name="plus-circle"
                    size={12}
                    className="text-purple-400"
                  />
                  Create Mode (generate questions)
                </li>
                <li className="flex items-center gap-2">
                  <Icon
                    name="clipboard-list"
                    size={12}
                    className="text-purple-400"
                  />
                  Test View (experimental features)
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="terminal" size={12} className="text-purple-400" />
                  Prompt Lab (AI testing)
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="shield" size={12} className="text-purple-400" />
                  Admin Panel (user management)
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="database" size={12} className="text-purple-400" />
                  Database Editing (full CRUD)
                </li>
              </ul>
            </div>
          </div>
        </CollapsibleSection>
        {/* Invite Management - Extracted Component */}
        <React.Suspense
          fallback={
            <div className="p-4 text-center text-slate-500">
              <Icon name="loader" className="animate-spin mb-2" />
              <p>Loading Invite Management...</p>
            </div>
          }
        >
          <InviteManagement
            invites={invites}
            onRefresh={refreshInvites}
            showMessage={showMessage}
            isCollapsed={collapsed.inviteManagement}
            isLoading={invitesLoading}
            onToggle={() => {
              toggleSection("inviteManagement");
              // PERFORMANCE: Load invites when section is expanded
              if (collapsed.inviteManagement) loadInvites();
            }}
          />
        </React.Suspense>
        {/* Registered Users List */}
        <React.Suspense
          fallback={
            <div className="p-4 text-center text-slate-500">
              <Icon name="loader" className="animate-spin mb-2" />
              <p>Loading Users...</p>
            </div>
          }
        >
          <UserList
            users={users}
            isCollapsed={collapsed.registeredUsers}
            isLoading={usersLoading}
            onToggle={() => {
              toggleSection("registeredUsers");
              // PERFORMANCE: Load users when section is expanded
              if (collapsed.registeredUsers) loadUsers();
            }}
            handleChangeRole={handleChangeRole}
            handleRevokeUser={handleRevokeUser}
          />
        </React.Suspense>

        {/* Reviewer Activity Analytics */}
        <React.Suspense
          fallback={
            <div className="p-8 text-center text-slate-400">
              <Icon name="loader" className="animate-spin mb-2 mx-auto" />
              Loading Analytics...
            </div>
          }
        >
          <ReviewerAnalytics
            reviewerAnalytics={reviewerAnalytics}
            analyticsLoading={analyticsLoading}
            loadReviewerAnalytics={loadReviewerAnalytics}
            formatDuration={formatDuration}
            formatAnalyticsDate={formatAnalyticsDate}
            formatDate={formatAnalyticsDate}
            isCollapsed={collapsed.reviewerActivity}
            onToggle={() => {
              toggleSection("reviewerActivity");
              if (collapsed.reviewerActivity) loadReviewerAnalytics();
            }}
          />
        </React.Suspense>

        {/* API Configuration */}
        <React.Suspense
          fallback={
            <div className="p-4 text-center text-slate-500">
              Loading Config...
            </div>
          }
        >
          <ApiConfig
            config={config}
            onChange={safeHandleChange}
            showApiKey={showApiKey}
            setShowApiKey={setShowApiKey}
            isCollapsed={collapsed.apiConfig}
            onToggle={() => toggleSection("apiConfig")}
            uiLabels={UI_LABELS}
          />
        </React.Suspense>

        {/* Custom Tags - Extracted Component */}
        <React.Suspense
          fallback={
            <div className="p-4 text-center text-slate-500">
              <Icon name="loader" className="animate-spin mb-2" />
              <p>Loading Custom Tags...</p>
            </div>
          }
        >
          <CustomTagsEditor
            customTags={customTags}
            onSaveCustomTags={onSaveCustomTags}
            isCollapsed={collapsed.customTags}
            onToggle={() => toggleSection("customTags")}
          />
        </React.Suspense>

        {/* System Health Diagnostic */}
        <React.Suspense
          fallback={
            <div className="p-4 text-center text-slate-500">
              <Icon name="loader" className="animate-spin mb-2" />
              <p>Loading System Health...</p>
            </div>
          }
        >
          <SystemHealth
            isCollapsed={collapsed.systemHealth}
            onToggle={() => toggleSection("systemHealth")}
          />
        </React.Suspense>

        {/* Audit Logs */}
        <React.Suspense
          fallback={
            <div className="p-4 text-center text-slate-500">
              <Icon name="loader" className="animate-spin mb-2" />
              <p>Loading Audit Logs...</p>
            </div>
          }
        >
          <AuditLogs
            isCollapsed={collapsed.auditLogs}
            onToggle={() => toggleSection("auditLogs")}
          />
        </React.Suspense>

        {/* Training Data Export - Super Admin Only */}
        {isSuperAdmin && (
          <React.Suspense
            fallback={
              <div className="p-4 text-center text-slate-500">
                <Icon name="loader" className="animate-spin mb-2" />
                <p>Loading Training Data...</p>
              </div>
            }
          >
            <TrainingDataExport
              isCollapsed={collapsed.trainingData}
              onToggle={() => toggleSection("trainingData")}
              showMessage={showMessage}
            />
          </React.Suspense>
        )}

        {/* Environment Info - Extracted Component */}
        <React.Suspense
          fallback={
            <div className="p-4 text-center text-slate-500">
              <Icon name="loader" className="animate-spin mb-2" />
              <p>Loading Environment Info...</p>
            </div>
          }
        >
          <EnvironmentInfo
            showMessage={showMessage}
            isCollapsed={collapsed.envInfo}
            onToggle={() => toggleSection("envInfo")}
          />
        </React.Suspense>
        {/* Database Management - Super Admin Only */}
        {isSuperAdmin && (
          <DatabaseManagement
            showMessage={showMessage}
            isCollapsed={collapsed.databaseMgmt}
            onToggle={() => toggleSection("databaseMgmt")}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
