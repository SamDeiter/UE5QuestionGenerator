/**
 * EmptyState Component
 *
 * Flexible empty state display for when there's no data to show.
 *
 * @param {Object} props
 * @param {string} props.message - Custom message (default: generate questions prompt)
 * @param {string} props.icon - Icon name (default: "terminal")
 * @param {number} props.iconSize - Icon size in pixels (default: 48)
 */
import Icon from "./Icon";

const EmptyState = ({
  message = "Ready. Click 'GENERATE QUESTIONS' to begin or upload a source file.",
  icon = "terminal",
  iconSize = 48,
}) => (
  <div className="flex flex-col items-center justify-center h-full text-slate-600">
    <Icon
      name={icon}
      size={iconSize}
      className="mb-4 text-slate-800 opacity-50"
    />
    <p className="font-medium text-slate-500 text-sm text-center">{message}</p>
  </div>
);

export default EmptyState;
