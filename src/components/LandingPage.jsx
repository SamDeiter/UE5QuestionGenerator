import Icon from "./Icon";

const LandingPage = ({
  onSelectMode,
  apiKeyStatus,
  isCloudReady,
  onOpenSettings,
  isAdmin,
  onStartTutorial,
}) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4 relative overflow-hidden">
    {/* API Key Missing Banner */}
    {!apiKeyStatus.includes("Loaded") &&
      !apiKeyStatus.includes("Auto") &&
      !apiKeyStatus.includes("Cloud") && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-900/90 border-b border-orange-700 p-3 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Icon name="alert-triangle" className="text-orange-300" size={20} />
            <span className="text-white font-medium">
              API Key Not Configured - Question generation is disabled
            </span>
          </div>
          <button
            onClick={onOpenSettings}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors duration-200 font-medium"
            aria-label="Open settings to configure API key"
          >
            Configure Now
          </button>
        </div>
      )}

    {/* Background Decoration */}
    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600 rounded-full blur-3xl"></div>
    </div>

    <div className="z-10 text-center space-y-8 max-w-2xl animate-in fade-in zoom-in-95 duration-500">
      <div className="space-y-4">
        <div className="inline-flex items-center justify-center p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl mb-4">
          <img
            src="/UE5QuestionGenerator/logos/UE-Icon-2023-White.svg"
            alt="UE5 Logo"
            className="w-20 h-20 object-contain"
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          UE5{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
            Question Generator
          </span>
        </h1>
        <p className="text-lg text-slate-400 max-w-lg mx-auto">
          Create, review, and manage scenario-based technical questions for
          Unreal Engine 5 documentation.
        </p>

        {onStartTutorial && (
          <button
            onClick={onStartTutorial}
            className="inline-flex items-center gap-2 text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors"
          >
            <Icon name="help-circle" size={16} />
            Take a quick tour
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
        <button
          onClick={() => isAdmin && onSelectMode("create")}
          disabled={!isAdmin}
          className={`group relative flex flex-col items-center p-6 bg-slate-900 border border-slate-800 rounded-xl transition-all duration-300 w-full sm:w-64 shadow-lg 
                        ${
                          isAdmin
                            ? "hover:border-orange-500/50 hover:bg-slate-800/80 hover:shadow-orange-900/20 cursor-pointer"
                            : "opacity-50 cursor-not-allowed border-slate-800/50"
                        }`}
        >
          <div
            className={`p-3 rounded-full mb-4 transition-transform ${
              isAdmin
                ? "bg-orange-900/20 group-hover:scale-110"
                : "bg-slate-800"
            }`}
          >
            <Icon
              name={isAdmin ? "plus-circle" : "lock"}
              size={32}
              className={isAdmin ? "text-orange-500" : "text-slate-500"}
            />
          </div>
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
            Creation Mode
            {!isAdmin && (
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                ADMIN
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-400 text-center">
            {isAdmin
              ? "Generate new questions, upload CSVs, and translate content."
              : "Restricted to administrators. Contact support for access."}
          </p>
        </button>

        <button
          onClick={() => onSelectMode("review")}
          className="group relative flex flex-col items-center p-6 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl hover:bg-slate-800/80 transition-all duration-300 w-full sm:w-64 shadow-lg hover:shadow-indigo-900/20"
        >
          <div className="p-3 bg-indigo-900/20 rounded-full mb-4 group-hover:scale-110 transition-transform">
            <Icon name="list-checks" size={32} className="text-indigo-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Review Mode</h3>
          <p className="text-xs text-slate-400 text-center">
            Manage existing database, approve/reject questions, and bulk export.
          </p>
        </button>

        <button
          onClick={() => onSelectMode("database")}
          className="group relative flex flex-col items-center p-6 bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl hover:bg-slate-800/80 transition-all duration-300 w-full sm:w-64 shadow-lg hover:shadow-blue-900/20"
        >
          <div className="p-3 bg-blue-900/20 rounded-full mb-4 group-hover:scale-110 transition-transform">
            <Icon name="database" size={32} className="text-blue-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Database View</h3>
          <p className="text-xs text-slate-400 text-center">
            Read-only view of approved questions directly from Google Sheets.
          </p>
        </button>

        <button
          onClick={() => onSelectMode("analytics")}
          className="group relative flex flex-col items-center p-6 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl hover:bg-slate-800/80 transition-all duration-300 w-full sm:w-64 shadow-lg hover:shadow-emerald-900/20"
        >
          <div className="p-3 bg-emerald-900/20 rounded-full mb-4 group-hover:scale-110 transition-transform">
            <Icon name="bar-chart-2" size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Analytics</h3>
          <p className="text-xs text-slate-400 text-center">
            View generation metrics, quality trends, and URL validation stats.
          </p>
        </button>
      </div>

      <div className="flex items-center justify-center gap-6 text-xs text-slate-500 font-mono pt-8">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              apiKeyStatus.includes("Loaded") ||
              apiKeyStatus.includes("Auto") ||
              apiKeyStatus.includes("Cloud")
                ? "bg-green-500"
                : "bg-red-500"
            }`}
          ></div>
          <span
            className={
              apiKeyStatus.includes("Loaded") ||
              apiKeyStatus.includes("Auto") ||
              apiKeyStatus.includes("Cloud")
                ? "text-green-400"
                : "text-red-400"
            }
          >
            API Key: {apiKeyStatus}
          </span>
        </div>
        {(() => {
          const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "";
          const isProd = projectId.includes("prod");
          const envLabel = isProd ? "PROD" : "DEV";
          const dotColor = isProd ? "bg-red-500" : "bg-green-500";
          const textColor = isProd ? "text-red-400" : "text-green-400";
          return (
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isCloudReady ? dotColor : "bg-orange-500"
                } ${isCloudReady ? "animate-pulse" : ""}`}
              ></div>
              <span className={isCloudReady ? textColor : "text-orange-400"}>
                {isCloudReady ? `Cloud ${envLabel}` : "Local Mode"}
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  </div>
);

export default LandingPage;
