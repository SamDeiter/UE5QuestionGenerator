/**
 * ToastContainer Component
 *
 * Container for toast notifications with position-based display:
 * - Error/urgent (red): Bottom center
 * - Success (green): Bottom right
 * - Info/Warning (other): Bottom left
 */
import Toast from "./Toast";

/**
 * Get position class based on toast type
 */
const getPositionForType = (type) => {
  switch (type) {
    case "error":
      return "center"; // Urgent - bottom center
    case "success":
      return "right"; // Success - bottom right
    default:
      return "left"; // Info, warning - bottom left
  }
};

/**
 * Group toasts by their display position
 */
const groupToastsByPosition = (toasts) => {
  return toasts.reduce(
    (groups, toast) => {
      const position = getPositionForType(toast.type);
      groups[position].push(toast);
      return groups;
    },
    { left: [], center: [], right: [] }
  );
};

const ToastContainer = ({ toasts, onRemove }) => {
  const grouped = groupToastsByPosition(toasts);

  return (
    <>
      {/* LEFT: Info & Warning toasts */}
      {grouped.left.length > 0 && (
        <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
          {grouped.left.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto animate-in slide-in-from-left duration-200"
            >
              <Toast
                message={toast.message}
                type={toast.type}
                duration={toast.duration}
                sticky={toast.sticky}
                progress={toast.progress}
                action={toast.action}
                onClose={() => onRemove(toast.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* CENTER: Error/urgent toasts */}
      {grouped.center.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none max-w-md">
          {grouped.center.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto animate-in slide-in-from-bottom duration-200"
            >
              <Toast
                message={toast.message}
                type={toast.type}
                duration={toast.duration}
                sticky={toast.sticky}
                progress={toast.progress}
                action={toast.action}
                onClose={() => onRemove(toast.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* RIGHT: Success toasts */}
      {grouped.right.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
          {grouped.right.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto animate-in slide-in-from-right duration-200"
            >
              <Toast
                message={toast.message}
                type={toast.type}
                duration={toast.duration}
                sticky={toast.sticky}
                progress={toast.progress}
                action={toast.action}
                onClose={() => onRemove(toast.id)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default ToastContainer;
