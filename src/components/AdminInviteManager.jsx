/**
 * AdminInviteManager Component
 *
 * Admin-only UI for creating and managing invite codes.
 * Following react-architecture.md: Component under 150 lines
 */

import { useState } from "react";
import { createInvite, revokeInvite } from "../services/inviteService";
import Icon from "./Icon";

/**
 * InviteCreator - Form for creating new invite codes
 */
const InviteCreator = ({ onInviteCreated }) => {
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [role, setRole] = useState("user");
  const [note, setNote] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setIsCreating(true);
    setError("");
    try {
      const result = await createInvite({ maxUses, expiresInDays, role, note });
      onInviteCreated?.(result);
      setNote("");
    } catch (err) {
      setError(err.message || "Failed to create invite");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Icon name="plus-circle" size={20} className="text-orange-500" />
        Create New Invite
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="max-uses"
            className="block text-sm text-slate-400 mb-1"
          >
            Max Uses
          </label>
          <select
            id="max-uses"
            value={maxUses}
            onChange={(e) => setMaxUses(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
          >
            <option value={1}>Single Use</option>
            <option value={5}>5 Uses</option>
            <option value={10}>10 Uses</option>
            <option value={-1}>Unlimited</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="expires"
            className="block text-sm text-slate-400 mb-1"
          >
            Expires In
          </label>
          <select
            id="expires"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
          >
            <option value={1}>1 Day</option>
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
          </select>
        </div>

        <div>
          <label htmlFor="role" className="block text-sm text-slate-400 mb-1">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label htmlFor="note" className="block text-sm text-slate-400 mb-1">
            Note (optional)
          </label>
          <input
            id="note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., For John Doe"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500"
            maxLength={200}
          />
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-sm flex items-center gap-2">
          <Icon name="alert-circle" size={14} /> {error}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={isCreating}
        className="w-full py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-600 text-white font-medium rounded transition-colors"
        aria-label="Generate new invite code"
      >
        {isCreating ? "Creating..." : "Generate Invite Code"}
      </button>
    </div>
  );
};

/**
 * InviteDisplay - Shows a created invite with copy functionality
 */
const InviteDisplay = ({ invite, onRevoke }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(invite.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-green-400 font-mono text-lg">{invite.code}</span>
        <span className="text-xs text-slate-400">
          Expires: {new Date(invite.expiresAt).toLocaleDateString()}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={copyToClipboard}
          className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center justify-center gap-2"
          aria-label="Copy invite link to clipboard"
        >
          <Icon name={copied ? "check" : "copy"} size={16} />
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button
          onClick={() => onRevoke?.(invite.code)}
          className="px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-300 rounded"
          aria-label="Revoke this invite"
        >
          Revoke
        </button>
      </div>

      <input
        type="text"
        readOnly
        value={invite.inviteUrl}
        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-400 font-mono"
        aria-label="Invite URL"
      />
    </div>
  );
};

/**
 * AdminInviteManager - Main admin panel for invites
 */
const AdminInviteManager = () => {
  const [createdInvites, setCreatedInvites] = useState([]);

  const handleInviteCreated = (invite) => {
    setCreatedInvites((prev) => [invite, ...prev]);
  };

  const handleRevoke = async (code) => {
    try {
      await revokeInvite(code);
      setCreatedInvites((prev) => prev.filter((i) => i.code !== code));
    } catch (err) {
      console.error("Failed to revoke invite:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      <InviteCreator onInviteCreated={handleInviteCreated} />

      {createdInvites.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Created Invites</h3>
          {createdInvites.map((invite) => (
            <InviteDisplay
              key={invite.code}
              invite={invite}
              onRevoke={handleRevoke}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminInviteManager;
