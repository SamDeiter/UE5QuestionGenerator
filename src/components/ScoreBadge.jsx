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
const ScoreBadge = ({ score }) => {
  const { getScoreTier, scoreColor } = useThemeColors();

  if (score === null || score === undefined) {
    return null;
  }

  const tier = getScoreTier(score);
  const meta = TIER_META[tier];
  const colorClasses = scoreColor(tier);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-bold ${colorClasses}`}
      title={`AI Score: ${score}/100 - ${meta.label}`}
    >
      <span className="text-sm">{meta.icon}</span>
      <span>{score}</span>
    </div>
  );
};

export default ScoreBadge;
