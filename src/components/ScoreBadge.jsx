import React from "react";
import { useThemeColors } from "../hooks/useThemeColors";

// Tier labels and icons (not color-dependent)
const TIER_META = {
  exceptional: { label: "Exceptional", icon: "⭐" },
  veryGood: { label: "Very Good", icon: "✨" },
  good: { label: "Good", icon: "👍" },
  adequate: { label: "Adequate", icon: "⚠️" },
  needsWork: { label: "Needs Work", icon: "❌" },
};

/**
 * ScoreBadge - Color-coded badge for AI quality scores
 * Uses centralized theme colors with automatic colorblind mode support
 */
const ScoreBadge = ({ score, improved = false }) => {
  const { getScoreTier, scoreColor } = useThemeColors();

  if (score === null || score === undefined) {
    return null;
  }

  const tier = getScoreTier(score);
  const meta = TIER_META[tier];
  // Use green styling for improved scores, otherwise normal tier colors
  const colorClasses = improved
    ? "bg-green-900/50 text-green-200 border-green-600/50"
    : scoreColor(tier);

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-bold ${colorClasses}`}
      title={
        improved
          ? `Improved Score: ${score}/100`
          : `AI Score: ${score}/100 - ${meta.label}`
      }
    >
      <span>{improved ? "→" : meta.icon}</span>
      <span>{score}</span>
    </div>
  );
};

export default ScoreBadge;
