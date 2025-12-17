/**
 * Admin Panel - User Management
 *
 * Allows admins to:
 * - View all registered users
 * - Generate invite codes
 * - Revoke user access
 * - Promote/demote users
 */

import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../services/firebase";
import Icon from "./Icon";
import { createInvite, revokeInvite } from "../services/inviteService";
import TokenUsageDisplay from "./TokenUsageDisplay";
import TagManager from "./TagManager";
import { getTokenUsage, downloadTrainingData } from "../utils/analyticsStore";
import { UI_LABELS } from "../utils/constants";
import { clearAllQuestionsFromFirestore } from "../services/firebase";

const functions = getFunctions(app, "us-central1");

const AdminPanel = ({
  showMessage,
  config,
  handleChange,
  showApiKey,
  setShowApiKey,
  files,
  handleDetectTopics,
  isDetecting,
  fileInputRef,
  handleFileChange,
  removeFile,
  isApiReady,
  customTags,
  onSaveCustomTags,
  currentUser, // Add currentUser prop
}) => {
  // Super Admin check - only sam.deiter@epicgames.com
  const isSuperAdmin = currentUser?.email === "sam.deiter@epicgames.com";

  // Debug logging
  console.log("AdminPanel - currentUser:", currentUser);
  console.log("AdminPanel - currentUser email:", currentUser?.email);
  console.log("AdminPanel - isSuperAdmin:", isSuperAdmin);

  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);

  // Safe wrapper for handleChange to prevent React warnings
  const safeHandleChange = handleChange || (() => {});
  const [loading, setLoading] = useState(true);
  const [newInviteSettings, setNewInviteSettings] = useState({
    role: "user",
    maxUses: 1,
    expiresInDays: 7,
    note: "",
  });

  // Load users and invites
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // TODO: Implement these Cloud Functions when needed
      // Get all registered users
      const listUsersFn = httpsCallable(functions, "listRegisteredUsers");
      const usersResult = await listUsersFn({});
      setUsers(usersResult.data.users || []);

      // Get active invites
      const listInvitesFn = httpsCallable(functions, "listInvites");
      const invitesResult = await listInvitesFn({});
      setInvites(invitesResult.data.invites || []);
    } catch (error) {
      console.error("Failed to load admin data:", error);
      showMessage(`❌ Failed to load data: ${error.message}`, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    try {
      const result = await createInvite(newInviteSettings);
      showMessage(`✅ Invite created! Code: ${result.code}`, 5000);

      // Copy invite URL to clipboard
      navigator.clipboard.writeText(result.inviteUrl);
      showMessage("📋 Invite URL copied to clipboard!", 3000);

      await loadData(); // Refresh list
    } catch (error) {
      showMessage(`❌ Failed to create invite: ${error.message}`, 5000);
    }
  };

  const handleRevokeInvite = async (code) => {
    if (!confirm(`Revoke invite code: ${code}?`)) return;

    try {
      await revokeInvite(code);

      // Immediately remove invite from UI (optimistic update)
      setInvites((prevInvites) =>
        prevInvites.filter((inv) => inv.code !== code)
      );

      showMessage("✅ Invite revoked", 3000);

      // Refresh data from server to ensure consistency
      await loadData();
    } catch (error) {
      showMessage(`❌ Failed to revoke: ${error.message}`, 5000);
      // Reload data to restore UI state if revocation failed
      await loadData();
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

      // Refresh data from server to ensure consistency
      await loadData();
    } catch (error) {
      showMessage(`❌ Failed to revoke user: ${error.message}`, 5000);
      // Reload data to restore UI state if revocation failed
      await loadData();
    }
  };

  const handleChangeRole = async (userId, currentRole, email) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
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
        <h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
          <Icon name="eye" size={18} />
          Feature Access Overview
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded border border-green-500/30">
            <h3 className="text-sm font-bold text-green-400 mb-3">
              👤 Regular Users (Non-Admin)
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Icon name="list-checks" size={12} className="text-green-400" />
                Review Mode (view & approve questions)
              </li>
              <li className="flex items-center gap-2">
                <Icon name="database" size={12} className="text-green-400" />
                Database View (read-only)
              </li>
              <li className="flex items-center gap-2">
                <Icon name="bar-chart-2" size={12} className="text-green-400" />
                Analytics Dashboard
              </li>
              <li className="flex items-center gap-2 text-slate-500">
                <Icon name="x" size={12} className="text-red-400" />
                <span className="line-through">
                  Create Questions (Admin Only)
                </span>
              </li>
              <li className="flex items-center gap-2 text-slate-500">
                <Icon name="x" size={12} className="text-red-400" />
                <span className="line-through">Prompt Lab (Admin Only)</span>
              </li>
              <li className="flex items-center gap-2 text-slate-500">
                <Icon name="x" size={12} className="text-red-400" />
                <span className="line-through">Admin Panel (Admin Only)</span>
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
                All Regular User Features
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
      </div>

      {/* Create Invite Section */}
      <div className="bg-slate-800 rounded-lg p-4 border border-blue-500/30">
        <h2 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
          <Icon name="mail" size={18} />
          Generate Invite Code
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Role</label>
            <select
              value={newInviteSettings.role}
              onChange={(e) =>
                setNewInviteSettings({
                  ...newInviteSettings,
                  role: e.target.value,
                })
              }
              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Max Uses
            </label>
            <input
              type="number"
              value={newInviteSettings.maxUses}
              onChange={(e) =>
                setNewInviteSettings({
                  ...newInviteSettings,
                  maxUses: parseInt(e.target.value),
                })
              }
              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
              min="1"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Expires In (Days)
            </label>
            <input
              type="number"
              value={newInviteSettings.expiresInDays}
              onChange={(e) =>
                setNewInviteSettings({
                  ...newInviteSettings,
                  expiresInDays: parseInt(e.target.value),
                })
              }
              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
              min="1"
              max="30"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              value={newInviteSettings.note}
              onChange={(e) =>
                setNewInviteSettings({
                  ...newInviteSettings,
                  note: e.target.value,
                })
              }
              placeholder="e.g., For John Doe"
              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleCreateInvite}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold transition-all flex items-center justify-center gap-2"
        >
          <Icon name="plus" size={16} />
          Create Invite
        </button>
      </div>

      {/* Active Invites */}
      <div className="bg-slate-800 rounded-lg p-4 border border-yellow-500/30">
        <h2 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
          <Icon name="key" size={18} />
          Active Invites ({invites.length})
        </h2>

        <div className="space-y-2">
          {invites.length === 0 ? (
            <p className="text-slate-500 text-sm">No active invites</p>
          ) : (
            invites.map((invite) => (
              <div
                key={invite.code}
                className="bg-slate-700/50 p-3 rounded flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="text-white font-mono text-sm">
                    {invite.code}
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-600 mr-2">
                      {invite.role}
                    </span>
                    Uses: {invite.used}/
                    {invite.maxUses === -1 ? "∞" : invite.maxUses} | Expires:{" "}
                    {new Date(invite.expiresAt).toLocaleDateString()}
                    {invite.note && ` | ${invite.note}`}
                  </div>
                </div>

                <button
                  onClick={() => handleRevokeInvite(invite.code)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-all"
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* API Configuration */}
      <div className="bg-slate-800 rounded-lg p-4 border border-indigo-500/30">
        <h2 className="text-lg font-bold text-indigo-400 mb-3 flex items-center gap-2">
          <Icon name="key" size={18} />
          API Configuration
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              {UI_LABELS.API_KEY_LABEL}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                name="apiKey"
                value={config.apiKey}
                onChange={safeHandleChange}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none pr-10"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <Icon name={showApiKey ? "eye-off" : "eye"} size={16} />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Required for generating questions. Stored locally.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              {UI_LABELS.SHEET_URL_LABEL}
            </label>
            <input
              type="text"
              name="sheetUrl"
              value={config.sheetUrl}
              onChange={safeHandleChange}
              placeholder="https://script.google.com/..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:border-indigo-500 outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Required for Load/Export to Sheets.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Creator Name
              </label>
              <input
                type="text"
                name="creatorName"
                value={config.creatorName}
                onChange={safeHandleChange}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Reviewer Name
              </label>
              <input
                type="text"
                name="reviewerName"
                value={config.reviewerName}
                onChange={safeHandleChange}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Source Files - Super Admin Only */}
      {isSuperAdmin && (
        <div className="bg-slate-800 rounded-lg p-4 border border-blue-500/30">
          <h2 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
            <Icon name="file-text" size={18} />
            Source Material
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold uppercase text-slate-400">
                Source Files (CSV)
              </label>
              {files && files.length > 0 && (
                <button
                  onClick={handleDetectTopics}
                  disabled={isDetecting || !isApiReady}
                  className="text-[10px] flex items-center gap-1 text-indigo-400 bg-indigo-900/50 px-2 py-1 rounded border border-indigo-700/50 disabled:opacity-50"
                >
                  {isDetecting ? "..." : "Detect Topics"}
                </button>
              )}
            </div>
            <div
              onClick={() => fileInputRef?.current?.click()}
              className="border-2 border-dashed border-slate-700 rounded p-4 hover:bg-slate-700 cursor-pointer text-center transition-colors"
            >
              <Icon name="upload" className="mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">Click to upload .csv</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                className="hidden"
              />
            </div>
            {files &&
              files.map((f, i) => (
                <div
                  key={i}
                  className="flex justify-between bg-slate-700 p-2 rounded border border-slate-600 text-xs text-slate-400"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-red-500 hover:text-red-400"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Custom Tags */}
      <div className="bg-slate-800 rounded-lg p-4 border border-orange-500/30">
        <h2 className="text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">
          <Icon name="tag" size={18} />
          Custom Tags
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Create custom tags to focus question generation on specific topics
          within each discipline.
        </p>
        <TagManager
          discipline={config.discipline}
          customTags={customTags || {}}
          onSaveCustomTags={onSaveCustomTags}
        />
      </div>

      {/* Training Data Export - Super Admin Only */}
      {isSuperAdmin && (
        <div className="bg-slate-800 rounded-lg p-4 border border-purple-500/30">
          <h2 className="text-lg font-bold text-purple-400 mb-3 flex items-center gap-2">
            <Icon name="database" size={18} />
            Vertex AI Training Data
          </h2>
          <div className="flex gap-3 mb-2">
            <button
              onClick={() => downloadTrainingData(true)}
              className="flex-1 px-3 py-2 bg-purple-900/30 hover:bg-purple-900/50 text-purple-200 text-xs font-bold rounded border border-purple-700/50 transition-colors flex items-center justify-center gap-2"
              title="Download questions with >75% score"
            >
              <Icon name="download" size={14} />
              Download Good Data
            </button>
            <button
              onClick={() => downloadTrainingData(false)}
              className="flex-1 px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 text-slate-400 text-xs font-bold rounded border border-slate-600/50 transition-colors flex items-center justify-center gap-2"
              title="Download questions with <75% score"
            >
              <Icon name="download" size={14} />
              Download Bad Data
            </button>
          </div>
          <button
            onClick={() => {
              const count = downloadTrainingData("all");
              showMessage(
                `Exported ${count} total questions for training`,
                3000
              );
            }}
            className="w-full px-3 py-2 bg-blue-900/20 hover:bg-blue-900/30 text-blue-400 rounded flex items-center justify-center gap-2 transition-colors text-xs font-bold border border-blue-900/30"
          >
            <Icon name="download" size={14} />
            Export All Training Data
          </button>
          <p className="text-[10px] text-slate-500 mt-2 text-center">
            Exports JSONL format for Vertex AI fine-tuning.
          </p>
        </div>
      )}

      {/* Environment Info */}
      <div className="bg-slate-800 rounded-lg p-4 border border-cyan-500/30">
        <h2 className="text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2">
          <Icon name="server" size={18} />
          Environment Info
        </h2>
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
      </div>

      {/* Registered Users */}
      <div className="bg-slate-800 rounded-lg p-4 border border-green-500/30">
        <h2 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
          <Icon name="users" size={18} />
          Registered Users ({users.length})
        </h2>

        <div className="space-y-2">
          {users.length === 0 ? (
            <p className="text-slate-500 text-sm">No users registered yet</p>
          ) : (
            users.map((user) => (
              <div
                key={user.uid}
                className="bg-slate-700/50 p-3 rounded flex items-center justify-between"
              >
                <div>
                  <div className="text-white font-medium">{user.email}</div>
                  <div className="text-xs text-slate-400">
                    <span
                      className={`inline-block px-2 py-0.5 rounded mr-2 ${
                        user.role === "admin"
                          ? "bg-purple-600 text-white"
                          : "bg-slate-600 text-slate-300"
                      }`}
                    >
                      {user.role}
                    </span>
                    Joined: {new Date(user.registeredAt).toLocaleDateString()}
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
      </div>

      {/* Database Management - Super Admin Only */}
      {isSuperAdmin && (
        <div className="bg-slate-800 rounded-lg p-4 border border-red-500/30">
          <h2 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
            <Icon name="database" size={18} />
            Database Management
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            ⚠️ Danger Zone: These operations permanently delete data and cannot
            be undone.
          </p>

          <div className="space-y-3">
            <button
              onClick={async () => {
                if (
                  !confirm(
                    "⚠️ DELETE ALL QUESTIONS?\n\nThis will permanently delete ALL questions from the database for ALL users.\n\nThis action CANNOT be undone!\n\nType 'DELETE' to confirm."
                  )
                )
                  return;

                const confirmText = prompt("Type DELETE to confirm:");
                if (confirmText !== "DELETE") {
                  showMessage("❌ Deletion cancelled", 3000);
                  return;
                }

                try {
                  showMessage("🗑️ Deleting all questions...", 10000);
                  const count = await clearAllQuestionsFromFirestore();
                  showMessage(
                    `✅ Deleted ${count} questions from database`,
                    5000
                  );
                } catch (error) {
                  showMessage(`❌ Delete failed: ${error.message}`, 5000);
                  console.error(error);
                }
              }}
              className="w-full px-4 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-red-700/50"
            >
              <Icon name="trash-2" size={16} />
              Delete All Questions (ALL USERS)
            </button>

            <button
              onClick={async () => {
                if (
                  !confirm(
                    "Clear all rejected questions from the database?\n\nThis will only delete questions with status='rejected'."
                  )
                )
                  return;

                try {
                  showMessage("🗑️ Clearing rejected questions...", 10000);
                  // This would need a Cloud Function - for now just show message
                  showMessage(
                    "⚠️ Feature not yet implemented - needs Cloud Function",
                    5000
                  );
                } catch (error) {
                  showMessage(`❌ Clear failed: ${error.message}`, 5000);
                }
              }}
              className="w-full px-4 py-3 bg-orange-900/30 hover:bg-orange-900/50 text-orange-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-orange-700/50"
            >
              <Icon name="filter" size={16} />
              Clear Rejected Questions
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
