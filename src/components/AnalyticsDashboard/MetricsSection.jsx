/**
 * MetricsSection
 * Key metrics cards at the top of the dashboard
 */
import { Activity, TrendingUp, PieChart, BarChart2 } from "lucide-react";
import { MetricCard } from "./SharedChartComponents";

const MetricsSection = ({ analyticsData }) => {
  const totalGenerations = analyticsData.summary?.totalGenerations || 1;
  const successfulGenerations = analyticsData.generations.filter(
    (g) => g.success
  ).length;
  const successRate = Math.round(
    (successfulGenerations / totalGenerations) * 100
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Total Questions"
        value={analyticsData.summary?.totalQuestions || 0}
        icon={<Activity size={18} />}
        color="blue"
      />
      <MetricCard
        title="Success Rate"
        value={`${successRate}%`}
        icon={<TrendingUp size={18} />}
        color="green"
      />
      <MetricCard
        title="Est. Cost"
        value={`$${(analyticsData.summary?.estimatedCost || 0).toFixed(6)}`}
        icon={<PieChart size={18} />}
        color="orange"
      />
      <MetricCard
        title="Avg Quality"
        value={`${analyticsData.summary?.averageQuality || 0}/100`}
        icon={<BarChart2 size={18} />}
        color="purple"
      />
    </div>
  );
};

export default MetricsSection;
