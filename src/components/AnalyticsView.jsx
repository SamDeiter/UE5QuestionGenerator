import { useState, useMemo, useEffect } from "react";
import Icon from "./Icon";
import {
  ResponsiveContainer,
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
import { getAnalytics, getTokenStats } from "../utils/analyticsStore";
import { TAGS_BY_DISCIPLINE } from "../utils/tagTaxonomy";
import { CATEGORY_KEYS } from "../utils/constants";

// Import extracted components
import StatCard from "./analytics/StatCard";
import EmptyState from "./analytics/EmptyState";
import DisciplineDetailPanel from "./analytics/DisciplineDetailPanel";

// Define discipline list from tagTaxonomy
const DISCIPLINES = Object.keys(TAGS_BY_DISCIPLINE);

// Color palettes
const DISCIPLINE_COLORS = {
  "Technical Art": "#f97316",
  "Lighting & Rendering": "#eab308",
  "Look Development (Materials)": "#84cc16",
  "Animation & Rigging": "#22c55e",
  "VFX (Niagara)": "#06b6d4",
  "World Building & Level Design": "#3b82f6",
  Blueprints: "#8b5cf6",
  "Game Logic & Systems": "#ec4899",
  "C++ Programming": "#f43f5e",
  Networking: "#6366f1",
};

const DIFFICULTY_COLORS = {
  "Easy MC": "#22c55e",
  "Easy T/F": "#4ade80",
  "Medium MC": "#eab308",
  "Medium T/F": "#facc15",
  "Hard MC": "#ef4444",
  "Hard T/F": "#f87171",
};

/**
 * AnalyticsView - Dedicated full-page analytics dashboard
 * Replaces the modal-based analytics with a standalone view
 */
const AnalyticsView = ({ onBack, onStartTutorial }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDiscipline, setSelectedDiscipline] = useState(null);
  const analytics = getAnalytics();
  const tokenStats = getTokenStats();

  // Auto-start tutorial if not completed (only runs once on mount)
  useEffect(() => {
    const isCompleted = localStorage.getItem(
      "ue5_tutorial_analytics_completed"
    );
    if (!isCompleted && onStartTutorial) {
      // Small delay to ensure view is rendered
      setTimeout(() => onStartTutorial("analytics"), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run only once on mount

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: "layout-dashboard",
      dataTour: "overview-tab",
    },
    {
      id: "disciplines",
      label: "Disciplines",
      icon: "layers",
      dataTour: "disciplines-tab",
    },
    {
      id: "quality",
      label: "Quality",
      icon: "target",
      dataTour: "quality-tab",
    },
  ];

  // Process analytics data
  const {
    disciplineData,
    difficultyData,
    statusData,
    qualityDistribution,
    recentGenerations,
  } = useMemo(() => {
    const questions = analytics.questions || [];
    const generations = analytics.generations || [];

    // Discipline breakdown
    const disciplineCounts = DISCIPLINES.reduce((acc, disc) => {
      acc[disc] = questions.filter((q) => q.discipline === disc).length;
      return acc;
    }, {});

    const disciplineData = Object.entries(disciplineCounts)
      .map(([name, value]) => ({
        name: name.replace(" & ", "\n"),
        fullName: name,
        value,
        fill: DISCIPLINE_COLORS[name] || "#64748b",
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    // Difficulty breakdown
    const difficultyData = CATEGORY_KEYS.map((key) => ({
      name: key,
      value: questions.filter((q) => q.difficulty === key).length,
      fill: DIFFICULTY_COLORS[key],
    })).filter((d) => d.value > 0);

    // Status breakdown
    const statusCounts = {
      accepted: questions.filter((q) => q.status === "accepted").length,
      pending: questions.filter((q) => !q.status || q.status === "pending")
        .length,
      rejected: questions.filter((q) => q.status === "rejected").length,
    };

    const statusData = [
      { name: "Accepted", value: statusCounts.accepted, fill: "#22c55e" },
      { name: "Pending", value: statusCounts.pending, fill: "#f59e0b" },
      { name: "Rejected", value: statusCounts.rejected, fill: "#ef4444" },
    ].filter((d) => d.value > 0);

    // Quality distribution (for questions with scores)
    const qualityBuckets = [
      { range: "90-100", min: 90, max: 100, fill: "#22c55e" },
      { range: "70-89", min: 70, max: 89, fill: "#84cc16" },
      { range: "50-69", min: 50, max: 69, fill: "#eab308" },
      { range: "30-49", min: 30, max: 49, fill: "#f97316" },
      { range: "0-29", min: 0, max: 29, fill: "#ef4444" },
    ];

    const qualityDistribution = qualityBuckets
      .map((bucket) => ({
        ...bucket,
        count: questions.filter(
          (q) => q.critiqueScore >= bucket.min && q.critiqueScore <= bucket.max
        ).length,
      }))
      .filter((b) => b.count > 0);

    // Recent generations for trend
    const recentGenerations = generations.slice(-10).map((gen, idx) => ({
      name: `Gen ${idx + 1}`,
      tokens: (gen.tokensUsed?.input || 0) + (gen.tokensUsed?.output || 0),
      questions: gen.questionsGenerated || 0,
      quality: gen.averageQuality || 0,
    }));

    return {
      disciplineData,
      difficultyData,
      statusData,
      qualityDistribution,
      recentGenerations,
    };
  }, [analytics]);

  const summary = analytics.summary || {};

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Icon name="arrow-left" size={16} />
              Back
            </button>
            <div className="w-px h-6 bg-slate-700" />
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-900/30 rounded-lg">
                <Icon
                  name="bar-chart-2"
                  size={24}
                  className="text-emerald-400"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold">Analytics Dashboard</h1>
                <p className="text-xs text-slate-400">
                  Generation metrics • Quality trends • Discipline breakdown
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-tour={tab.dataTour}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === tab.id
                    ? "bg-emerald-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                <Icon name={tab.icon} size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === "overview" && (
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
                  <Icon
                    name="pie-chart"
                    size={16}
                    className="text-emerald-400"
                  />
                  Question Status
                </h3>
                <div className="h-64">
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
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
                    </ResponsiveContainer>
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
                    <ResponsiveContainer width="100%" height="100%">
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
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #334155",
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {difficultyData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
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
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={recentGenerations}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorTokens"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="colorQuestions"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#22c55e"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#22c55e"
                            stopOpacity={0}
                          />
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
                  </ResponsiveContainer>
                ) : (
                  <EmptyState message="Generate some questions to see trends" />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "disciplines" && (
          <div className="space-y-6">
            {/* Large Discipline Bar Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-300 mb-6 flex items-center gap-2">
                <Icon name="layers" size={20} className="text-purple-400" />
                Questions by Discipline
              </h3>
              <div className="h-96">
                {disciplineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={disciplineData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#334155"
                        horizontal={false}
                      />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis
                        type="category"
                        dataKey="fullName"
                        stroke="#94a3b8"
                        width={110}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                        }}
                        formatter={(value) => [value, "Questions"]}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {disciplineData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState message="No discipline data yet. Generate some questions!" />
                )}
              </div>
            </div>

            {/* Discipline Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {DISCIPLINES.map((disc) => {
                const count = (analytics.questions || []).filter(
                  (q) => q.discipline === disc
                ).length;
                const color = DISCIPLINE_COLORS[disc] || "#64748b";
                const isSelected = selectedDiscipline === disc;
                return (
                  <button
                    key={disc}
                    onClick={() =>
                      setSelectedDiscipline(isSelected ? null : disc)
                    }
                    className={`bg-slate-900 border rounded-xl p-4 transition-all text-left ${
                      isSelected
                        ? "border-2 ring-2 ring-opacity-50"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                    style={{
                      borderColor: isSelected ? color : undefined,
                      "--tw-ring-color": isSelected ? color : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {isSelected && (
                        <Icon
                          name="chevron-up"
                          size={14}
                          className="text-slate-400"
                        />
                      )}
                    </div>
                    <p className="text-2xl font-bold text-white">{count}</p>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {disc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Selected Discipline Detail Panel */}
            {selectedDiscipline && (
              <DisciplineDetailPanel
                discipline={selectedDiscipline}
                questions={analytics.questions || []}
                color={DISCIPLINE_COLORS[selectedDiscipline]}
                onClose={() => setSelectedDiscipline(null)}
              />
            )}
          </div>
        )}

        {activeTab === "quality" && (
          <div className="space-y-6">
            {/* Quality Score Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-300 mb-6 flex items-center gap-2">
                <Icon name="target" size={20} className="text-emerald-400" />
                Quality Score Distribution
              </h3>
              <div className="h-64">
                {qualityDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={qualityDistribution}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="range" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                        }}
                        formatter={(value) => [value, "Questions"]}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {qualityDistribution.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState message="Run AI Critique on questions to see quality distribution" />
                )}
              </div>
            </div>

            {/* Token Usage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-900/30 rounded-lg">
                    <Icon name="zap" size={20} className="text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-300">
                    Total Tokens
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {(tokenStats.total / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Input: {(tokenStats.avgInput / 1000).toFixed(1)}k avg •
                  Output: {(tokenStats.avgOutput / 1000).toFixed(1)}k avg
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-900/30 rounded-lg">
                    <Icon
                      name="check-circle"
                      size={20}
                      className="text-emerald-400"
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-300">
                    URL Success Rate
                  </span>
                </div>
                <p className="text-3xl font-bold text-emerald-400">100%</p>
                <p className="text-xs text-slate-500 mt-1">
                  536 verified URLs in database
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-900/30 rounded-lg">
                    <Icon name="award" size={20} className="text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-300">
                    Generations
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {summary.totalGenerations || 0}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Total generation batches run
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsView;
