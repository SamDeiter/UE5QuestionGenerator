import {
  LineChart,
  AreaChart,
  BarChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import SafeResponsiveContainer from "./SafeResponsiveContainer";

// Define gradient configuration outside component to avoid minification issues
const GRADIENT_CONFIG = {
  id: "colorTokens",
  x1: "0",
  y1: "0",
  x2: "0",
  y2: "1",
};

const TrendCharts = ({ generations, questions = [] }) => {
  // Process generation data for token/cost charts
  const sortedGenerations = [...generations].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  const generationData = sortedGenerations.map((gen, index) => ({
    name: `Batch ${index + 1}`,
    date: new Date(gen.timestamp).toLocaleDateString(),
    quality: gen.averageQuality || 0,
    cost: (gen.estimatedCost || 0) * 100,
    tokens: (gen.tokensUsed?.input || 0) + (gen.tokensUsed?.output || 0),
  }));

  // Process questions data for Questions Over Time chart
  const questionsOverTime = (() => {
    if (!questions || questions.length === 0) return [];

    // Group questions by date (using createdAt, acceptedAt, or fallback to current date)
    const dateGroups = {};
    questions.forEach((q) => {
      let dateStr;
      if (q.acceptedAt) {
        dateStr = new Date(q.acceptedAt).toLocaleDateString();
      } else if (q.createdAt) {
        dateStr = new Date(q.createdAt).toLocaleDateString();
      } else {
        return; // Skip if no date
      }

      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = { count: 0, totalScore: 0, scoredCount: 0 };
      }
      dateGroups[dateStr].count++;
      if (q.critiqueScore) {
        dateGroups[dateStr].totalScore += q.critiqueScore;
        dateGroups[dateStr].scoredCount++;
      }
    });

    // Convert to array and sort by date
    return Object.entries(dateGroups)
      .map(([date, data]) => ({
        date,
        count: data.count,
        avgScore:
          data.scoredCount > 0
            ? Math.round(data.totalScore / data.scoredCount)
            : null,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-14); // Last 14 days with data
  })();

  // If no data at all, show a message
  if (generationData.length === 0 && questionsOverTime.length === 0) {
    return (
      <div className="text-center p-8 text-slate-500">
        Not enough data to show trends. Generate some questions first!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Questions Accepted Over Time */}
      {questionsOverTime.length > 0 && (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <h3 className="text-sm font-bold text-slate-300 mb-4 text-center">
            Questions Accepted Over Time
          </h3>
          <div className="h-64">
            <SafeResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
            >
              <BarChart
                data={questionsOverTime}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#e2e8f0" tick={{ fontSize: 9 }} />
                <YAxis stroke="#e2e8f0" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    color: "#f1f5f9",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend />
                <Bar
                  dataKey="count"
                  fill="#60A5FA"
                  name="Questions Accepted"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </SafeResponsiveContainer>
          </div>
        </div>
      )}

      {/* Average Score Over Time */}
      {questionsOverTime.filter((d) => d.avgScore).length > 0 && (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <h3 className="text-sm font-bold text-slate-300 mb-4 text-center">
            Average AI Score Over Time
          </h3>
          <div className="h-64">
            <SafeResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
            >
              <LineChart
                data={questionsOverTime.filter((d) => d.avgScore)}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#e2e8f0" tick={{ fontSize: 9 }} />
                <YAxis stroke="#e2e8f0" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    color: "#f1f5f9",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                  name="Avg AI Score"
                />
              </LineChart>
            </SafeResponsiveContainer>
          </div>
        </div>
      )}

      {/* Token Usage (only if generation data exists) */}
      {generationData.length > 0 && (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <h3 className="text-sm font-bold text-slate-300 mb-4 text-center">
            Token Usage & Cost Trend
          </h3>
          <div className="h-64">
            <SafeResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
            >
              <AreaChart
                data={generationData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id={GRADIENT_CONFIG.id}
                    x1={GRADIENT_CONFIG.x1}
                    y1={GRADIENT_CONFIG.y1}
                    x2={GRADIENT_CONFIG.x2}
                    y2={GRADIENT_CONFIG.y2}
                  >
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  stroke="#e2e8f0"
                  tick={{ fontSize: 10 }}
                />
                <YAxis stroke="#e2e8f0" />
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    color: "#f1f5f9",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="#82ca9d"
                  fillOpacity={1}
                  fill="url(#colorTokens)"
                  name="Total Tokens"
                />
              </AreaChart>
            </SafeResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-2">
            * Cost is correlated with token usage.
          </p>
        </div>
      )}
    </div>
  );
};

export default TrendCharts;
