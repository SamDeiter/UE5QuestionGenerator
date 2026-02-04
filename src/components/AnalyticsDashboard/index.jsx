/**
 * AnalyticsDashboard
 * Main analytics dashboard component - thin orchestrator
 *
 * This component manages:
 * - Modal open/close state
 * - Time range filtering
 * - Analytics data fetching
 *
 * Individual chart components handle their own rendering and data transformation.
 */
import { useState, useMemo } from "react";
import { BarChart2, Download, X } from "lucide-react";
import { getAnalytics } from "../../utils/analyticsStore";
import { TIME } from "../../utils/constants";

// Chart components
import MetricsSection from "./MetricsSection";
import TokenUsageChart from "./TokenUsageChart";
import QualityDistributionChart from "./QualityDistributionChart";
import AcceptanceRateChart from "./AcceptanceRateChart";
import RejectionReasonsChart from "./RejectionReasonsChart";
import TrainingDataProgress from "./TrainingDataProgress";
import TopicCoverageAnalysis from "./TopicCoverageAnalysis";

/**
 * Time range options for filtering
 */
const TIME_RANGES = {
  "24h": TIME.DAY,
  "7d": TIME.WEEK,
  "15d": 15 * TIME.DAY,
  "30d": TIME.MONTH,
  "90d": TIME.QUARTER,
  all: null, // No filtering
};

/**
 * Filter analytics data based on time range
 */
const filterByTimeRange = (data, timeRange) => {
  if (timeRange === "all") return data;

  const cutoffMs = TIME_RANGES[timeRange];
  if (!cutoffMs) return data;

  const cutoffDate = new Date(Date.now() - cutoffMs);

  return {
    generations: data.generations.filter(
      (g) => new Date(g.timestamp) >= cutoffDate
    ),
    questions: data.questions.filter(
      (q) => new Date(q.created || q.timestamp || q.dateAdded) >= cutoffDate
    ),
    summary: data.summary, // Keep overall summary
  };
};

const AnalyticsDashboard = ({ isOpen, onClose }) => {
  const [timeRange, setTimeRange] = useState("7d");

  // Re-fetch analytics data whenever modal opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allAnalyticsData = isOpen
    ? getAnalytics()
    : { generations: [], questions: [], summary: {} };

  // Filter data based on time range
  const analyticsData = useMemo(
    () => filterByTimeRange(allAnalyticsData, timeRange),
    [allAnalyticsData, timeRange]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <BarChart2 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Analytics Dashboard
              </h2>
              <p className="text-xs text-slate-400">
                Track generation performance and costs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-300 text-sm rounded px-3 py-1.5 outline-none focus:border-indigo-500"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="15d">Last 15 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>

            <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded border border-slate-700 transition-colors">
              <Download size={14} />
              Export CSV
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Metrics */}
          <MetricsSection analyticsData={analyticsData} />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TokenUsageChart generations={analyticsData.generations} />
            <QualityDistributionChart questions={analyticsData.questions} />
            <AcceptanceRateChart questions={analyticsData.questions} />
            <RejectionReasonsChart questions={analyticsData.questions} />
          </div>

          {/* Training Data Progress */}
          <TrainingDataProgress questions={analyticsData.questions} />

          {/* Topic Coverage Analysis */}
          <TopicCoverageAnalysis questions={analyticsData.questions} />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
