import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import SafeResponsiveContainer from "./SafeResponsiveContainer";

const COLORS = [
  "#F472B6", // Pink 400
  "#A78BFA", // Violet 400
  "#60A5FA", // Blue 400
  "#34D399", // Emerald 400
  "#FBBF24", // Amber 400
  "#F87171", // Red 400
  "#22D3EE", // Cyan 400
  "#E879F9", // Fuchsia 400
];

const DistributionCharts = ({ questions }) => {
  // Normalize difficulty to base level (Easy/Medium/Hard)
  const normalizeDifficulty = (d) => {
    if (!d) return null;
    const lower = d.toString().toLowerCase().trim();
    if (
      lower === "easy" ||
      lower === "beginner" ||
      lower.includes("beginner") ||
      lower.includes("easy")
    )
      return "Easy";
    if (
      lower === "medium" ||
      lower === "intermediate" ||
      lower.includes("intermediate") ||
      lower.includes("medium")
    )
      return "Medium";
    if (
      lower === "hard" ||
      lower === "expert" ||
      lower.includes("expert") ||
      lower.includes("hard")
    )
      return "Hard";
    return null;
  };

  // Process data for Difficulty Pie Chart - count by normalized difficulty
  const difficultyCounts = { Easy: 0, Medium: 0, Hard: 0 };
  questions.forEach((q) => {
    const normalized = normalizeDifficulty(q.difficulty);
    if (normalized) {
      difficultyCounts[normalized]++;
    }
  });

  const difficultyData = Object.entries(difficultyCounts)
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0);

  // Process data for Discipline Bar Chart
  const disciplineCounts = questions.reduce((acc, q) => {
    acc[q.discipline] = (acc[q.discipline] || 0) + 1;
    return acc;
  }, {});

  const disciplineData = Object.entries(disciplineCounts)
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Difficulty Distribution */}
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
        <h3 className="text-sm font-bold text-slate-300 mb-4 text-center">
          Difficulty Distribution
        </h3>
        <div className="h-64">
          <SafeResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
          >
            <PieChart>
              <Pie
                data={difficultyData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {difficultyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderColor: "#334155",
                  color: "#f1f5f9",
                }}
                itemStyle={{ color: "#f1f5f9" }}
              />
            </PieChart>
          </SafeResponsiveContainer>
        </div>
      </div>

      {/* Discipline Distribution */}
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
        <h3 className="text-sm font-bold text-slate-300 mb-4 text-center">
          Questions by Discipline
        </h3>
        <div className="h-64">
          <SafeResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
          >
            <BarChart
              data={disciplineData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                horizontal={false}
              />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#94a3b8"
                width={100}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                cursor={{ fill: "#334155", opacity: 0.4 }}
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderColor: "#334155",
                  color: "#f1f5f9",
                }}
              />
              <Bar cursor="default" dataKey="value" radius={[0, 4, 4, 0]}>
                {disciplineData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </SafeResponsiveContainer>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
        <h3 className="text-sm font-bold text-slate-300 mb-4 text-center">
          AI Score Distribution
        </h3>
        <div className="h-64">
          {(() => {
            const scoreBuckets = {
              "90-100": 0,
              "80-89": 0,
              "70-79": 0,
              "60-69": 0,
              "Under 60": 0,
              "No Score": 0,
            };
            questions.forEach((q) => {
              const score = q.critiqueScore;
              if (!score && score !== 0) scoreBuckets["No Score"]++;
              else if (score >= 90) scoreBuckets["90-100"]++;
              else if (score >= 80) scoreBuckets["80-89"]++;
              else if (score >= 70) scoreBuckets["70-79"]++;
              else if (score >= 60) scoreBuckets["60-69"]++;
              else scoreBuckets["Under 60"]++;
            });
            const scoreData = Object.entries(scoreBuckets)
              .map(([name, value]) => ({ name, value }))
              .filter((item) => item.value > 0);
            const scoreColors = [
              "#22C55E",
              "#84CC16",
              "#EAB308",
              "#F97316",
              "#EF4444",
              "#6B7280",
            ];
            return (
              <SafeResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
              >
                <BarChart
                  data={scoreData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderColor: "#334155",
                      color: "#f1f5f9",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {scoreData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={scoreColors[index % scoreColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </SafeResponsiveContainer>
            );
          })()}
        </div>
      </div>

      {/* Verification Progress */}
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
        <h3 className="text-sm font-bold text-slate-300 mb-4 text-center">
          Verification Progress
        </h3>
        <div className="h-64">
          {(() => {
            const verified = questions.filter(
              (q) => q.humanVerified === true
            ).length;
            const unverified = questions.length - verified;
            const verifyData = [
              { name: "Verified", value: verified },
              { name: "Unverified", value: unverified },
            ].filter((item) => item.value > 0);
            const verifyColors = ["#22C55E", "#6B7280"];
            return (
              <SafeResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
              >
                <PieChart>
                  <Pie
                    data={verifyData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {verifyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={verifyColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderColor: "#334155",
                      color: "#f1f5f9",
                    }}
                  />
                </PieChart>
              </SafeResponsiveContainer>
            );
          })()}
        </div>
      </div>

      {/* Low Score Alert */}
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
        <h3 className="text-sm font-bold text-slate-300 mb-4 text-center">
          Low Score Alert (&lt;70)
        </h3>
        <div className="h-64 flex flex-col items-center justify-center">
          {(() => {
            const lowScore = questions.filter(
              (q) => q.critiqueScore && q.critiqueScore < 70
            ).length;
            const noScore = questions.filter(
              (q) => !q.critiqueScore && q.critiqueScore !== 0
            ).length;
            return (
              <>
                <div
                  className={`text-6xl font-bold ${
                    lowScore > 0 ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {lowScore}
                </div>
                <div className="text-sm text-slate-400 mt-2">
                  Questions need review
                </div>
                {noScore > 0 && (
                  <div className="text-xs text-amber-400 mt-4">
                    ⚠️ {noScore} questions have no AI score
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Reviewer Activity */}
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 md:col-span-2">
        <h3 className="text-sm font-bold text-slate-300 mb-4 text-center">
          Reviewer Activity
        </h3>
        <div className="h-64">
          {(() => {
            const reviewerCounts = questions.reduce((acc, q) => {
              const reviewer =
                q.humanVerifiedBy || q.acceptedBy || q.reviewerName;
              if (reviewer && reviewer !== "Unknown") {
                acc[reviewer] = (acc[reviewer] || 0) + 1;
              }
              return acc;
            }, {});
            const reviewerData = Object.entries(reviewerCounts)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value);
            if (reviewerData.length === 0) {
              return (
                <div className="h-full flex items-center justify-center text-slate-500">
                  No reviewer data yet
                </div>
              );
            }
            return (
              <SafeResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
              >
                <BarChart
                  data={reviewerData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    horizontal={false}
                  />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#94a3b8"
                    width={80}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderColor: "#334155",
                      color: "#f1f5f9",
                    }}
                  />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </SafeResponsiveContainer>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default DistributionCharts;
