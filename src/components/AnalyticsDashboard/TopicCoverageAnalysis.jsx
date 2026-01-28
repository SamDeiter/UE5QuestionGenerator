/**
 * TopicCoverageAnalysis
 * Topic coverage breakdown by discipline
 */
import { TrendingUp } from "lucide-react";
import { TAGS_BY_DISCIPLINE } from "../../utils/tagTaxonomy";
import { normalizeTag, getProgressBarClass } from "./SharedChartComponents";

// Goal: questions per tag for full coverage
const QUESTIONS_PER_TAG_GOAL = 5;

const DisciplineCoverageCard = ({ discipline, questions, tags }) => {
  // Calculate coverage for this discipline
  const disciplineQuestions = questions.filter(
    (q) => q.discipline === discipline
  );

  const coverageStats = tags
    .map((tag) => {
      const count = disciplineQuestions.filter((q) =>
        (q.tags || []).some((qt) => normalizeTag(qt) === normalizeTag(tag))
      ).length;
      return { tag, count };
    })
    .sort((a, b) => b.count - a.count);

  return (
    <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
      <h4 className="text-xs font-bold text-slate-300 uppercase mb-3 border-b border-slate-800 pb-2">
        {discipline}{" "}
        <span className="text-slate-500">({disciplineQuestions.length})</span>
      </h4>
      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
        {coverageStats.map(({ tag, count }) => {
          const coveragePercent = Math.min(
            (count / QUESTIONS_PER_TAG_GOAL) * 100,
            100
          );
          return (
            <div key={tag} className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px]">
                <span
                  className={count === 0 ? "text-slate-500" : "text-slate-300"}
                >
                  {tag}
                </span>
                <span
                  className={
                    count === 0
                      ? "text-red-400 font-bold"
                      : "text-emerald-400 font-mono"
                  }
                >
                  {count}
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressBarClass(count)}`}
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TopicCoverageAnalysis = ({ questions }) => {
  return (
    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 min-w-0">
      <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
        <TrendingUp size={16} /> Topic Coverage Analysis
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(TAGS_BY_DISCIPLINE).map(([discipline, tags]) => (
          <DisciplineCoverageCard
            key={discipline}
            discipline={discipline}
            questions={questions}
            tags={tags}
          />
        ))}
      </div>
    </div>
  );
};

export default TopicCoverageAnalysis;
