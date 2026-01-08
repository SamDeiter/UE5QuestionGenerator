import Icon from "./Icon";
import { useAccessibility } from "../contexts/AccessibilityContext";

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
 * Get inactive button colors based on mode and colorblind setting
 */
const getInactiveClasses = (mode, isColorblind) => {
  if (isColorblind) {
    // Colorblind-safe palette
    const colorblindMap = {
      accepted: "bg-blue-900/20 text-blue-400 hover:bg-blue-900/30",
      rejected: "bg-rose-900/20 text-rose-400 hover:bg-rose-900/30",
      pending: "bg-amber-900/20 text-amber-400 hover:bg-amber-900/30",
      other: "bg-purple-900/20 text-purple-400 hover:bg-purple-900/30",
    };
    return (
      colorblindMap[mode] || "bg-slate-800 text-slate-400 hover:bg-slate-700/50"
    );
  }

  // Default colors
  const defaultMap = {
    accepted: "bg-green-900/20 text-green-400 hover:bg-green-900/30",
    rejected: "bg-red-900/20 text-red-400 hover:bg-red-900/30",
    pending: "bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/30",
    other: "bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/30",
  };
  return (
    defaultMap[mode] || "bg-slate-800 text-slate-400 hover:bg-slate-700/50"
  );
};

const FilterButton = ({ mode, current, setFilter, label, count }) => {
  const { colorblindMode } = useAccessibility();
  const isActive = mode === current;
  const baseClasses =
    "px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1";
  const activeClasses =
    "bg-orange-600 text-white shadow-md shadow-orange-900/50";
  const inactiveClasses = getInactiveClasses(mode, colorblindMode);

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
