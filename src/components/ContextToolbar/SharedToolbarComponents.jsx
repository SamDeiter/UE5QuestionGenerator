/**
 * Shared Toolbar Components
 * Reusable UI elements across all toolbar modes
 */
import Icon from "../Icon";

/**
 * Search input with icon and clear button
 */
export const SearchInput = ({
  searchTerm,
  setSearchTerm,
  placeholder = "Search...",
  width = "w-48",
  focusColor = "indigo",
}) => (
  <div className="relative">
    <Icon
      name="search"
      size={14}
      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
    />
    <input
      type="text"
      placeholder={placeholder}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className={`${width} bg-slate-900 text-slate-300 placeholder-slate-600 border border-slate-700 focus:border-${focusColor}-500 focus:ring-1 focus:ring-${focusColor}-500 text-xs py-1.5 pl-8 pr-8 rounded-md transition-all`}
    />
    {searchTerm && (
      <button
        onClick={() => setSearchTerm("")}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400"
      >
        <Icon name="x" size={12} />
      </button>
    )}
  </div>
);

/**
 * Toolbar divider (vertical line)
 */
export const ToolbarDivider = () => <div className="h-4 w-px bg-slate-700" />;

/**
 * Status indicator pill
 */
export const StatusIndicator = ({
  icon,
  text,
  color = "slate",
  pulse = false,
}) => (
  <span
    className={`text-xs text-${color}-500 font-medium flex items-center gap-1 ${
      pulse ? "animate-pulse" : ""
    }`}
  >
    <Icon name={icon} size={12} className={pulse ? "animate-spin" : ""} />{" "}
    {text}
  </span>
);

/**
 * Toggle button with active/inactive states
 */
export const ToggleButton = ({
  active,
  onClick,
  icon,
  activeLabel,
  inactiveLabel,
  activeColor = "blue",
  title = "",
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 border ${
      active
        ? `bg-${activeColor}-600/20 text-${activeColor}-300 border-${activeColor}-500/50`
        : "bg-transparent text-slate-400 border-transparent hover:bg-slate-800"
    }`}
    title={title}
  >
    <Icon name={icon} size={14} />
    {active ? activeLabel : inactiveLabel}
  </button>
);

/**
 * Dropdown menu wrapper with click-outside handling
 */
export const DropdownMenu = ({ isOpen, children, width = "w-56" }) => {
  if (!isOpen) return null;
  return (
    <div
      className={`absolute right-0 top-full mt-1 ${width} bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
    >
      {children}
    </div>
  );
};

/**
 * Menu button for dropdown items
 */
export const MenuButton = ({
  onClick,
  icon,
  label,
  disabled = false,
  color = "slate",
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full text-left px-4 py-2 text-xs text-${color}-300 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    <Icon name={icon} size={14} />
    {label}
  </button>
);

/**
 * Small label with selector styling
 */
export const LabeledSelector = ({ label, children }) => (
  <div className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded border border-slate-700 shadow-sm">
    <span className="text-[10px] uppercase font-bold text-slate-500 select-none">
      {label}:
    </span>
    {children}
  </div>
);

export default {
  SearchInput,
  ToolbarDivider,
  StatusIndicator,
  ToggleButton,
  DropdownMenu,
  MenuButton,
  LabeledSelector,
};
