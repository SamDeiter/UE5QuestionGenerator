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
    </div>
  );
};

export default DistributionCharts;
