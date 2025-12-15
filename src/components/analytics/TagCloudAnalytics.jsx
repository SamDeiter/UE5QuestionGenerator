import React, { useMemo, useState } from "react";
import Icon from "../Icon";
import { TAGS_BY_DISCIPLINE, normalizeTag } from "../../utils/tagTaxonomy";

/**
 * TagCloudAnalytics - Interactive tag cloud with co-occurrence visualization
 * Shows tag frequency and interconnections between tags
 */
const TagCloudAnalytics = ({ questions = [], selectedDiscipline = null }) => {
  const [selectedTag, setSelectedTag] = useState(null);
  const [showAllDisciplines, setShowAllDisciplines] = useState(
    !selectedDiscipline
  );

  // Calculate tag statistics
  const tagStats = useMemo(() => {
    const stats = {};
    const coOccurrence = {};

    // Filter questions by discipline if selected
    const filteredQuestions =
      selectedDiscipline && !showAllDisciplines
        ? questions.filter((q) => q.discipline === selectedDiscipline)
        : questions;

    filteredQuestions.forEach((q) => {
      if (!q.tags || !Array.isArray(q.tags)) return;

      const normalizedTags = q.tags.map((t) => normalizeTag(t));

      // Count tag frequency
      normalizedTags.forEach((tag) => {
        if (!stats[tag]) {
          stats[tag] = { count: 0, disciplines: new Set(), questionIds: [] };
        }
        stats[tag].count++;
        stats[tag].disciplines.add(q.discipline);
        stats[tag].questionIds.push(q.id || q.uniqueId);
      });

      // Build co-occurrence matrix
      for (let i = 0; i < normalizedTags.length; i++) {
        for (let j = i + 1; j < normalizedTags.length; j++) {
          const tag1 = normalizedTags[i];
          const tag2 = normalizedTags[j];
          const key = [tag1, tag2].sort().join("::");

          if (!coOccurrence[key]) {
            coOccurrence[key] = { tags: [tag1, tag2], count: 0 };
          }
          coOccurrence[key].count++;
        }
      }
    });

    return { stats, coOccurrence };
  }, [questions, selectedDiscipline, showAllDisciplines]);

  // Get sorted tags by frequency
  const sortedTags = useMemo(() => {
    return Object.entries(tagStats.stats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 50); // Top 50 tags
  }, [tagStats.stats]);

  // Get connections for selected tag
  const connections = useMemo(() => {
    if (!selectedTag) return [];

    return Object.values(tagStats.coOccurrence)
      .filter((co) => co.tags.includes(selectedTag))
      .map((co) => ({
        tag: co.tags.find((t) => t !== selectedTag),
        count: co.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [selectedTag, tagStats.coOccurrence]);

  // Calculate tag sizes based on frequency
  const maxCount = sortedTags[0]?.[1]?.count || 1;
  const minSize = 11;
  const maxSize = 22;

  const getTagSize = (count) => {
    const ratio = count / maxCount;
    return minSize + (maxSize - minSize) * Math.sqrt(ratio);
  };

  // Get discipline color for tag
  const getDisciplineColor = (tag) => {
    for (const [discipline, tags] of Object.entries(TAGS_BY_DISCIPLINE)) {
      if (tags.includes(tag)) {
        const colors = {
          "Technical Art": "#f97316",
          "Lighting & Rendering": "#eab308",
          "Look Development (Materials)": "#a855f7",
          "Animation & Rigging": "#ec4899",
          "VFX (Niagara)": "#06b6d4",
          "World Building & Level Design": "#22c55e",
          Blueprints: "#3b82f6",
          "Game Logic & Systems": "#6366f1",
          "C++ Programming": "#ef4444",
          Networking: "#14b8a6",
        };
        return colors[discipline] || "#64748b";
      }
    }
    return "#64748b";
  };

  if (sortedTags.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="tags" size={16} className="text-purple-400" />
          <span className="text-sm font-bold text-slate-300">
            Tag Analytics
          </span>
        </div>
        <p className="text-xs text-slate-500 text-center py-4">
          No tagged questions yet. Tags will appear here as questions are
          generated.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name="tags" size={16} className="text-purple-400" />
          <span className="text-sm font-bold text-slate-300">
            Tag Analytics
          </span>
          <span className="text-[10px] text-slate-500">
            ({sortedTags.length} tags)
          </span>
        </div>
        {selectedDiscipline && (
          <button
            onClick={() => setShowAllDisciplines(!showAllDisciplines)}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${
              showAllDisciplines
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            {showAllDisciplines ? "All Disciplines" : selectedDiscipline}
          </button>
        )}
      </div>

      {/* Tag Cloud */}
      <div className="flex flex-wrap gap-1.5 mb-3 max-h-40 overflow-y-auto custom-scrollbar">
        {sortedTags.map(([tag, data]) => {
          const isSelected = selectedTag === tag;
          const isConnected = connections.some((c) => c.tag === tag);
          const size = getTagSize(data.count);
          const color = getDisciplineColor(tag);

          return (
            <button
              key={tag}
              onClick={() => setSelectedTag(isSelected ? null : tag)}
              className={`px-2 py-0.5 rounded-full transition-all ${
                isSelected
                  ? "ring-2 ring-white/50 scale-110"
                  : isConnected && selectedTag
                  ? "ring-1 ring-purple-400/50"
                  : "hover:scale-105"
              }`}
              style={{
                fontSize: `${size}px`,
                backgroundColor: `${color}20`,
                color: color,
                borderColor: `${color}40`,
                borderWidth: "1px",
                opacity: selectedTag && !isSelected && !isConnected ? 0.4 : 1,
              }}
              title={`${tag}: ${data.count} question${
                data.count !== 1 ? "s" : ""
              }`}
            >
              {tag.replace("#", "")}
              <span className="ml-1 opacity-60 text-[9px]">{data.count}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Tag Details */}
      {selectedTag && (
        <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-bold"
                style={{ color: getDisciplineColor(selectedTag) }}
              >
                {selectedTag}
              </span>
              <span className="text-xs text-slate-500">
                {tagStats.stats[selectedTag]?.count} questions
              </span>
            </div>
            <button
              onClick={() => setSelectedTag(null)}
              className="p-1 hover:bg-slate-800 rounded"
            >
              <Icon name="x" size={12} className="text-slate-500" />
            </button>
          </div>

          {connections.length > 0 ? (
            <div>
              <p className="text-[10px] text-slate-500 mb-2">
                <Icon name="git-branch" size={10} className="inline mr-1" />
                Frequently appears with:
              </p>
              <div className="flex flex-wrap gap-1">
                {connections.map((conn) => (
                  <button
                    key={conn.tag}
                    onClick={() => setSelectedTag(conn.tag)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
                  >
                    {conn.tag.replace("#", "")}
                    <span className="ml-1 opacity-60">({conn.count})</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-slate-500">
              No co-occurring tags found
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-slate-800">
        <p className="text-[9px] text-slate-600 mb-1">
          Tag colors by discipline:
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(TAGS_BY_DISCIPLINE)
            .slice(0, 5)
            .map(([discipline]) => {
              const colors = {
                "Technical Art": "#f97316",
                "Lighting & Rendering": "#eab308",
                "Look Development (Materials)": "#a855f7",
                "Animation & Rigging": "#ec4899",
                "VFX (Niagara)": "#06b6d4",
              };
              return (
                <div key={discipline} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: colors[discipline] }}
                  />
                  <span className="text-[8px] text-slate-500">
                    {discipline.split(" ")[0]}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default TagCloudAnalytics;
