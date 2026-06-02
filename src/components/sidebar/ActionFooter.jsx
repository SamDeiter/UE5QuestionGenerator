import { useState, useEffect } from "react";
import Icon from "../Icon";
import CooldownTimer from "../CooldownTimer";
import {
  subscribeToRateLimitState,
  getRateLimitStatus,
} from "../../utils/rateLimitState";
import { useAllQuestionsMap } from "../../store/questionSelectors";

/**
 * Get button content based on current state
 */
const getButtonContent = (isGenerating, isApiReady, isTargetMet) => {
  if (isGenerating) {
    return { icon: "loader", text: "GENERATING...", spin: true };
  }
  if (!isApiReady) {
    return { icon: "alert-circle", text: "API KEY REQUIRED", spin: false };
  }
  if (isTargetMet) {
    return { icon: "check-circle", text: "QUOTA MET", spin: false };
  }
  return { icon: "book-open", text: "GENERATE QUESTIONS", spin: false };
};

/**
 * Get button title/tooltip based on state
 */
const getButtonTitle = (isApiReady, isTargetMet, maxBatchSize) => {
  if (!isApiReady) return "⚠️ API Key Required - Configure in Settings";
  if (isTargetMet) return "✓ Quota Met for this Category";
  if (maxBatchSize === 0) return "✓ All Categories Complete";
  return "Generate new questions";
};

/**
 * ActionFooter - Generate button with live progress indicator
 * Shows animated progress bar and status text during generation
 */
const ActionFooter = ({
  handleGenerate,
  isGenerating,
  isTargetMet,
  maxBatchSize,
  isApiReady,
  handleBulkTranslateMissing,
  isProcessing,
  status = "", // Live status text from useGeneration hook
}) => {
  const allQuestionsMap = useAllQuestionsMap();
  // Subscribe to rate limit state for cooldown display
  const [rateLimitStatus, setRateLimitStatus] = useState(getRateLimitStatus());

  useEffect(() => {
    const unsubscribe = subscribeToRateLimitState(setRateLimitStatus);
    return unsubscribe;
  }, []);

  const isRateLimited =
    rateLimitStatus.isLimited && rateLimitStatus.remainingSeconds > 0;

  const isButtonDisabled =
    isGenerating ||
    isTargetMet ||
    maxBatchSize === 0 ||
    !isApiReady ||
    isRateLimited;

  const buttonContent = getButtonContent(isGenerating, isApiReady, isTargetMet);

  return (
    <div className="sticky bottom-0 bg-slate-950 pt-4 pb-2 border-t border-slate-800 z-20 -mx-6 px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
      <div className="space-y-3">
        {/* Rate Limit Cooldown Timer */}
        {isRateLimited && (
          <CooldownTimer
            remainingSeconds={rateLimitStatus.remainingSeconds}
            isLimited={true}
          />
        )}

        {/* Progress Indicator - shown during generation */}
        {isGenerating && (
          <div className="bg-slate-900 border border-orange-500/30 rounded-lg p-3 animate-in fade-in duration-200">
            {/* Animated Progress Bar */}
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 rounded-full animate-pulse"
                style={{
                  width: status.includes("Critiquing")
                    ? `${Math.min(
                        100,
                        (parseInt(status.match(/\d+/)?.[0] || 0) /
                          parseInt(status.match(/of (\d+)/)?.[1] || 1)) *
                          100
                      )}%`
                    : "100%",
                  animation: status.includes("Critiquing")
                    ? "none"
                    : "shimmer 2s infinite",
                }}
              />
            </div>
            {/* Status Text */}
            <div className="flex items-center gap-2">
              <Icon
                name="loader"
                size={14}
                className="animate-spin text-orange-400"
              />
              <span className="text-xs text-orange-300 font-medium truncate">
                {status || "Generating questions..."}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleGenerate}
          data-tour="generate-button"
          disabled={isButtonDisabled}
          className={`w-full py-4 px-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg ${
            isButtonDisabled
              ? "bg-slate-700 cursor-not-allowed"
              : "bg-orange-600 hover:bg-orange-700 active:scale-[0.98]"
          }`}
          title={getButtonTitle(isApiReady, isTargetMet, maxBatchSize)}
        >
          <Icon
            name={buttonContent.icon}
            size={16}
            className={buttonContent.spin ? "animate-spin" : ""}
          />
          {buttonContent.text}
        </button>

        <button
          onClick={handleBulkTranslateMissing}
          disabled={
            isProcessing ||
            isGenerating ||
            Array.from(allQuestionsMap.keys()).length === 0 ||
            !isApiReady
          }
          className={`w-full py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all border ${
            isProcessing ||
            isGenerating ||
            Array.from(allQuestionsMap.keys()).length === 0 ||
            !isApiReady
              ? "bg-slate-800 text-slate-600 cursor-not-allowed"
              : "bg-indigo-950/50 text-indigo-400 hover:bg-indigo-900/50 border-indigo-700"
          }`}
          title="Translate accepted English questions to Chinese, Japanese, and Korean"
        >
          <Icon name="languages" size={14} /> BULK TRANSLATE (CN/JP/KR)
        </button>
      </div>

      {/* Shimmer animation for progress bar */}
      <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
    </div>
  );
};

export default ActionFooter;
