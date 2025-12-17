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

const functions = getFunctions(app, "us-central1");

const AdminPanel = ({ showMessage }) => {
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
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
      showMessage("✅ Invite revoked", 3000);
      await loadData();
    } catch (error) {
      showMessage(`❌ Failed to revoke: ${error.message}`, 5000);
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
      showMessage(`✅ Access revoked for ${email}`, 3000);
      await loadData();
    } catch (error) {
      showMessage(`❌ Failed to revoke user: ${error.message}`, 5000);
    }
  };

  const handleChangeRole = async (userId, currentRole, email) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (!confirm(`Change ${email} from ${currentRole} to ${newRole}?`)) return;

    try {
      const changeRoleFn = httpsCallable(functions, "changeUserRole");
      await changeRoleFn({ userId, role: newRole });
      showMessage(`✅ ${email} is now ${newRole}`, 3000);
      await loadData();
    } catch (error) {
      showMessage(`❌ Failed to change role: ${error.message}`, 5000);
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Icon name="shield" size={24} />
          Admin Panel
        </h1>
      </div>

      {/* Create Invite Section */}
      <div className="bg-slate-800 rounded-lg p-6 border border-blue-500/30">
        <h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
          <Icon name="mail" size={18} />
          Generate Invite Code
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
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

      {/* Registered Users */}
      <div className="bg-slate-800 rounded-lg p-6 border border-green-500/30">
        <h2 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
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

      {/* Active Invites */}
      <div className="bg-slate-800 rounded-lg p-6 border border-yellow-500/30">
        <h2 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
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
    </div>
  );
};

export default AdminPanel;
