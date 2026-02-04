/**
 * AcceptanceRateChart
 * Acceptance rate by discipline bar chart
 */
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import SafeResponsiveContainer from "../analytics/SafeResponsiveContainer";
import {
  ChartContainer,
  ChartIcons,
  TOOLTIP_STYLE,
} from "./SharedChartComponents";

const AcceptanceRateChart = ({ questions }) => {
  // Calculate acceptance rate by discipline
  const disciplineStats = questions.reduce((acc, q) => {
    if (!acc[q.discipline]) {
      acc[q.discipline] = { total: 0, accepted: 0 };
    }
    acc[q.discipline].total++;
    if (q.status === "accepted") {
      acc[q.discipline].accepted++;
    }
    return acc;
  }, {});

  const chartData = Object.entries(disciplineStats).map(([name, stats]) => ({
    name,
    rate: Math.round((stats.accepted / stats.total) * 100) || 0,
    total: stats.total,
  }));

  return (
    <ChartContainer
      title="Acceptance Rate by Discipline"
      icon={ChartIcons.PieChart}
      colSpan={2}
    >
      <SafeResponsiveContainer
        width="100%"
        height="100%"
        minWidth={1}
        minHeight={200}
      >
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="name" stroke="#475569" fontSize={10} />
          <YAxis stroke="#475569" fontSize={10} unit="%" />
          <Tooltip cursor={{ fill: "#1e293b" }} {...TOOLTIP_STYLE} />
          <Bar
            cursor="default"
            activeBar={false}
            dataKey="rate"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
            name="Acceptance Rate"
          />
        </BarChart>
      </SafeResponsiveContainer>
    </ChartContainer>
  );
};

export default AcceptanceRateChart;
