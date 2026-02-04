/**
 * TokenUsageChart
 * Token usage history area chart
 */
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import SafeResponsiveContainer from "../analytics/SafeResponsiveContainer";
import { format } from "date-fns";
import {
  ChartContainer,
  ChartIcons,
  TOOLTIP_STYLE,
} from "./SharedChartComponents";

const TokenUsageChart = ({ generations }) => {
  return (
    <ChartContainer title="Token Usage History" icon={ChartIcons.Activity}>
      <SafeResponsiveContainer
        width="100%"
        height="100%"
        minWidth={1}
        minHeight={200}
      >
        <AreaChart data={generations.slice(-20)}>
          <defs>
            <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(t) => format(new Date(t), "MM/dd")}
            stroke="#475569"
            fontSize={10}
          />
          <YAxis stroke="#475569" fontSize={10} />
          <Tooltip
            {...TOOLTIP_STYLE}
            labelFormatter={(t) => format(new Date(t), "PP pp")}
          />
          <Area
            type="monotone"
            dataKey="tokensUsed.input"
            stackId="1"
            stroke="#818cf8"
            fill="url(#colorTokens)"
            name="Input Tokens"
          />
          <Area
            type="monotone"
            dataKey="tokensUsed.output"
            stackId="1"
            stroke="#34d399"
            fill="#34d399"
            name="Output Tokens"
          />
        </AreaChart>
      </SafeResponsiveContainer>
    </ChartContainer>
  );
};

export default TokenUsageChart;
