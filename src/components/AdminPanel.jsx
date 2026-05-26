import React, { useState } from "react";
import { UI_LABELS } from "../utils/constants";
import {
  formatDuration,
  formatDate as formatAnalyticsDate,
} from "../utils/reviewerAnalytics";

// Components
import AdminHeader from "./Admin/AdminHeader";
import AdminStats from "./Admin/AdminStats";
import AdminFeatureAccess from "./Admin/AdminFeatureAccess";
import AdminSection from "./Admin/AdminSection";

// Hooks
import { useAdminPanelLogic } from "../hooks/admin/useAdminPanelLogic";
import { useMessage } from "../contexts/MessageContext";

// Lazy Loaded Admin Components
const ReviewerAnalytics = React.lazy(() => import("./Admin/ReviewerAnalytics"));
const DatabaseManagement = React.lazy(
  () => import("./Admin/DatabaseManagement")
);
const ApiConfig = React.lazy(() => import("./Admin/ApiConfig"));
const UserList = React.lazy(() => import("./Admin/UserList"));
const InviteManagement = React.lazy(() => import("./Admin/InviteManagement"));
const CustomTagsEditor = React.lazy(() => import("./Admin/CustomTagsEditor"));
const EnvironmentInfo = React.lazy(() => import("./Admin/EnvironmentInfo"));
const TrainingDataExport = React.lazy(
  () => import("./Admin/TrainingDataExport")
);
const SystemHealth = React.lazy(() => import("./Admin/SystemHealth"));
const AuditLogs = React.lazy(() => import("./Admin/AuditLogs"));
const DataMaintenance = React.lazy(() => import("./Admin/DataMaintenance"));

const AdminPanel = ({
  config,
  handleChange,
  showApiKey,
  setShowApiKey,
  _isApiReady,
  customTags,
  onSaveCustomTags,
  currentUser,
  userRole,
}) => {
  const { showMessage } = useMessage();
  // Super Admin check - prefer Firestore role, fall back to env var
  const userEmail = currentUser?.email?.toLowerCase();
  const envSuperAdmin =
    import.meta.env.VITE_SUPER_ADMIN_EMAIL?.trim()?.toLowerCase();
  const isSuperAdmin =
    userRole === "super_admin" ||
    (userEmail === envSuperAdmin && envSuperAdmin);

  // Panel Logic Hook
  const {
    users,
    usersLoaded,
    usersLoading,
    invites,
    invitesLoaded,
    invitesLoading,
    reviewerAnalytics,
    analyticsLoading,
    loadUsers,
    loadInvites,
    loadReviewerAnalytics,
    refreshInvites,
    handleRevokeUser,
    handleChangeRole,
  } = useAdminPanelLogic(showMessage);

  // Collapsible sections state
  const [collapsed, setCollapsed] = useState({
    featureAccess: true,
    inviteManagement: true,
    registeredUsers: true,
    reviewerActivity: true,
    systemHealth: true,
    auditLogs: true,
    apiConfig: true,
    customTags: true,
    trainingData: true,
    envInfo: true,
    databaseMgmt: true,
    dataMaintenance: true,
  });

  const toggleSection = (section) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Safe wrapper for handleChange
  const safeHandleChange = handleChange || (() => {});

  return (
    <div className="p-3">
      <AdminHeader />

      <AdminStats
        usersLoaded={usersLoaded}
        usersCount={users.length}
        invitesLoaded={invitesLoaded}
        activeInvitesCount={invites.filter((i) => !i.used).length}
        totalReviewers={reviewerAnalytics?.metadata?.totalReviewers}
        totalQuestionsReviewed={
          reviewerAnalytics?.metadata?.totalQuestionsReviewed
        }
      />

      <div className="space-y-1.5">
        <AdminFeatureAccess
          isCollapsed={collapsed.featureAccess}
          onToggle={() => toggleSection("featureAccess")}
        />

        {/* System Health Diagnostic - Super Admin Only */}
        {isSuperAdmin && (
          <AdminSection label="System Health">
            <SystemHealth
              isCollapsed={collapsed.systemHealth}
              onToggle={() => toggleSection("systemHealth")}
            />
          </AdminSection>
        )}

        {/* Invite Management */}
        <AdminSection label="Invite Management">
          <InviteManagement
            invites={invites}
            onRefresh={refreshInvites}
            isCollapsed={collapsed.inviteManagement}
            isLoading={invitesLoading}
            onToggle={() => {
              toggleSection("inviteManagement");
              if (collapsed.inviteManagement) loadInvites();
            }}
          />
        </AdminSection>

        {/* Registered Users List */}
        <AdminSection label="Users">
          <UserList
            users={users}
            isCollapsed={collapsed.registeredUsers}
            isLoading={usersLoading}
            onToggle={() => {
              toggleSection("registeredUsers");
              if (collapsed.registeredUsers) loadUsers();
            }}
            handleChangeRole={handleChangeRole}
            handleRevokeUser={handleRevokeUser}
          />
        </AdminSection>

        {/* Reviewer Activity Analytics */}
        <AdminSection label="Analytics">
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
        </AdminSection>

        {/* Audit Logs - Super Admin Only */}
        {isSuperAdmin && (
          <AdminSection label="Audit Logs">
            <AuditLogs
              isCollapsed={collapsed.auditLogs}
              onToggle={() => toggleSection("auditLogs")}
            />
          </AdminSection>
        )}

        {/* Custom Tags */}
        <AdminSection label="Custom Tags">
          <CustomTagsEditor
            customTags={customTags}
            onSaveCustomTags={onSaveCustomTags}
            isCollapsed={collapsed.customTags}
            onToggle={() => toggleSection("customTags")}
          />
        </AdminSection>

        {/* API Configuration */}
        <AdminSection label="Config">
          <ApiConfig
            config={config}
            onChange={safeHandleChange}
            showApiKey={showApiKey}
            setShowApiKey={setShowApiKey}
            isCollapsed={collapsed.apiConfig}
            onToggle={() => toggleSection("apiConfig")}
            uiLabels={UI_LABELS}
          />
        </AdminSection>

        {/* Environment Info - Super Admin Only */}
        {isSuperAdmin && (
          <AdminSection label="Environment Info">
            <EnvironmentInfo
              isCollapsed={collapsed.envInfo}
              onToggle={() => toggleSection("envInfo")}
            />
          </AdminSection>
        )}

        {/* Training Data Export - Super Admin Only */}
        {isSuperAdmin && (
          <AdminSection label="Training Data">
            <TrainingDataExport
              isCollapsed={collapsed.trainingData}
              onToggle={() => toggleSection("trainingData")}
            />
          </AdminSection>
        )}

        {/* Database Management - Super Admin Only */}
        {isSuperAdmin && (
          <AdminSection label="Database Management">
            <DatabaseManagement
              isCollapsed={collapsed.databaseMgmt}
              onToggle={() => toggleSection("databaseMgmt")}
            />
          </AdminSection>
        )}

        {/* Data Maintenance - Super Admin Only */}
        {isSuperAdmin && (
          <AdminSection label="Data Maintenance">
            <DataMaintenance
              isCollapsed={collapsed.dataMaintenance}
              onToggle={() => toggleSection("dataMaintenance")}
            />
          </AdminSection>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
