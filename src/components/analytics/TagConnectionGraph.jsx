import { useMemo, useState, useRef, useEffect } from "react";
import Icon from "../Icon";

/**
 * TagConnectionGraph - Circular visualization showing tag co-occurrence relationships
 * Tags that appear together in questions are connected with lines
 *
 * IMPORTANT: All callback parameters use FULL names (question, tag, etc.)
 * Never use abbreviations like q, t in this component!
 */
const TagConnectionGraph = ({
  questions,
  selectedDiscipline,
  showAllDisciplines,
}) => {
  const svgRef = useRef(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 450 });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          setDimensions({ width: container.clientWidth || 500, height: 450 });
        }
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Calculate tag co-occurrences
  const { tags, connections } = useMemo(() => {
    const tagCounts = {};
    const coOccurrences = {};

    // Filter by discipline if needed
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

    // Count tags and co-occurrences
    filteredQuestions.forEach((question) => {
      if (!question.tags || !Array.isArray(question.tags)) return;

      const normalizedTags = question.tags
        .map((tag) => normalizeTag(tag))
        .filter(Boolean);

      // Count individual tags
      normalizedTags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });

      // Count co-occurrences (pairs)
      for (let i = 0; i < normalizedTags.length; i++) {
        for (let j = i + 1; j < normalizedTags.length; j++) {
          const tag1 = normalizedTags[i];
          const tag2 = normalizedTags[j];
          const key = [tag1, tag2].sort().join("|||");
          coOccurrences[key] = (coOccurrences[key] || 0) + 1;
        }
      }
    });

    // Get top 20 tags by count
    const sortedTags = Object.entries(tagCounts)
      .filter(([, count]) => count >= 2) // Only tags used 2+ times
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

    const tagNames = new Set(sortedTags.map((tag) => tag.name));

    // Get connections between these top tags
    const relevantConnections = Object.entries(coOccurrences)
      .filter(([key]) => {
        const [tag1, tag2] = key.split("|||");
        return tagNames.has(tag1) && tagNames.has(tag2);
      })
      .map(([key, count]) => {
        const [source, target] = key.split("|||");
        return { source, target, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 50); // Top 50 connections

    return { tags: sortedTags, connections: relevantConnections };
  }, [questions, selectedDiscipline, showAllDisciplines]);

  // Calculate node positions (circular layout)
  const nodePositions = useMemo(() => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) / 2 - 80;

    const positions = {};
    tags.forEach((tag, index) => {
      const angle = (2 * Math.PI * index) / tags.length - Math.PI / 2;
      positions[tag.name] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        count: tag.count,
      };
    });
    return positions;
  }, [tags, dimensions]);

  // Handle node click
  const handleNodeClick = (tagName) => {
    setSelectedTag(selectedTag === tagName ? null : tagName);
  };

  if (tags.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        <Icon name="git-branch" size={32} className="mx-auto mb-2 opacity-50" />
        <p>No tag connections found</p>
        <p className="text-sm mt-1">
          Tags that appear together in questions will be connected here
        </p>
      </div>
    );
  }

  // Find max count for scaling
  const maxCount = Math.max(...tags.map((tag) => tag.count));
  const maxConnectionCount = Math.max(
    ...connections.map((conn) => conn.count),
    1
  );
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width="100%"
        height={dimensions.height}
        className="overflow-visible"
      >
        {/* Background concentric circles */}
        {[0.25, 0.5, 0.75, 1].map((ratio, index) => (
          <circle
            key={index}
            cx={centerX}
            cy={centerY}
            r={(Math.min(dimensions.width, dimensions.height) / 2 - 80) * ratio}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1}
            strokeOpacity={0.5}
          />
        ))}

        {/* Connections */}
        {connections.map((connection, index) => {
          const start = nodePositions[connection.source];
          const end = nodePositions[connection.target];
          if (!start || !end) return null;

          const isHighlighted =
            selectedTag === connection.source ||
            selectedTag === connection.target;
          const opacity = selectedTag
            ? isHighlighted
              ? 0.9
              : 0.05
            : 0.15 + (connection.count / maxConnectionCount) * 0.3;
          const strokeWidth = isHighlighted
            ? 2 + (connection.count / maxConnectionCount) * 2
            : 1 + connection.count / maxConnectionCount;

          return (
            <line
              key={index}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={isHighlighted ? "#818cf8" : "#475569"}
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
            />
          );
        })}

        {/* Tag Nodes */}
        {tags.map((tag) => {
          const pos = nodePositions[tag.name];
          if (!pos) return null;

          const isSelected = selectedTag === tag.name;
          const isConnected = selectedTag
            ? connections.some(
                (conn) =>
                  (conn.source === selectedTag && conn.target === tag.name) ||
                  (conn.target === selectedTag && conn.source === tag.name)
              )
            : false;
          const shouldHighlight = isSelected || isConnected;
          const nodeSize = 6 + (tag.count / maxCount) * 14;

          // Calculate label position (outside the circle)
          const angle = Math.atan2(pos.y - centerY, pos.x - centerX);
          const labelOffset = nodeSize + 8;
          const labelX = pos.x + Math.cos(angle) * labelOffset;
          const labelY = pos.y + Math.sin(angle) * labelOffset;
          const textAnchor = pos.x > centerX ? "start" : "end";

          return (
            <g
              key={tag.name}
              onClick={() => handleNodeClick(tag.name)}
              style={{ cursor: "pointer" }}
            >
              {/* Node glow for selected */}
              {isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeSize + 6}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth={2}
                  strokeOpacity={0.5}
                />
              )}
              {/* Node circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeSize}
                fill={
                  isSelected
                    ? "#818cf8"
                    : shouldHighlight
                    ? "#6366f1"
                    : "#475569"
                }
                stroke={isSelected ? "#a5b4fc" : "#64748b"}
                strokeWidth={isSelected ? 2 : 1}
                opacity={
                  selectedTag && !shouldHighlight && !isSelected ? 0.3 : 1
                }
              />
              {/* Tag label */}
              <text
                x={labelX}
                y={labelY}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                fill={shouldHighlight || isSelected ? "#e2e8f0" : "#64748b"}
                fontSize={11}
                className="select-none pointer-events-none"
                opacity={
                  selectedTag && !shouldHighlight && !isSelected ? 0.3 : 1
                }
              >
                #{tag.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Click instruction */}
      <p className="text-center text-slate-500 text-sm mt-2">
        Click a node to highlight connections
      </p>

      {/* Selected tag info */}
      {selectedTag && (
        <div className="absolute top-4 right-4 bg-slate-800/90 border border-slate-700 rounded-lg p-3 text-sm backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
            <span className="font-semibold text-white">#{selectedTag}</span>
          </div>
          <div className="text-slate-400">
            {nodePositions[selectedTag]?.count || 0} questions
          </div>
          <div className="text-slate-500 text-xs">
            {
              connections.filter(
                (conn) =>
                  conn.source === selectedTag || conn.target === selectedTag
              ).length
            }{" "}
            connections
          </div>
        </div>
      )}
    </div>
  );
};

export default TagConnectionGraph;
