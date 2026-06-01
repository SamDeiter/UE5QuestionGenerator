/**
 * RejectionReasonsChart
 * Pie chart showing rejection reasons breakdown
 */
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip } from "recharts";
import SafeResponsiveContainer from "../analytics/SafeResponsiveContainer";
import {
  ChartContainer,
  ChartIcons,
  TOOLTIP_STYLE,
  PIE_COLORS,
  REJECTION_REASON_LABELS,
} from "./SharedChartComponents";

const RejectionReasonsChart = ({ questions }) => {
  // Calculate rejection reasons
  const rejectionCounts = questions
    .filter((q) => q.status === "rejected" && q.rejectionReason)
    .reduce((acc, q) => {
      const reason = q.rejectionReason || "other";
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});

  const rejectionData = Object.entries(rejectionCounts).map(
    ([reason, count]) => ({
      name: REJECTION_REASON_LABELS[reason] || reason,
      value: count,
    })
  );

  return (
    <ChartContainer title="Rejection Reasons" icon={ChartIcons.PieChart}>
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        {rejectionData.length > 0 ? (
          <SafeResponsiveContainer
            width="100%"
            height="100%"
            minWidth={1}
            minHeight={200}
          >
            <RechartsPieChart>
              <Pie
                data={rejectionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {rejectionData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
            </RechartsPieChart>
          </SafeResponsiveContainer>
        ) : (
          <div className="text-slate-500 text-sm">No rejection data yet</div>
        )}
      </div>
    </ChartContainer>
  );
};

export default RejectionReasonsChart;
