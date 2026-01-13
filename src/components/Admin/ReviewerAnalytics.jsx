import React from "react";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";
import { useThemeColors } from "../../hooks/useThemeColors";

const ReviewerAnalytics = ({
  reviewerAnalytics,
  analyticsLoading,
  loadReviewerAnalytics,
  formatDuration,
  formatAnalyticsDate,
  isCollapsed,
  onToggle,
}) => {
  const { colorblindMode } = useThemeColors();

  // Colorblind-safe color mappings
  const acceptedColor = colorblindMode ? "text-blue-400" : "text-green-400";
  const rejectedColor = colorblindMode ? "text-rose-400" : "text-red-400";
  const warningColor = "text-amber-400"; // Same for both modes
  const activeGreen = colorblindMode ? "bg-blue-500" : "bg-green-500";
  const activeAmber = colorblindMode ? "bg-purple-500" : "bg-amber-500";

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

        {/* Rejection Reasons Breakdown */}
        {reviewerAnalytics.metadata.rejectionReasons &&
          Object.keys(reviewerAnalytics.metadata.rejectionReasons).length >
            0 && (
            <div className="bg-slate-700/50 p-3 rounded border border-red-500/20 mb-4">
              <div className="text-xs text-red-400 font-bold mb-2 flex items-center gap-2">
                <span>📊</span> Rejection Reasons Breakdown
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(reviewerAnalytics.metadata.rejectionReasons)
                  .sort(([, a], [, b]) => b - a) // Sort by count descending
                  .map(([reason, count]) => {
                    const label = reason
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase());
                    return (
                      <div
                        key={reason}
                        className="flex items-center gap-1.5 bg-red-950/50 px-2 py-1 rounded text-xs"
                      >
                        <span className="text-red-400 font-bold">{count}</span>
                        <span className="text-slate-300">{label}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

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
                  Accept %
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
                  <td colSpan="8" className="text-center p-4 text-slate-500">
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
                      <div className="flex items-center gap-2">
                        {/* Activity Status Icon */}
                        {(() => {
                          const lastDate = reviewer.lastReviewDate
                            ? new Date(reviewer.lastReviewDate)
                            : null;
                          const now = new Date();
                          const daysSinceActive = lastDate
                            ? Math.floor(
                                (now - lastDate) / (1000 * 60 * 60 * 24)
                              )
                            : 999;

                          if (daysSinceActive === 0) {
                            // Active today
                            return (
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${activeGreen} animate-pulse flex-shrink-0`}
                                title="Active today"
                              />
                            );
                          } else if (daysSinceActive <= 7) {
                            // Active this week
                            return (
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${activeAmber} flex-shrink-0`}
                                title={`Active ${daysSinceActive} day${
                                  daysSinceActive !== 1 ? "s" : ""
                                } ago`}
                              />
                            );
                          } else {
                            // Inactive
                            return (
                              <span
                                className="w-2.5 h-2.5 rounded-full bg-slate-500 flex-shrink-0"
                                title={
                                  lastDate
                                    ? `Last active ${daysSinceActive} days ago`
                                    : "No activity"
                                }
                              />
                            );
                          }
                        })()}
                        {reviewer.name}
                        {/* Top Performer Badge - highest review count */}
                        {idx === 0 && reviewer.totalQuestionsReviewed > 0 && (
                          <span
                            className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded"
                            title="Top Reviewer"
                          >
                            🏆
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center text-slate-300">
                      {reviewer.totalQuestionsReviewed}
                    </td>
                    <td className={`p-2 text-center ${acceptedColor}`}>
                      {reviewer.acceptedCount}
                    </td>
                    <td className={`p-2 text-center ${rejectedColor}`}>
                      {reviewer.rejectedCount}
                    </td>
                    {/* Acceptance Rate % */}
                    <td className="p-2 text-center">
                      {(() => {
                        const total =
                          reviewer.acceptedCount + reviewer.rejectedCount;
                        if (total === 0)
                          return <span className="text-slate-500">--</span>;
                        const rate = Math.round(
                          (reviewer.acceptedCount / total) * 100
                        );
                        // Get color based on rate thresholds
                        let color = rejectedColor; // Default for low rates
                        if (rate >= 80) color = acceptedColor;
                        else if (rate >= 60) color = warningColor;
                        return (
                          <span className={`font-bold ${color}`}>{rate}%</span>
                        );
                      })()}
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
