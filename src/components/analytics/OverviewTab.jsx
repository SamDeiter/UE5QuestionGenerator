import Icon from "../Icon";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import SafeResponsiveContainer from "./SafeResponsiveContainer";
import StatCard from "./StatCard";
import EmptyState from "../EmptyState";

/**
 * OverviewTab - Dashboard overview with summary stats and charts
 *
 * @param {Object} props
 * @param {Object} props.summary - Summary statistics for the period
 * @param {Array} props.statusData - Question status distribution data
 * @param {Array} props.difficultyData - Difficulty distribution data
 * @param {Array} props.recentGenerations - Recent generation trend data
 */
const OverviewTab = ({
  summary,
  statusData,
  difficultyData,
  recentGenerations,
}) => {
  return (
    <div className="space-y-6">
      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Questions"
          value={summary.totalQuestions || 0}
          icon="file-text"
          color="blue"
        />
        <StatCard
          title="Acceptance Rate"
          value={`${summary.acceptanceRate || 0}%`}
          icon="check-circle"
          color="emerald"
        />
        <StatCard
          title="Avg Quality"
          value={summary.averageQuality || 0}
          icon="star"
          color="amber"
        />
        <StatCard
          title="Total Cost"
          value={`$${(summary.estimatedCost || 0).toFixed(4)}`}
          icon="dollar-sign"
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
            <Icon name="pie-chart" size={16} className="text-emerald-400" />
            Question Status
          </h3>
          <div className="h-64">
            {statusData.length > 0 ? (
              <SafeResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
              >
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {statusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                    }}
                  />
                </PieChart>
              </SafeResponsiveContainer>
            ) : (
              <EmptyState message="No question data yet" />
            )}
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
            <Icon name="sliders" size={16} className="text-amber-400" />
            Difficulty Distribution
          </h3>
          <div className="h-64">
            {difficultyData.length > 0 ? (
              <SafeResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
              >
                <BarChart
                  data={difficultyData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fontSize: 10, angle: -45, textAnchor: "end" }}
                    height={60}
                  />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} activeBar={false}>
                    {difficultyData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </SafeResponsiveContainer>
            ) : (
              <EmptyState message="No difficulty data yet" />
            )}
          </div>
        </div>
      </div>

      {/* Generation Trend */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Icon name="trending-up" size={16} className="text-blue-400" />
          Recent Generation Activity
        </h3>
        <div className="h-64">
          {recentGenerations.length > 0 ? (
            <SafeResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
            >
              <AreaChart
                data={recentGenerations}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="colorQuestions"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorTokens)"
                  name="Tokens"
                />
                <Area
                  type="monotone"
                  dataKey="questions"
                  stroke="#22c55e"
                  fillOpacity={1}
                  fill="url(#colorQuestions)"
                  name="Questions"
                />
              </AreaChart>
            </SafeResponsiveContainer>
          ) : (
            <EmptyState message="Generate some questions to see trends" />
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
