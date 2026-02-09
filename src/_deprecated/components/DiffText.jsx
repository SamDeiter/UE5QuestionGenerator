/**
 * DiffText Component
 *
 * Renders inline word-level diff with highlighting.
 * Used to show before/after comparisons for AI rewrites.
 */
import { computeWordDiff } from "../utils/stringHelpers";

const DiffText = ({ oldText, newText }) => {
  const diff = computeWordDiff(oldText || "", newText || "");

  if (diff.length === 0) return <span className="text-white">{newText}</span>;

  // Check if there are any actual changes
  const hasChanges = diff.some((seg) => seg.type !== "unchanged");

  if (!hasChanges) {
    return <span className="text-white">{oldText}</span>;
  }

  return (
    <span className="leading-relaxed">
      {diff.map((segment, idx) => {
        if (segment.type === "removed") {
          return (
            <span key={idx} className="text-slate-500 line-through">
              {segment.text}
            </span>
          );
        }
        if (segment.type === "added") {
          return (
            <span
              key={idx}
              className="bg-green-900/60 text-green-300 font-semibold px-0.5 rounded mx-0.5"
            >
              {segment.text}
            </span>
          );
        }
        return (
          <span key={idx} className="text-white">
            {segment.text}
          </span>
        );
      })}
    </span>
  );
};

export default DiffText;
