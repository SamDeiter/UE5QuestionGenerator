/**
 * QualityDistributionChart
 * Quality score distribution bar chart
 */
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import SafeResponsiveContainer from "../analytics/SafeResponsiveContainer";
import {
  ChartContainer,
  ChartIcons,
  TOOLTIP_STYLE,
} from "./SharedChartComponents";
import { QUALITY_THRESHOLDS } from "../../utils/constants";

const QualityDistributionChart = ({ questions }) => {
  const distributionData = [
    {
      range: "90-100",
      count: questions.filter(
        (q) => q.qualityScore >= QUALITY_THRESHOLDS.EXCELLENT
      ).length,
    },
    {
      range: "70-89",
      count: questions.filter(
        (q) =>
          q.qualityScore >= QUALITY_THRESHOLDS.PASS &&
          q.qualityScore < QUALITY_THRESHOLDS.EXCELLENT
      ).length,
    },
    {
      range: "50-69",
      count: questions.filter(
        (q) =>
          q.qualityScore >= QUALITY_THRESHOLDS.MEDIOCRE &&
          q.qualityScore < QUALITY_THRESHOLDS.PASS
      ).length,
    },
    {
      range: "< 50",
      count: questions.filter(
        (q) =>
          q.qualityScore < QUALITY_THRESHOLDS.MEDIOCRE && q.qualityScore != null
      ).length,
    },
  ];

  return (
    <ChartContainer
      title="Quality Score Distribution"
      icon={ChartIcons.BarChart}
    >
      <SafeResponsiveContainer
        width="100%"
        height="100%"
        minWidth={1}
        minHeight={200}
      >
        <BarChart data={distributionData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="range" stroke="#475569" fontSize={10} />
          <YAxis stroke="#475569" fontSize={10} />
          <Tooltip cursor={{ fill: "#1e293b" }} {...TOOLTIP_STYLE} />
          <Bar
            cursor="default"
            activeBar={false}
            dataKey="count"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </SafeResponsiveContainer>
    </ChartContainer>
  );
};

export default QualityDistributionChart;
