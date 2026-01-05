import { useState } from "react";
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
import DisciplineDetailPanel from "./DisciplineDetailPanel";
import TagCloudAnalytics from "./TagCloudAnalytics";
import TagConnectionGraph from "./TagConnectionGraph";

// Color palette for disciplines
const DISCIPLINE_COLORS = {
  // Full names
  "Technical Art": "#f97316",
  "Lighting & Rendering": "#eab308",
  "Look Development (Materials)": "#facc15",
  "Animation & Rigging": "#a855f7",
  "VFX (Niagara)": "#22d3ee",
  "World Building & Level Design": "#6366f1",
  Blueprints: "#8b5cf6",
  "Game Logic & Systems": "#ec4899",
  "C++ Programming": "#dc2626",
  Networking: "#8b5cf6",
  // Abbreviated names
  "Tech Art": "#f97316",
  "Look Dev": "#facc15",
  Animation: "#a855f7",
  VFX: "#22d3ee",
  Worldbuilding: "#6366f1",
  "Game Dev": "#ec4899",
  Programming: "#dc2626",
};

/**
 * DisciplinesTab - Discipline breakdown, tag cloud, and tag connections
 *
 * @param {Object} props
 * @param {Array} props.disciplineData - Discipline distribution data for chart
 * @param {Array} props.allQuestions - All questions array for filtering
 * @param {Array} props.disciplines - List of all discipline names
 */
const DisciplinesTab = ({ disciplineData, allQuestions, disciplines }) => {
  const [selectedDiscipline, setSelectedDiscipline] = useState(null);

  return (
    <div className="space-y-6">
      {/* Large Discipline Bar Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-slate-300 mb-6 flex items-center gap-2">
          <Icon name="layers" size={20} className="text-purple-400" />
          Questions by Discipline
        </h3>
        <div className="h-96">
          {disciplineData.length > 0 ? (
            <SafeResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
            >
              <BarChart
                data={disciplineData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  horizontal={false}
                />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="fullName"
                  stroke="#94a3b8"
                  width={110}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                  }}
                  formatter={(value) => [value, "Questions"]}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  fill="none"
                  isAnimationActive={false}
                  activeBar={false}
                  cursor="default"
                >
                  {disciplineData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </SafeResponsiveContainer>
          ) : (
            <EmptyState message="No discipline data yet. Generate some questions!" />
          )}
        </div>
      </div>

      {/* Tag Cloud Analytics */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-slate-300 mb-6 flex items-center gap-2">
          <Icon name="tag" size={20} className="text-cyan-400" />
          Tag Cloud
        </h3>
        <TagCloudAnalytics
          questions={allQuestions}
          selectedDiscipline={selectedDiscipline}
          showAllDisciplines={!selectedDiscipline}
        />
      </div>

      {/* Tag Connection Graph */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-slate-300 mb-6 flex items-center gap-2">
          <Icon name="git-branch" size={20} className="text-emerald-400" />
          Tag Connections (Top 20)
        </h3>
        <TagConnectionGraph
          questions={allQuestions}
          selectedDiscipline={selectedDiscipline}
          showAllDisciplines={!selectedDiscipline}
        />
      </div>

      {/* Discipline Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {disciplines.map((disc) => {
          const count = allQuestions.filter(
            (q) => q.discipline === disc
          ).length;
          const color = DISCIPLINE_COLORS[disc] || "#64748b";
          const isSelected = selectedDiscipline === disc;
          return (
            <button
              key={disc}
              onClick={() => setSelectedDiscipline(isSelected ? null : disc)}
              className={`bg-slate-900 border rounded-xl p-4 transition-all text-left ${
                isSelected
                  ? "border-2 ring-2 ring-opacity-50"
                  : "border-slate-800 hover:border-slate-700"
              }`}
              style={{
                borderColor: isSelected ? color : undefined,
                "--tw-ring-color": isSelected ? color : undefined,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {isSelected && (
                  <Icon
                    name="chevron-up"
                    size={14}
                    className="text-slate-400"
                  />
                )}
              </div>
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{disc}</p>
            </button>
          );
        })}
      </div>

      {/* Selected Discipline Detail Panel */}
      {selectedDiscipline && (
        <DisciplineDetailPanel
          discipline={selectedDiscipline}
          questions={allQuestions}
          color={DISCIPLINE_COLORS[selectedDiscipline]}
          onClose={() => setSelectedDiscipline(null)}
        />
      )}
    </div>
  );
};

export default DisciplinesTab;
