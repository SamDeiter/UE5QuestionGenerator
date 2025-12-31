/**
 * InviteManagement - Invite creation and management
 *
 * Extracted from AdminPanel.jsx to reduce component size.
 * Handles:
 * - Creating new invites
 * - Revoking invites
 * - Sending/resending email invites via SendGrid
 */

import React, { useState } from "react";
import Icon from "../Icon";
import { createInvite, revokeInvite } from "../../services/inviteService";
import { sendReviewerInvitesViaEmail } from "../../services/cloudFunctions";

const InviteManagement = ({
  invites,
  onRefresh,
  showMessage,
  isCollapsed,
  isLoading,
  onToggle,
}) => {
  const [newInviteSettings, setNewInviteSettings] = useState({
    role: "reviewer",
    maxUses: 1,
    expiresInDays: 7,
    note: "",
    forEmail: "",
    forName: "",
  });

  const handleCreateInvite = async () => {
    try {
      const result = await createInvite(newInviteSettings);
      showMessage(`✅ Invite created! Code: ${result.code}`, 5000);

      // Copy invite URL to clipboard
      navigator.clipboard.writeText(result.inviteUrl);
      showMessage("📋 Invite URL copied to clipboard!", 3000);

      await onRefresh();
    } catch (error) {
      showMessage(`❌ Failed to create invite: ${error.message}`, 5000);
    }
  };

  const handleRevokeInvite = async (code) => {
    if (!confirm(`Revoke invite code: ${code}?`)) return;

    try {
      await revokeInvite(code);
      showMessage("✅ Invite revoked", 3000);
      setTimeout(async () => {
        await onRefresh();
      }, 500);
    } catch (error) {
      console.error("❌ Revoke invite error:", error);
      showMessage(`❌ Failed to revoke: ${error.message}`, 5000);
      await onRefresh();
    }
  };

  const handleSendEmailInvites = async () => {
    const reviewerInvites = invites.filter(
      (inv) =>
        inv.role === "reviewer" &&
        inv.currentUses < (inv.maxUses === -1 ? Infinity : inv.maxUses)
    );

    if (reviewerInvites.length === 0) {
      showMessage("⚠️ No pending reviewer invites to send", 3000);
      return;
    }

    if (
      !confirm(
        `Send ${reviewerInvites.length} reviewer invite email(s) via SendGrid?`
      )
    )
      return;

    try {
      const emailPayload = reviewerInvites.map((inv) => {
        const emailParam = inv.forEmail
          ? `&email=${encodeURIComponent(inv.forEmail)}`
          : "";
        return {
          email: inv.forEmail || "unknown@example.com",
          inviteUrl: `https://samdeiter.github.io/UE5QuestionGenerator/?invite=${inv.code}${emailParam}`,
          code: inv.code,
          note:
            inv.note ||
            `Targeted REVIEWER invite for ${inv.forEmail || "reviewer"}`,
          expiresAt: inv.expiresAt,
          maxUses: inv.maxUses,
        };
      });

      showMessage("📧 Sending emails...", 3000);
      const result = await sendReviewerInvitesViaEmail(emailPayload);

      if (result.sent.length > 0) {
        showMessage(
          `✅ Sent ${result.sent.length} email(s) successfully!`,
          5000
        );
      }

      if (result.failed.length > 0) {
        showMessage(
          `⚠️ ${result.failed.length} email(s) failed. Check console.`,
          5000
        );
        console.error("Failed emails:", result.failed);
      }
    } catch (error) {
      console.error("❌ Email send error:", error);
      showMessage(`❌ Failed to send emails: ${error.message}`, 5000);
    }
  };

  const handleResendSingleInvite = async (invite) => {
    if (!confirm(`Resend invite email to ${invite.forEmail}?`)) return;

    try {
      const emailPayload = [
        {
          email: invite.forEmail,
          inviteUrl: `https://samdeiter.github.io/UE5QuestionGenerator/?invite=${
            invite.code
          }${
            invite.forEmail
              ? `&email=${encodeURIComponent(invite.forEmail)}`
              : ""
          }`,
          code: invite.code,
          note:
            invite.note ||
            `Targeted REVIEWER invite for ${invite.forEmail || "reviewer"}`,
          expiresAt: invite.expiresAt,
          maxUses: invite.maxUses,
        },
      ];

      const result = await sendReviewerInvitesViaEmail(emailPayload);

      if (result.sent.length > 0) {
        showMessage(`✅ Resent email to ${invite.forEmail}`, 3000);
      } else {
        showMessage(`⚠️ Failed to send email`, 3000);
      }
    } catch (error) {
      console.error("❌ Resend error:", error);
      showMessage(`❌ Failed: ${error.message}`, 5000);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-blue-500/30">
      <h2
        onClick={onToggle}
        className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-blue-400 mb-3 flex items-center gap-2"
      >
        <div className="flex items-center gap-2">
          <Icon name="mail" size={18} /> Invite Management
        </div>
        <Icon
          name={isCollapsed ? "chevron-down" : "chevron-up"}
          size={16}
          className="ml-auto opacity-50"
        />
      </h2>
      {!isCollapsed && (
        <>
          {/* Generate New Invite Form */}
          <div className="bg-slate-700/30 rounded-lg p-4 mb-4 border border-blue-500/20">
            <h3 className="text-sm font-bold text-blue-300 mb-3 flex items-center gap-2">
              <Icon name="plus" size={14} /> Create New Invite
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Role
                </label>
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
                  <option value="reviewer">Reviewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Max Uses
                </label>
                <select
                  value={newInviteSettings.maxUses}
                  onChange={(e) =>
                    setNewInviteSettings({
                      ...newInviteSettings,
                      maxUses: parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                >
                  <option value="1">1 use (Single invite)</option>
                  <option value="5">5 uses (Small team)</option>
                  <option value="10">10 uses (Team invite)</option>
                  <option value="-1">Unlimited (Public link)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Expires In
                </label>
                <select
                  value={newInviteSettings.expiresInDays}
                  onChange={(e) =>
                    setNewInviteSettings({
                      ...newInviteSettings,
                      expiresInDays: parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                >
                  <option value="1">1 day (Urgent)</option>
                  <option value="7">7 days (Standard)</option>
                  <option value="14">14 days (Extended)</option>
                  <option value="30">30 days (Maximum)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={newInviteSettings.forName}
                  onChange={(e) =>
                    setNewInviteSettings({
                      ...newInviteSettings,
                      forName: e.target.value,
                    })
                  }
                  placeholder="e.g., John Doe"
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={newInviteSettings.forEmail}
                  onChange={(e) =>
                    setNewInviteSettings({
                      ...newInviteSettings,
                      forEmail: e.target.value,
                    })
                  }
                  placeholder="reviewer@example.com"
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm"
                />
              </div>

              <div className="col-span-2">
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
                  placeholder="e.g., Technical Artist reviewer"
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

          {/* Active Invites List */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-yellow-400 mb-2 flex items-center gap-2">
              <Icon name="key" size={14} /> Active Invites ({invites.length})
            </h3>
            {isLoading ? (
              <div className="flex items-center justify-center p-4 text-slate-400">
                <Icon name="loader" className="animate-spin mr-2" size={16} />
                Loading invites...
              </div>
            ) : invites.length === 0 ? (
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
                      Uses: {invite.currentUses || 0}/
                      {invite.maxUses === -1 ? "∞" : invite.maxUses}
                      {invite.forEmail && ` | Email: ${invite.forEmail}`}
                      {invite.note && ` | ${invite.note}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {invite.forEmail && (
                      <button
                        onClick={() => handleResendSingleInvite(invite)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-all flex items-center gap-1"
                        title={`Resend email to ${invite.forEmail}`}
                      >
                        <Icon name="mail" size={12} />
                        Resend
                      </button>
                    )}

                    <button
                      onClick={() => handleRevokeInvite(invite.code)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-all"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Send Email Invites Button */}
          {invites.some((inv) => inv.role === "reviewer") && (
            <div className="mt-4 pt-4 border-t border-blue-500/20">
              <button
                onClick={handleSendEmailInvites}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Icon name="mail" size={18} />
                Send Reviewer Invite Emails
              </button>
              <p className="text-xs text-slate-500 mt-2 text-center">
                Sends personalized emails via SendGrid to pending reviewer
                invites
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InviteManagement;
