/**
 * Admin Panel - User Management
 *
 * Allows admins to:
 * - View all registered users
 * - Generate invite codes
 * - Revoke user access
 * - Promote/demote users
 */

import React, { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../services/firebase";
import Icon from "./Icon";
import { downloadTrainingData } from "../utils/analyticsStore";
import { UI_LABELS } from "../utils/constants";

import {
  getReviewerAnalytics,
  formatDuration,
  formatDate as formatAnalyticsDate,
} from "../utils/reviewerAnalytics";
const ReviewerAnalytics = React.lazy(() => import("./Admin/ReviewerAnalytics"));
const DatabaseManagement = React.lazy(() =>
  import("./Admin/DatabaseManagement")
);
const ApiConfig = React.lazy(() => import("./Admin/ApiConfig"));
const UserList = React.lazy(() => import("./Admin/UserList"));
const InviteManagement = React.lazy(() => import("./Admin/InviteManagement"));

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
    inviteManagement: false, // Merged: generateInvite + activeInvites
    registeredUsers: false,
    reviewerActivity: true, // NEW: Reviewer Activity Analytics section
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
  const [reviewerAnalytics, setReviewerAnalytics] = useState(null); // NEW: Analytics data
  const [analyticsLoading, setAnalyticsLoading] = useState(false); // NEW: Loading state

  // Safe wrapper for handleChange to prevent React warnings
  const safeHandleChange = handleChange || (() => {});
  const [loading, setLoading] = useState(true);

  // Load users and invites
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load users and invites in parallel for better performance
      const listUsersFn = httpsCallable(functions, "listRegisteredUsers");
      const listInvitesFn = httpsCallable(functions, "listInvites");

      const [usersResult, invitesResult] = await Promise.all([
        listUsersFn({}),
        listInvitesFn({}),
      ]);

      setUsers(usersResult.data.users || []);
      setInvites(invitesResult.data.invites || []);
    } catch (error) {
      console.error("Failed to load admin data:", error);
      showMessage(`❌ Failed to load data: ${error.message}`, 5000);
    } finally {
      setLoading(false);
    }
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
      setTimeout(async () => {
        await loadData();
      }, 500);
    } catch (error) {
      console.error("❌ Revoke user error:", error);
      showMessage(`❌ Failed to revoke user: ${error.message}`, 5000);
      // Reload data to restore UI state if revocation failed
      await loadData();
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
      await loadData();
    } catch (error) {
      showMessage(`❌ Failed to change role: ${error.message}`, 5000);
      // Reload data to restore UI state if role change failed
      await loadData();
    }
  };

  // NEW: Load reviewer activity analytics
  const loadReviewerAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const data = await getReviewerAnalytics();
      setReviewerAnalytics(data);
    } catch (error) {
      console.error("Failed to load reviewer analytics:", error);
      showMessage(`❌ Failed to load analytics: ${error.message}`, 5000);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Icon name="loader" className="animate-spin mr-2" size={24} />
        <span className="text-slate-400">Loading admin panel...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Icon name="shield" size={24} />
          Admin Panel
        </h1>
      </div>
      {/* Feature Access Overview */}
      <div className="bg-blue-900/20 rounded-lg p-6 border border-blue-500/30">
        <h2
          onClick={() => toggleSection("featureAccess")}
          className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-blue-400 mb-4 flex items-center gap-2"
        >
          <div className="flex items-center gap-2">
            <Icon name="eye" size={18} /> Feature Access Overview
          </div>
          <Icon
            name={collapsed.featureAccess ? "chevron-down" : "chevron-up"}
            size={16}
            className="ml-auto opacity-50"
          />
        </h2>
        {!collapsed.featureAccess && (
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
        )}
      </div>
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
          onRefresh={loadData}
          showMessage={showMessage}
          isCollapsed={collapsed.inviteManagement}
          onToggle={() => toggleSection("inviteManagement")}
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
          onToggle={() => toggleSection("registeredUsers")}
          handleChangeRole={handleChangeRole}
          handleRevokeUser={handleRevokeUser}
        />
      </React.Suspense>

      {/* Reviewer Activity Analytics */}
      <div className="bg-slate-800 rounded-lg p-4 border border-cyan-500/30">
        <h2
          onClick={() => toggleSection("reviewerActivity")}
          className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2"
        >
          <div className="flex items-center gap-2">
            <Icon name="bar-chart-2" size={18} /> Reviewer Analytics
          </div>
          <Icon
            name={collapsed.reviewerActivity ? "chevron-down" : "chevron-up"}
            size={16}
            className="ml-auto opacity-50"
          />
        </h2>
        {!collapsed.reviewerActivity && (
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
            />
          </React.Suspense>
        )}
      </div>

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

      {/* Custom Tags */}
      <div className="bg-slate-800 rounded-lg p-4 border border-orange-500/30">
        <h2
          onClick={() => toggleSection("customTags")}
          className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-orange-400 mb-3 flex items-center gap-2"
        >
          <div className="flex items-center gap-2">
            <Icon name="tag" size={18} /> Custom Tags
          </div>
          <Icon
            name={collapsed.customTags ? "chevron-down" : "chevron-up"}
            size={16}
            className="ml-auto opacity-50"
          />
        </h2>
        {!collapsed.customTags && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Custom Tags (comma separated)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTags}
                  onChange={(e) => onSaveCustomTags(e.target.value)}
                  placeholder="e.g. priority, v2_audit, check_contrast"
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:border-orange-500 outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Tags available in the simplified tag selector
              </p>
            </div>
          </div>
        )}
      </div>
      {/* Training Data Export - Super Admin Only */}
      {isSuperAdmin && (
        <div className="bg-slate-800 rounded-lg p-4 border border-purple-500/30">
          <h2
            onClick={() => toggleSection("trainingData")}
            className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-purple-400 mb-3 flex items-center gap-2"
          >
            <div className="flex items-center gap-2">
              <Icon name="download" size={18} /> Training Data
            </div>
            <Icon
              name={collapsed.trainingData ? "chevron-down" : "chevron-up"}
              size={16}
              className="ml-auto opacity-50"
            />
          </h2>
          {!collapsed.trainingData && (
            <div className="space-y-3">
              <button
                onClick={() => downloadTrainingData()}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold transition-all flex items-center justify-center gap-2"
              >
                <Icon name="download" size={16} />
                Download Full Training Dataset (JSON)
              </button>
              <p className="text-xs text-slate-500 text-center">
                exports all accepted questions in a format suitable for Gemini
                fine-tuning
              </p>
            </div>
          )}
        </div>
      )}
      {/* Environment Info */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-600/30">
        <h2
          onClick={() => toggleSection("envInfo")}
          className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-slate-400 mb-3 flex items-center gap-2"
        >
          <div className="flex items-center gap-2">
            <Icon name="server" size={18} /> Environment Info
          </div>
          <Icon
            name={collapsed.envInfo ? "chevron-down" : "chevron-up"}
            size={16}
            className="ml-auto opacity-50"
          />
        </h2>
        {!collapsed.envInfo && (
          <>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Firebase Project:</span>
                <span className="text-slate-300 font-mono">
                  {import.meta.env.VITE_FIREBASE_PROJECT_ID || "Not Set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Environment:</span>
                <span
                  className={`font-bold ${
                    import.meta.env.VITE_FIREBASE_PROJECT_ID?.includes("prod")
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  {import.meta.env.VITE_FIREBASE_PROJECT_ID?.includes("prod")
                    ? "🔴 PRODUCTION"
                    : "🟢 DEVELOPMENT"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">API Mode:</span>
                <span className="text-cyan-400">Cloud Functions</span>
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
              <button
                onClick={() => {
                  navigator.clipboard.writeText("npm run dev:dev");
                  showMessage(
                    "Copied! Paste in terminal to switch to DEV environment.",
                    3000
                  );
                }}
                className="flex-1 px-2 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-300 text-xs font-bold rounded border border-green-700/50 transition-colors flex items-center justify-center gap-1"
              >
                <Icon name="clipboard" size={12} />
                Switch to DEV
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText("npm run dev:prod");
                  showMessage(
                    "Copied! Paste in terminal to switch to PROD environment.",
                    3000
                  );
                }}
                className="flex-1 px-2 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-300 text-xs font-bold rounded border border-red-700/50 transition-colors flex items-center justify-center gap-1"
              >
                <Icon name="clipboard" size={12} />
                Switch to PROD
              </button>
            </div>
          </>
        )}
      </div>
      {/* Database Management - Super Admin Only */}
      {isSuperAdmin && (
        <DatabaseManagement
          showMessage={showMessage}
          isCollapsed={collapsed.databaseMgmt}
          onToggle={() => toggleSection("databaseMgmt")}
        />
      )}
    </div>
  );
};

export default AdminPanel;
