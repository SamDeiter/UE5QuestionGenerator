import { useMemo, useState } from "react";
import Icon from "../Icon";

/**
 * TagCloudAnalytics - Displays tag frequency as a word cloud visualization
 * Shows how often different tags appear across questions
 *
 * IMPORTANT: All callback parameters use FULL names (question, tag, data)
 * Never use abbreviations like q, t, d in this component!
 */
const TagCloudAnalytics = ({
  questions,
  selectedDiscipline,
  showAllDisciplines,
}) => {
  const [hoveredTag, setHoveredTag] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);

  // Calculate tag statistics from questions
  const tagStats = useMemo(() => {
    const stats = {};

    // Filter questions by discipline if selected
    const filteredQuestions =
      selectedDiscipline && !showAllDisciplines
        ? questions.filter(
            (question) => question.discipline === selectedDiscipline
          )
        : questions;

    // Helper to normalize tag text
    const normalizeTag = (tagText) => {
      if (!tagText || typeof tagText !== "string") return "";
      return tagText
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "");
    };

    // Count tag occurrences
    filteredQuestions.forEach((question) => {
      if (!question.tags || !Array.isArray(question.tags)) return;

      const normalizedTags = question.tags
        .map((tag) => normalizeTag(tag))
        .filter(Boolean);

      normalizedTags.forEach((tag) => {
        if (!stats[tag]) {
          stats[tag] = { count: 0, disciplines: new Set(), questionIds: [] };
        }
        stats[tag].count++;
        stats[tag].disciplines.add(question.discipline);
        stats[tag].questionIds.push(question.id || question.uniqueId);
      });
    });

    return stats;
  }, [questions, selectedDiscipline, showAllDisciplines]);

  // Convert to array and sort by count
  const sortedTags = useMemo(() => {
    return Object.entries(tagStats)
      .map(([tagName, data]) => ({
        name: tagName,
        count: data.count,
        disciplines: Array.from(data.disciplines),
        questionIds: data.questionIds,
      }))
      .filter((tagItem) => tagItem.count >= 2) // Only show tags used 2+ times
      .sort((a, b) => b.count - a.count)
      .slice(0, 50); // Top 50 tags
  }, [tagStats]);

  // Calculate font size based on frequency
  const getTagSize = (count) => {
    const maxCount = sortedTags[0]?.count || 1;
    const minSize = 12;
    const maxSize = 32;
    const normalized = count / maxCount;
    return minSize + normalized * (maxSize - minSize);
  };

  // Get color based on tag frequency - using brighter, more vibrant colors for better readability
  const getTagColor = (count) => {
    const maxCount = sortedTags[0]?.count || 1;
    const ratio = count / maxCount;
    if (ratio > 0.7) return "text-amber-300"; // Bright yellow/gold for most used
    if (ratio > 0.4) return "text-emerald-300"; // Bright green
    if (ratio > 0.2) return "text-sky-300"; // Bright light blue
    return "text-fuchsia-300"; // Bright pink for least used
  };

  if (sortedTags.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        <Icon name="tag" size={32} className="mx-auto mb-2 opacity-50" />
        <p>No tags found in questions</p>
        <p className="text-sm mt-1">
          Tags will appear here when questions have tags assigned
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Tag Cloud */}
      <div className="flex flex-wrap gap-2 justify-center">
        {sortedTags.map((tagItem) => (
          <button
            key={tagItem.name}
            onClick={() =>
              setSelectedTag(selectedTag === tagItem.name ? null : tagItem.name)
            }
            onMouseEnter={() => setHoveredTag(tagItem.name)}
            onMouseLeave={() => setHoveredTag(null)}
            className={`
              px-2 py-1 rounded transition-all duration-200
              ${getTagColor(tagItem.count)}
              ${
                selectedTag === tagItem.name
                  ? "bg-blue-900/50 ring-1 ring-blue-500"
                  : "hover:bg-slate-700/50"
              }
            `}
            style={{ fontSize: `${getTagSize(tagItem.count)}px` }}
            title={`${tagItem.name}: ${tagItem.count} questions`}
          >
            {tagItem.name}
          </button>
        ))}
      </div>

      {/* Hover/Selected Info */}
      {(hoveredTag || selectedTag) && (
        <div className="mt-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
          {(() => {
            const currentTag = selectedTag || hoveredTag;
            const tagData = sortedTags.find(
              (tagItem) => tagItem.name === currentTag
            );
            if (!tagData) return null;
            return (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="tag" size={16} className="text-blue-400" />
                  <span className="font-semibold text-white capitalize">
                    {tagData.name}
                  </span>
                  <span className="text-slate-400 text-sm">
                    ({tagData.count} questions)
                  </span>
                </div>
                <div className="text-sm text-slate-400">
                  <span>Disciplines: </span>
                  {tagData.disciplines.map((discipline, index) => (
                    <span key={discipline}>
                      {discipline}
                      {index < tagData.disciplines.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-4 text-xs text-slate-500">
        <span>
          <span className="text-amber-300">●</span> Most frequent
        </span>
        <span>
          <span className="text-emerald-300">●</span> Frequent
        </span>
        <span>
          <span className="text-sky-300">●</span> Moderate
        </span>
        <span>
          <span className="text-fuchsia-300">●</span> Rare
        </span>
      </div>
    </div>
  );
};

export default TagCloudAnalytics;
