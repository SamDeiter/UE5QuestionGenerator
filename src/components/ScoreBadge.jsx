import React from "react";

/**
 * ScoreBadge - Color-coded badge for AI quality scores
 * Based on SCORING_RUBRIC.md tiers
 */
const ScoreBadge = ({ score }) => {
  if (score === null || score === undefined) {
    return null;
  }

  // Determine tier and styling based on score
  const getTierInfo = (score) => {
    if (score >= 90) {
      return {
        label: "Exceptional",
        color: "bg-green-500/20 text-green-400 border-green-500/50",
        icon: "⭐",
      };
    } else if (score >= 80) {
      return {
        label: "Very Good",
        color: "bg-blue-500/20 text-blue-400 border-blue-500/50",
        icon: "✨",
      };
    } else if (score >= 70) {
      return {
        label: "Good",
        color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
        icon: "👍",
      };
    } else if (score >= 60) {
      return {
        label: "Adequate",
        color: "bg-orange-500/20 text-orange-400 border-orange-500/50",
        icon: "⚠️",
      };
    } else {
      return {
        label: "Needs Work",
        color: "bg-red-500/20 text-red-400 border-red-500/50",
        icon: "❌",
      };
    }
  };

  const tier = getTierInfo(score);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-bold ${tier.color}`}
      title={`AI Score: ${score}/100 - ${tier.label}`}
    >
      <span className="text-sm">{tier.icon}</span>
      <span>{score}</span>
    </div>
  );
};

export default ScoreBadge;
