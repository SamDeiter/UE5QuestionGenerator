import Icon from "../Icon";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import SafeResponsiveContainer from "./SafeResponsiveContainer";
import StatCard from "./StatCard";
import EmptyState from "../EmptyState";

/**
 * OverviewTab - Dashboard overview with pipeline funnel and charts
 */
const OverviewTab = ({
  summary,
  statusData,
  difficultyData,
  pipelineMetrics = {},
  translationLanguages = {},
}) => {
  // Build funnel data for pipeline visualization
  const funnelData = [
    { name: "Generated", value: pipelineMetrics.total || 0, fill: "#3b82f6" },
    {
      name: "Critiqued",
      value: pipelineMetrics.critiqued || 0,
      fill: "#8b5cf6",
    },
    { name: "Verified", value: pipelineMetrics.verified || 0, fill: "#f59e0b" },
    { name: "Accepted", value: pipelineMetrics.accepted || 0, fill: "#22c55e" },
  ];

  // Translation coverage
  const englishCount = translationLanguages["English"] || 0;
  const translatedCount = Object.entries(translationLanguages)
    .filter(([lang]) => lang !== "English")
    .reduce((sum, [, count]) => sum + count, 0);
  const translationPercent =
    englishCount > 0 ? Math.round((translatedCount / englishCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Pipeline Funnel - Review Workflow */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Icon name="git-branch" size={16} className="text-blue-400" />
          Review Pipeline
        </h3>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {funnelData.map((stage, idx) => (
            <div key={stage.name} className="flex items-center gap-2 min-w-0">
              <div
                className="flex flex-col items-center px-4 py-3 rounded-lg min-w-[100px]"
                style={{
                  backgroundColor: `${stage.fill}20`,
                  borderColor: stage.fill,
                  borderWidth: 1,
                }}
              >
                <span
                  className="text-2xl font-bold"
                  style={{ color: stage.fill }}
                >
                  {stage.value}
                </span>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {stage.name}
                </span>
              </div>
              {idx < funnelData.length - 1 && (
                <Icon
                  name="chevron-right"
                  size={20}
                  className="text-slate-600 flex-shrink-0"
                />
              )}
            </div>
          ))}
          {/* Translations as bonus stage */}
          <div className="flex items-center gap-2 min-w-0">
            <Icon
              name="chevron-right"
              size={20}
              className="text-slate-600 flex-shrink-0"
            />
            <div className="flex flex-col items-center px-4 py-3 rounded-lg min-w-[100px] bg-indigo-950/50 border border-indigo-800">
              <span className="text-2xl font-bold text-indigo-400">
                {translatedCount}
              </span>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                Translated
              </span>
            </div>
          </div>
        </div>
      </div>

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
          title="Tokens (In / Out)"
          value={`${summary.inputTokens || 0} / ${summary.outputTokens || 0}`}
          icon="zap"
          color="indigo"
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
                    stroke="#e2e8f0"
                    tick={{ fontSize: 10, angle: -45, textAnchor: "end" }}
                    height={60}
                  />
                  <YAxis stroke="#e2e8f0" />
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

      {/* Translation Coverage by Language */}
      {Object.keys(translationLanguages).length > 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
            <Icon name="globe" size={16} className="text-indigo-400" />
            Questions by Language
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(translationLanguages)
              .sort((a, b) => b[1] - a[1])
              .map(([lang, count]) => (
                <div
                  key={lang}
                  className={`px-4 py-2 rounded-lg border ${
                    lang === "English"
                      ? "bg-blue-950/50 border-blue-800 text-blue-300"
                      : "bg-slate-800 border-slate-700 text-slate-300"
                  }`}
                >
                  <span className="font-bold">{count}</span>
                  <span className="text-xs ml-2 opacity-70">{lang}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewTab;
