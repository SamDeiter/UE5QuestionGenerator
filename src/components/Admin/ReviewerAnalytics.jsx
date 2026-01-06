import React from "react";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";

const ReviewerAnalytics = ({
  reviewerAnalytics,
  analyticsLoading,
  loadReviewerAnalytics,
  formatDuration,
  formatAnalyticsDate,
  isCollapsed,
  onToggle,
}) => {
  const renderContent = () => {
    if (!reviewerAnalytics && !analyticsLoading) {
      return (
        <button
          onClick={loadReviewerAnalytics}
          disabled={analyticsLoading}
          className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-bold transition-all flex items-center justify-center gap-2"
        >
          <Icon name="bar-chart-2" size={16} />
          Load Reviewer Analytics
        </button>
      );
    }

    if (analyticsLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-700/30 rounded border border-cyan-500/20">
          <Icon
            name="loader"
            className="animate-spin text-cyan-400 mb-2"
            size={24}
          />
          <p className="text-cyan-300 text-sm font-medium">
            Loading Analytics...
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-700/50 p-3 rounded border border-cyan-500/20">
            <div className="text-xs text-slate-400 mb-1">Total Reviewers</div>
            <div className="text-2xl font-bold text-cyan-400">
              {reviewerAnalytics.metadata.totalReviewers}
            </div>
          </div>
          <div className="bg-slate-700/50 p-3 rounded border border-cyan-500/20">
            <div className="text-xs text-slate-400 mb-1">
              Questions Reviewed
            </div>
            <div className="text-2xl font-bold text-cyan-400">
              {reviewerAnalytics.metadata.totalQuestionsReviewed}
            </div>
          </div>
          <div className="bg-slate-700/50 p-3 rounded border border-cyan-500/20">
            <div className="text-xs text-slate-400 mb-1">Last Updated</div>
            <div className="text-sm font-medium text-cyan-400">
              {new Date(
                reviewerAnalytics.metadata.lastUpdated
              ).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Reviewer Stats Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cyan-500/20">
                <th className="text-left p-2 text-xs text-cyan-400 font-bold">
                  Reviewer
                </th>
                <th className="text-center p-2 text-xs text-cyan-400 font-bold">
                  Questions
                </th>
                <th className="text-center p-2 text-xs text-cyan-400 font-bold">
                  Accepted
                </th>
                <th className="text-center p-2 text-xs text-cyan-400 font-bold">
                  Rejected
                </th>
                <th className="text-center p-2 text-xs text-cyan-400 font-bold">
                  Avg Time
                </th>
                <th className="text-center p-2 text-xs text-cyan-400 font-bold">
                  Total Time
                </th>
                <th className="text-center p-2 text-xs text-cyan-400 font-bold">
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody>
              {reviewerAnalytics.reviewerStats.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-4 text-slate-500">
                    No reviewer activity data found
                  </td>
                </tr>
              ) : (
                reviewerAnalytics.reviewerStats.map((reviewer, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="p-2 text-white font-medium">
                      {reviewer.name}
                    </td>
                    <td className="p-2 text-center text-slate-300">
                      {reviewer.totalQuestionsReviewed}
                    </td>
                    <td className="p-2 text-center text-green-400">
                      {reviewer.acceptedCount}
                    </td>
                    <td className="p-2 text-center text-red-400">
                      {reviewer.rejectedCount}
                    </td>
                    <td className="p-2 text-center text-slate-300">
                      {formatDuration(reviewer.averageReviewTimeSeconds)}
                    </td>
                    <td className="p-2 text-center text-slate-300">
                      {formatDuration(reviewer.totalReviewTimeSeconds)}
                    </td>
                    <td className="p-2 text-center text-slate-400 text-xs">
                      {formatAnalyticsDate(reviewer.lastReviewDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Refresh Button */}
        <button
          onClick={loadReviewerAnalytics}
          disabled={analyticsLoading}
          className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm transition-all flex items-center justify-center gap-2 mt-3 shadow-inner"
        >
          {analyticsLoading ? (
            <>
              <Icon name="loader" className="animate-spin" size={14} />
              Refreshing...
            </>
          ) : (
            <>
              <Icon name="refresh-cw" size={14} />
              Refresh Analytics
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <CollapsibleSection
      title="Reviewer Analytics"
      icon="bar-chart-2"
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      variant="cyan"
    >
      {renderContent()}
    </CollapsibleSection>
  );
};

export default ReviewerAnalytics;
