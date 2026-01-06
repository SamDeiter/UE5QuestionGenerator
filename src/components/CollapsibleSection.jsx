import React from "react";
import Icon from "./Icon";

/**
 * CollapsibleSection - A reusable component for sections that can be toggled open/closed.
 *
 * @param {Object} props
 * @param {string} props.title - The header text for the section.
 * @param {string} props.icon - The name of the icon to display next to the title.
 * @param {boolean} props.isCollapsed - Whether the section is currently collapsed.
 * @param {function} props.onToggle - Callback function when the header is clicked.
 * @param {React.ReactNode} props.children - The content to display when the section is not collapsed.
 * @param {string} [props.variant='indigo'] - Visual variant ('indigo', 'blue', 'slate', 'purple').
 * @param {string} [props.className=''] - Additional CSS classes for the container.
 * @param {string} [props.headerClassName=''] - Additional CSS classes for the header.
 * @param {boolean} [props.showChevron=true] - Whether to show the expand/collapse chevron.
 */
const CollapsibleSection = ({
  title,
  icon,
  isCollapsed,
  onToggle,
  children,
  variant = "indigo",
  className = "",
  headerClassName = "",
  showChevron = true,
}) => {
  // Map variants to colors
  const variants = {
    indigo: {
      border: "border-indigo-500/30",
      text: "text-indigo-400",
    },
    blue: {
      border: "border-blue-500/30",
      text: "text-blue-400",
    },
    slate: {
      border: "border-slate-600/30",
      text: "text-slate-400",
    },
    purple: {
      border: "border-purple-500/30",
      text: "text-purple-400",
    },
    green: {
      border: "border-green-500/30",
      text: "text-green-400",
    },
  };

  const currentVariant = variants[variant] || variants.indigo;

  return (
    <div
      className={`bg-slate-800 rounded-lg p-4 border ${currentVariant.border} ${className}`}
    >
      <h2
        onClick={onToggle}
        className={`cursor-pointer hover:text-white transition-colors text-lg font-bold ${currentVariant.text} mb-3 flex items-center gap-2 ${headerClassName}`}
      >
        <div className="flex items-center gap-2">
          {icon && <Icon name={icon} size={18} />}
          {title}
        </div>
        {showChevron && (
          <Icon
            name={isCollapsed ? "chevron-down" : "chevron-up"}
            size={16}
            className="ml-auto opacity-50"
          />
        )}
      </h2>
      {!isCollapsed && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection;
