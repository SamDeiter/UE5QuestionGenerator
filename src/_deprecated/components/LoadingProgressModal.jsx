import Icon from "./Icon";

/**
 * LoadingProgressModal - Shows a prominent loading progress bar
 * Used when loading large datasets from Firestore or other sources
 */
const LoadingProgressModal = ({
  isOpen,
  title = "Loading Questions",
  statusText = "Loading...",
  current = 0,
  total = 0,
}) => {
  if (!isOpen) return null;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-3">
            <div className="relative">
              <Icon name="cloud-download" size={24} className="text-blue-400" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Text */}
          <div className="flex items-center gap-2">
            <Icon
              name="loader"
              size={16}
              className="animate-spin text-blue-400"
            />
            <span className="text-sm text-slate-300">{statusText}</span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative w-full h-3 bg-slate-700 rounded-full overflow-hidden">
              {total > 0 ? (
                // Determinate progress
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              ) : (
                // Indeterminate progress (shimmer)
                <div
                  className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-full"
                  style={{
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s ease-in-out infinite",
                  }}
                />
              )}
            </div>

            {/* Progress Numbers */}
            <div className="flex justify-between text-xs text-slate-500">
              {total > 0 ? (
                <>
                  <span>{current.toLocaleString()} loaded</span>
                  <span>{percentage}%</span>
                  <span>{total.toLocaleString()} total</span>
                </>
              ) : (
                <span className="w-full text-center">Please wait...</span>
              )}
            </div>
          </div>

          {/* Helpful Message */}
          <p className="text-xs text-slate-500 text-center">
            Loading questions from the cloud. This may take a moment for large
            datasets.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default LoadingProgressModal;
