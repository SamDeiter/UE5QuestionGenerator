/**
 * Shared Toolbar Components
 * Reusable UI elements across all toolbar modes
 */
import { useState, useEffect } from "react";
import Icon from "../Icon";

/**
 * Search input with icon, clear button, and 200ms debounce.
 * Local state keeps the input responsive; the store update is deferred so the
 * filter pipeline doesn't fire on every keystroke.
 */
export const SearchInput = ({
  searchTerm,
  setSearchTerm,
  placeholder = "Search...",
  width = "w-48",
  focusColor = "indigo",
}) => {
  const [localValue, setLocalValue] = useState(searchTerm);

  // Sync local value when the store is cleared externally (e.g. clear button in another component)
  useEffect(() => {
    setLocalValue(searchTerm);
  }, [searchTerm]);

  // Debounce: push to store 200ms after the user stops typing
  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(localValue), 200);
    return () => clearTimeout(id);
  }, [localValue, setSearchTerm]);

  return (
    <div className="relative">
      <Icon
        name="search"
        size={14}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
      />
      <input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className={`${width} bg-slate-900 text-slate-300 placeholder-slate-600 border border-slate-700 focus:border-${focusColor}-500 focus:ring-1 focus:ring-${focusColor}-500 text-xs py-1.5 pl-8 pr-8 rounded-md transition-all`}
      />
      {localValue && (
        <button
          onClick={() => {
            setLocalValue("");
            setSearchTerm("");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400"
        >
          <Icon name="x" size={12} />
        </button>
      )}
    </div>
  );
};

/**
 * Toolbar divider (vertical line)
 */
export const ToolbarDivider = () => <div className="h-4 w-px bg-slate-700" />;

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

export default {
  SearchInput,
  ToolbarDivider,
  DropdownMenu,
  MenuButton,
};
