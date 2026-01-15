import React from "react";

/**
 * AdminStats Component
 *
 * Displays summary cards for users, invites, reviewers, and reviewed questions.
 */
const AdminStats = ({
  usersLoaded,
  usersCount,
  invitesLoaded,
  activeInvitesCount,
  totalReviewers,
  totalQuestionsReviewed,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
      {/* Users Stat */}
      <div className="bg-gradient-to-br from-blue-900/40 to-blue-950/40 p-3 rounded-lg border border-blue-500/30">
        <div className="text-xs text-blue-400/80 mb-1">Users</div>
        <div className="text-xl font-bold text-blue-300">
          {usersLoaded ? usersCount : "–"}
        </div>
      </div>

      {/* Invites Stat */}
      <div className="bg-gradient-to-br from-purple-900/40 to-purple-950/40 p-3 rounded-lg border border-purple-500/30">
        <div className="text-xs text-purple-400/80 mb-1">Invites</div>
        <div className="text-xl font-bold text-purple-300">
          {invitesLoaded ? activeInvitesCount : "–"}
        </div>
      </div>

      {/* Reviewers Stat */}
      <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-950/40 p-3 rounded-lg border border-cyan-500/30">
        <div className="text-xs text-cyan-400/80 mb-1">Reviewers</div>
        <div className="text-xl font-bold text-cyan-300">
          {totalReviewers ?? "–"}
        </div>
      </div>

      {/* Reviewed Questions Stat */}
      <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 p-3 rounded-lg border border-emerald-500/30">
        <div className="text-xs text-emerald-400/80 mb-1">Reviewed</div>
        <div className="text-xl font-bold text-emerald-300">
          {totalQuestionsReviewed ?? "–"}
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
