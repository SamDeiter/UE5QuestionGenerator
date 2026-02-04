/**
 * Shared Chart Components
 * Common styling, wrappers, and utilities for analytics charts
 */
import { Activity, BarChart2, PieChart, TrendingUp } from "lucide-react";

/**
 * Metric Card - Displays a single metric with icon
 */
export const MetricCard = ({ title, value, icon, color }) => {
  const colors = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  return (
    <div
      className={`p-4 rounded-xl border ${colors[color]} flex items-center justify-between`}
    >
      <div>
        <p className="text-xs font-medium opacity-80 uppercase tracking-wider">
          {title}
        </p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
      <div className="p-3 rounded-lg bg-slate-900/50">{icon}</div>
    </div>
  );
};

/**
 * Chart Container - Standard wrapper for charts
 */
export const ChartContainer = ({
  title,
  icon,
  children,
  className = "",
  colSpan = 1,
}) => {
  const colSpanClass = colSpan === 2 ? "lg:col-span-2" : "";

  return (
    <div
      className={`bg-slate-950/50 border border-slate-800 rounded-xl p-4 h-80 flex flex-col min-w-0 ${colSpanClass} ${className}`}
    >
      <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <div className="flex-1 min-h-0 w-full" style={{ minHeight: 200 }}>
        {children}
      </div>
    </div>
  );
};

/**
 * Tooltip Style - Consistent tooltip styling
 */
export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#0f172a",
    borderColor: "#334155",
  },
};

/**
 * Chart Icons - Centralized icon components
 */
export const ChartIcons = {
  Activity: <Activity size={16} />,
  BarChart: <BarChart2 size={16} />,
  PieChart: <PieChart size={16} />,
  TrendingUp: <TrendingUp size={16} />,
};

/**
 * Helper to normalize tag comparison
 */
export const normalizeTag = (t) => t.toLowerCase();

/**
 * Helper to get progress bar color class
 */
export const getProgressBarClass = (count) => {
  if (count === 0) return "bg-transparent";
  if (count < 3) return "bg-orange-500";
  return "bg-emerald-500";
};

/**
 * Pie chart colors palette
 */
export const PIE_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#6366f1",
  "#a855f7",
  "#ec4899",
];

/**
 * Rejection reason label mappings
 */
export const REJECTION_REASON_LABELS = {
  too_easy: "Too Easy",
  too_hard: "Too Difficult",
  incorrect: "Incorrect",
  unclear: "Unclear",
  duplicate: "Duplicate",
  poor_quality: "Poor Quality",
  bad_source: "Bad Source",
  other: "Other",
};
