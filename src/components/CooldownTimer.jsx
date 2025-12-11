import { useState, useEffect } from "react";
import Icon from "./Icon";

/**
 * CooldownTimer - Displays countdown when API rate limited
 * Shows animated progress bar with remaining seconds.
 *
 * @param {{ remainingSeconds: number, isLimited: boolean }} props
 */
const CooldownTimer = ({ remainingSeconds, isLimited }) => {
  const [seconds, setSeconds] = useState(remainingSeconds);

  // Countdown effect
  useEffect(() => {
    if (!isLimited || remainingSeconds <= 0) {
      setSeconds(0);
      return;
    }

    setSeconds(remainingSeconds);
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLimited, remainingSeconds]);

  if (!isLimited || seconds <= 0) return null;

  // Calculate progress percentage (assume max 60s cooldown)
  const maxCooldown = 60;
  const progress = Math.min(100, (seconds / maxCooldown) * 100);

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-amber-900/20 border border-amber-700/50 rounded-lg animate-pulse">
      <div className="flex items-center gap-2 text-amber-400">
        <Icon
          name="clock"
          size={16}
          className="animate-spin"
          style={{ animationDuration: "3s" }}
        />
        <span className="text-sm font-bold">Cooling down...</span>
      </div>

      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="text-lg font-mono font-bold text-amber-300 min-w-[3ch] text-right">
        {seconds}s
      </span>
    </div>
  );
};

export default CooldownTimer;
