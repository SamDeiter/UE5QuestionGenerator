import Icon from "./Icon";
import { useThemeColors } from "../hooks/useThemeColors";

/**
 * Get icon name based on filter mode
 */
const getIconName = (mode) => {
  const iconMap = {
    accepted: "check",
    rejected: "x",
    pending: "clock",
    other: "help-circle",
  };
  return iconMap[mode] || "list";
};

/**
 * FilterButton - Filter toggle with status-based coloring
 * Uses centralized theme colors with automatic colorblind mode support
 */
const FilterButton = ({ mode, current, setFilter, label, count }) => {
  const { statusColor } = useThemeColors();
  const isActive = mode === current;
  const baseClasses =
    "px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1";
  const activeClasses =
    "bg-orange-600 text-white shadow-md shadow-orange-900/50";
  const inactiveClasses = statusColor(mode);

  return (
    <button
      onClick={() => setFilter(mode)}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
      <Icon name={getIconName(mode)} size={12} />
      {label}{" "}
      <span className="text-[10px] bg-slate-950/50 px-1.5 rounded-full">
        {count}
      </span>
    </button>
  );
};

export default FilterButton;
