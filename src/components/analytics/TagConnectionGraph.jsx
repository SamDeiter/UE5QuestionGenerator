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
  const [hoveredTag, setHoveredTag] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width || 400, height: 400 });
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
      .filter(([key, count]) => {
        const [tag1, tag2] = key.split("|||");
        return tagNames.has(tag1) && tagNames.has(tag2) && count >= 1;
      })
      .map(([key, count]) => {
        const [source, target] = key.split("|||");
        return { source, target, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 40); // Top 40 connections

    return { tags: sortedTags, connections: relevantConnections };
  }, [questions, selectedDiscipline, showAllDisciplines]);

  // Calculate node positions (circular layout)
  const nodePositions = useMemo(() => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) / 2 - 60;

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

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width="100%"
        height={dimensions.height}
        className="overflow-visible"
      >
        {/* Connections */}
        {connections.map((connection, index) => {
          const start = nodePositions[connection.source];
          const end = nodePositions[connection.target];
          if (!start || !end) return null;

          const isHighlighted =
            hoveredTag === connection.source ||
            hoveredTag === connection.target;
          const opacity = isHighlighted
            ? 0.8
            : 0.2 + (connection.count / maxConnectionCount) * 0.3;
          const strokeWidth = 1 + (connection.count / maxConnectionCount) * 2;

          return (
            <line
              key={index}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={isHighlighted ? "#3b82f6" : "#64748b"}
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
            />
          );
        })}

        {/* Tag Nodes */}
        {tags.map((tag) => {
          const pos = nodePositions[tag.name];
          if (!pos) return null;

          const isHovered = hoveredTag === tag.name;
          const nodeSize = 4 + (tag.count / maxCount) * 8;

          return (
            <g
              key={tag.name}
              onMouseEnter={() => setHoveredTag(tag.name)}
              onMouseLeave={() => setHoveredTag(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeSize}
                fill={isHovered ? "#3b82f6" : "#06b6d4"}
                stroke={isHovered ? "#60a5fa" : "#0891b2"}
                strokeWidth={2}
              />
              <text
                x={pos.x}
                y={pos.y + nodeSize + 12}
                textAnchor="middle"
                fill={isHovered ? "#ffffff" : "#94a3b8"}
                fontSize={10}
                className="select-none"
              >
                {tag.name.length > 12
                  ? tag.name.substring(0, 10) + "..."
                  : tag.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover Info */}
      {hoveredTag && (
        <div className="absolute bottom-4 left-4 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm">
          <div className="font-semibold text-white capitalize">
            {hoveredTag}
          </div>
          <div className="text-slate-400">
            {nodePositions[hoveredTag]?.count || 0} questions
          </div>
          <div className="text-slate-500 text-xs mt-1">
            {
              connections.filter(
                (conn) =>
                  conn.source === hoveredTag || conn.target === hoveredTag
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
