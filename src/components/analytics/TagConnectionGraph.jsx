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
  const [sortOrder, setSortOrder] = useState("most_connected"); // 'most_connected' | 'least_connected'

  // No selection state needed if we are removing highlighting
  // User said "do not highlight when you hover", implying they want a static view or at least no distinct active state.

  // Vibrant color palette for tags
  const TAG_COLORS = [
    "#F472B6", // Pink 400
    "#A78BFA", // Violet 400
    "#60A5FA", // Blue 400
    "#34D399", // Emerald 400
    "#FBBF24", // Amber 400
    "#F87171", // Red 400
    "#22D3EE", // Cyan 400
    "#E879F9", // Fuchsia 400
  ];

  const getColorForTag = (tagName, index) => {
    return TAG_COLORS[index % TAG_COLORS.length];
  };

  // Determine dimensions for SVG - MUST BE DEFINED BEFORE nodePositions
  const [dimensions, setDimensions] = useState({ width: 1200, height: 1200 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const parent = svgRef.current.parentElement;
        if (parent && parent.clientWidth > 0) {
          // Use 90% of parent width, no cap - let it be as big as needed
          const size = Math.floor(parent.clientWidth * 0.9);
          setDimensions({
            width: size,
            height: size, // Make it square
          });
        }
      }
    };
    // Initial delay to let layout settle
    const timer = setTimeout(updateDimensions, 100);
    window.addEventListener("resize", updateDimensions);
    return () => {
      window.removeEventListener("resize", updateDimensions);
      clearTimeout(timer);
    };
  }, []);

  // Calculate tag co-occurrences and sort by CONNECTIONS
  const { tags, connections } = useMemo(() => {
    const tagCounts = {};
    const coOccurrences = {};
    const connectionCounts = {}; // Track degree (number of connections) for each tag

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

    // 1. Count tags and co-occurrences
    filteredQuestions.forEach((question) => {
      if (!question.tags || !Array.isArray(question.tags)) return;

      const normalizedTags = question.tags
        .map((tag) => normalizeTag(tag))
        .filter(Boolean);

      // Count individual tags
      normalizedTags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        if (!connectionCounts[tag]) connectionCounts[tag] = 0;
      });

      // Count co-occurrences (pairs)
      for (let i = 0; i < normalizedTags.length; i++) {
        for (let j = i + 1; j < normalizedTags.length; j++) {
          const tag1 = normalizedTags[i];
          const tag2 = normalizedTags[j];

          const key = [tag1, tag2].sort().join("|||");
          if (!coOccurrences[key]) {
            coOccurrences[key] = 0;
            // Increment connection degree for both tags (unique connections)
            connectionCounts[tag1]++;
            connectionCounts[tag2]++;
          }
          coOccurrences[key]++;
        }
      }
    });

    // 2. Sort tags by CONNECTION DEGREE (not just usage count)
    const sortedTags = Object.keys(tagCounts)
      .map((name) => ({
        name,
        count: tagCounts[name],
        degree: connectionCounts[name] || 0,
      }))
      .sort((a, b) => {
        if (sortOrder === "most_connected") {
          return b.degree - a.degree; // Descending (High number first)
        } else {
          return a.degree - b.degree; // Ascending (Low number first)
        }
      })
      .slice(0, 20); // Top 20

    const tagNames = new Set(sortedTags.map((tag) => tag.name));

    // 3. Get connections ONLY between these selected tags
    const relevantConnections = Object.entries(coOccurrences)
      .filter(([key]) => {
        const [tag1, tag2] = key.split("|||");
        return tagNames.has(tag1) && tagNames.has(tag2);
      })
      .map(([key, count]) => {
        const [source, target] = key.split("|||");
        return { source, target, count };
      })
      .sort((a, b) => b.count - a.count);

    return { tags: sortedTags, connections: relevantConnections };
  }, [questions, selectedDiscipline, showAllDisciplines, sortOrder]);

  // Calculate node positions (circular layout)
  const nodePositions = useMemo(() => {
    const w = dimensions.width || 1200;
    const h = dimensions.height || 1200;
    const centerX = w / 2;
    const centerY = h / 2;
    // Use full radius (removed 0.75 scale reduction)
    const radius = Math.min(w, h) / 2 - 40;

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

  // Handle node click - removed as per instruction

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
    <div className="flex flex-col items-center">
      {/* View Toggle - Centered */}
      <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 mb-4">
        <button
          onClick={() => setSortOrder("most_connected")}
          className={`px-3 py-1.5 text-xs font-bold uppercase rounded ${
            sortOrder === "most_connected"
              ? "bg-slate-600 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Most Connected
        </button>
        <button
          onClick={() => setSortOrder("least_connected")}
          className={`px-3 py-1.5 text-xs font-bold uppercase rounded ${
            sortOrder === "least_connected"
              ? "bg-slate-600 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Least Connected
        </button>
      </div>

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

        {/* Connections - Static Style */}
        {connections.map((connection, index) => {
          const start = nodePositions[connection.source];
          const end = nodePositions[connection.target];
          if (!start || !end) return null;

          const opacity = 0.15 + (connection.count / maxConnectionCount) * 0.3;
          const strokeWidth = 1 + connection.count / maxConnectionCount;

          return (
            <line
              key={index}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="#64748b" // Slate 500
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
            />
          );
        })}

        {/* Tag Nodes */}
        {tags.map((tag, index) => {
          const pos = nodePositions[tag.name];
          if (!pos) return null;

          const connectionCount = connections.filter(
            (conn) => conn.source === tag.name || conn.target === tag.name
          ).length;

          const nodeSize = 14 + (tag.count / maxCount) * 16;
          const color = getColorForTag(tag.name, index);

          // Calculate label position (outside the circle)
          const angle = Math.atan2(pos.y - centerY, pos.x - centerX);
          const labelOffset = nodeSize + 8;
          const labelX = pos.x + Math.cos(angle) * labelOffset;
          const labelY = pos.y + Math.sin(angle) * labelOffset;
          const textAnchor = pos.x > centerX ? "start" : "end";

          return (
            <g
              key={tag.name}
              // No onClick
            >
              {/* Node circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeSize}
                fill={color}
                stroke={color}
                strokeWidth={0}
                fillOpacity={0.8}
              />
              {/* Connection count inside node */}
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff" // White text on colored background
                fontSize={10}
                fontWeight="bold"
                className="select-none pointer-events-none"
                style={{ textShadow: "0px 1px 2px rgba(0,0,0,0.5)" }}
              >
                {connectionCount}
              </text>
              {/* Tag label */}
              <text
                x={labelX}
                y={labelY}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                fill="#cbd5e1" // Slate 300
                fontSize={11}
                className="select-none pointer-events-none"
              >
                #{tag.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default TagConnectionGraph;
