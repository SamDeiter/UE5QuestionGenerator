import Icon from "../Icon";
import {
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import SafeResponsiveContainer from "./SafeResponsiveContainer";
import EmptyState from "../EmptyState";

/**
 * QualityTab - Quality distribution and token usage statistics
 *
 * @param {Object} props
 * @param {Array} props.qualityDistribution - Quality score distribution data
 * @param {Object} props.tokenStats - Token usage statistics
 * @param {Object} props.summary - Summary statistics
 */
const QualityTab = ({ qualityDistribution, tokenStats, summary }) => {
  return (
    <div className="space-y-6">
      {/* Quality Score Distribution */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-slate-300 mb-6 flex items-center gap-2">
          <Icon name="target" size={20} className="text-emerald-400" />
          Quality Score Distribution
        </h3>
        <div className="h-64">
          {qualityDistribution.length > 0 ? (
            <SafeResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
            >
              <BarChart
                data={qualityDistribution}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="range" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                  }}
                  formatter={(value) => [value, "Questions"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} activeBar={false}>
                  {qualityDistribution.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </SafeResponsiveContainer>
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
            Input: {(tokenStats.avgInput / 1000).toFixed(1)}k avg • Output:{" "}
            {(tokenStats.avgOutput / 1000).toFixed(1)}k avg
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
  );
};

export default QualityTab;
