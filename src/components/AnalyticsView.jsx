import { useState, useMemo, useEffect } from "react";
import Icon from "./Icon";
import { getAnalytics, getTokenStats } from "../utils/analyticsStore";
import { TAGS_BY_DISCIPLINE } from "../utils/tagTaxonomy";

// Import extracted tab components
import OverviewTab from "./analytics/OverviewTab";
import DisciplinesTab from "./analytics/DisciplinesTab";
import QualityTab from "./analytics/QualityTab";

// Define discipline list from tagTaxonomy
const DISCIPLINES = Object.keys(TAGS_BY_DISCIPLINE);

// Color palettes - using highly distinct, contrasting colors
const DISCIPLINE_COLORS = {
  // Full names
  "Technical Art": "#f97316",
  "Lighting & Rendering": "#eab308",
  "Look Development (Materials)": "#facc15",
  "Animation & Rigging": "#a855f7",
  "VFX (Niagara)": "#22d3ee",
  "World Building & Level Design": "#6366f1",
  Blueprints: "#8b5cf6",
  "Game Logic & Systems": "#ec4899",
  "C++ Programming": "#dc2626",
  Networking: "#8b5cf6",
  // Abbreviated names
  "Tech Art": "#f97316",
  "Look Dev": "#facc15",
  Animation: "#a855f7",
  VFX: "#22d3ee",
  Worldbuilding: "#6366f1",
  "Game Dev": "#ec4899",
  Programming: "#dc2626",
};

/**
 * AnalyticsView - Dedicated full-page analytics dashboard
 * Replaces the modal-based analytics with a standalone view
 */
const AnalyticsView = ({
  onBack,
  onStartTutorial,
  allQuestionsMap = new Map(),
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const analytics = getAnalytics();
  const tokenStats = getTokenStats();

  // PERFORMANCE: Stable reference for allQuestions - only update when map size actually changes
  const mapSize = allQuestionsMap?.size || 0;
  const allQuestions = useMemo(() => {
    if (!allQuestionsMap || mapSize === 0) return [];
    return Array.from(allQuestionsMap.values()).flat();
  }, [allQuestionsMap, mapSize]);

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

  const {
    disciplineData,
    difficultyData,
    statusData,
    qualityDistribution,
    recentGenerations,
    filteredSummary,
    filteredQuestions,
    pipelineMetrics,
    translationLanguages,
  } = useMemo(() => {
    const questions = allQuestions;
    const generations = analytics.generations || [];

    // Calculate summary for the filtered view
    const filteredSummary = {
      totalQuestions: questions.length,
      totalGenerations: generations.length,
      acceptanceRate: 0,
      averageQuality: 0,
      estimatedCost: generations.reduce(
        (sum, g) => sum + (g.estimatedCost || 0),
        0
      ),
    };

    // Recalculate Acceptance Rate
    const decidedQuestions = questions.filter(
      (q) => q.status === "accepted" || q.status === "rejected"
    );
    if (decidedQuestions.length > 0) {
      const accepted = decidedQuestions.filter(
        (q) => q.status === "accepted"
      ).length;
      filteredSummary.acceptanceRate = Math.round(
        (accepted / decidedQuestions.length) * 100
      );
    }

    // Recalculate Average Quality
    const questionsWithQuality = questions.filter(
      (q) => q.qualityScore != null
    );
    if (questionsWithQuality.length > 0) {
      const totalQuality = questionsWithQuality.reduce(
        (sum, q) => sum + q.qualityScore,
        0
      );
      filteredSummary.averageQuality = Math.round(
        totalQuality / questionsWithQuality.length
      );
    }

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

    // Difficulty breakdown - normalize all difficulty values to base type
    const getDifficultyBase = (difficulty) => {
      if (!difficulty) return null;
      const d = difficulty.toString().toLowerCase().trim();
      if (d.includes("easy") || d.includes("beginner")) return "Beginner";
      if (d.includes("medium") || d.includes("intermediate"))
        return "Intermediate";
      if (d.includes("hard") || d.includes("expert") || d.includes("advanced"))
        return "Expert";
      return null;
    };

    // Count questions by normalized difficulty
    const difficultyCounts = questions.reduce((acc, q) => {
      const base = getDifficultyBase(q.difficulty);
      if (base) {
        acc[base] = (acc[base] || 0) + 1;
      }
      return acc;
    }, {});

    const difficultyData = [
      {
        name: "Beginner",
        value: difficultyCounts["Beginner"] || 0,
        fill: "#22c55e",
      },
      {
        name: "Intermediate",
        value: difficultyCounts["Intermediate"] || 0,
        fill: "#eab308",
      },
      {
        name: "Expert",
        value: difficultyCounts["Expert"] || 0,
        fill: "#ef4444",
      },
    ].filter((d) => d.value > 0);

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

    // Pipeline metrics - track workflow stages
    const englishQuestions = questions.filter(
      (q) => !q.language || q.language === "English"
    );
    const pipelineMetrics = {
      total: englishQuestions.length,
      critiqued: englishQuestions.filter((q) => q.critiqueScore != null).length,
      verified: englishQuestions.filter((q) => q.humanVerified === true).length,
      accepted: statusCounts.accepted,
      // Count translations (non-English questions)
      translated: questions.filter(
        (q) => q.language && q.language !== "English"
      ).length,
    };

    // Get unique languages for translation coverage
    const translationLanguages = {};
    questions.forEach((q) => {
      const lang = q.language || "English";
      translationLanguages[lang] = (translationLanguages[lang] || 0) + 1;
    });

    return {
      disciplineData,
      difficultyData,
      statusData,
      qualityDistribution,
      recentGenerations,
      filteredSummary,
      filteredQuestions: questions,
      pipelineMetrics,
      translationLanguages,
    };
  }, [analytics, allQuestions]);

  const summary = filteredSummary || analytics.summary || {};

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Icon name="arrow-left" size={16} />
              Back
            </button>
            <div className="w-px h-6 bg-slate-700 hidden md:block" />
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
                <p className="text-xs text-slate-400 hidden sm:block">
                  Generation metrics • Quality trends • Discipline breakdown
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            {/* Tab Navigation */}
            <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                    activeTab === tab.id
                      ? "bg-emerald-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                  title={tab.label}
                >
                  <Icon name={tab.icon} size={14} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === "overview" && (
          <OverviewTab
            summary={summary}
            statusData={statusData}
            difficultyData={difficultyData}
            recentGenerations={recentGenerations}
            pipelineMetrics={pipelineMetrics}
            translationLanguages={translationLanguages}
          />
        )}

        {activeTab === "disciplines" && (
          <DisciplinesTab
            disciplineData={disciplineData}
            allQuestions={filteredQuestions}
            disciplines={DISCIPLINES}
          />
        )}

        {activeTab === "quality" && (
          <QualityTab
            qualityDistribution={qualityDistribution}
            tokenStats={tokenStats}
            summary={summary}
          />
        )}
      </div>
    </div>
  );
};

export default AnalyticsView;
