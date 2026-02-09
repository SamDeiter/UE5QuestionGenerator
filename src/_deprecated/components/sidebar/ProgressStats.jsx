import { useState } from "react";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";
import { useAccessibility } from "../../contexts/AccessibilityContext";

const ProgressStats = ({
  allQuestionsMap,
  totalApproved,
  TARGET_TOTAL,
  overallPercentage,
}) => {
  const { colorblindMode } = useAccessibility();
  const cb = colorblindMode;

  const [showProgress, setShowProgress] = useState(true);

  return (
    <CollapsibleSection
      title="Progress"
      icon="bar-chart-2"
      isCollapsed={!showProgress}
      onToggle={() => setShowProgress(!showProgress)}
      variant="slate"
    >
      <div className="space-y-3">
        <div className="text-center pt-2">
          <h3 className="text-xl font-extrabold text-white">
            {allQuestionsMap.size}
          </h3>
          <p className="text-xs font-semibold uppercase text-slate-400">
            UNIQUE QUESTIONS IN DB
          </p>
        </div>
        <div className="border-t border-slate-800 pt-3 space-y-1">
          <div className="flex justify-between items-end">
            <h3 className="text-xs font-bold text-slate-300">
              APPROVED QUOTA ({totalApproved}/{TARGET_TOTAL})
            </h3>
            <span className="text-xs font-bold text-orange-400">
              {overallPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-700">
            <div
              className="h-full bg-orange-600 transition-all duration-500"
              style={{ width: `${Math.min(100, overallPercentage)}%` }}
            ></div>
          </div>
          {/* Remaining to generate */}
          {TARGET_TOTAL > totalApproved && (
            <div className="flex justify-between items-center pt-2 text-xs">
              <span className="text-slate-500">Remaining to Generate:</span>
              <span className="font-bold text-cyan-400">
                {TARGET_TOTAL - totalApproved}
              </span>
            </div>
          )}
          {TARGET_TOTAL <= totalApproved && (
            <div
              className={`flex items-center gap-1 pt-2 text-xs ${
                cb ? "text-blue-400" : "text-green-400"
              }`}
            >
              <Icon name="check-circle" size={12} />
              <span className="font-bold">Quota Complete!</span>
            </div>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
};

export default ProgressStats;
