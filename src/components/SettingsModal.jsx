import Icon from "./Icon";
import TokenUsageDisplay from "./TokenUsageDisplay";
import TagManager from "./TagManager";
import { getTokenUsage, downloadTrainingData } from "../utils/analyticsStore";
import { UI_LABELS } from "../utils/constants";

const SettingsModal = ({
  showSettings,
  setShowSettings,
  config,
  handleChange,
  showApiKey,
  setShowApiKey,
  _onClearData,
  files,
  handleDetectTopics,
  isDetecting,
  fileInputRef,
  handleFileChange,
  removeFile,
  isApiReady,
  customTags,
  onSaveCustomTags,
  isAdmin, // Add isAdmin prop
}) => {
  if (!showSettings) return null;

  const tokenUsage = getTokenUsage();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Icon name="settings" className="text-slate-400" /> Settings
          </h2>
          <button
            onClick={() => setShowSettings(false)}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Close Settings"
          >
            <Icon name="x" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Token Usage Stats */}
          <TokenUsageDisplay tokenUsage={tokenUsage} />

          {/* Source Material */}
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Icon name="file-text" size={16} className="text-blue-400" />
              Source Material
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-xs font-bold uppercase text-slate-400">
                  Source Files
                </label>
                {files && files.length > 0 && (
                  <button
                    onClick={handleDetectTopics}
                    disabled={isDetecting || !isApiReady}
                    className="text-[10px] flex items-center gap-1 text-indigo-400 bg-indigo-900/50 px-2 py-1 rounded border border-indigo-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDetecting ? "..." : "Detect"}
                  </button>
                )}
              </div>
              <div
                onClick={() => fileInputRef?.current?.click()}
                className="border-2 border-dashed border-slate-700 rounded p-4 hover:bg-slate-900 cursor-pointer text-center bg-slate-900/50 transition-colors"
              >
                <Icon name="upload" className="mx-auto text-slate-600 mb-2" />
                <p className="text-xs text-slate-500">Upload .csv</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                />
              </div>
              {files &&
                files.map((f, i) => (
                  <div
                    key={i}
                    className="flex justify-between bg-slate-900 p-2 rounded border border-slate-800 text-xs text-slate-400"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-red-500 hover:text-red-400 transition-colors"
                    >
                      x
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* API Configuration */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                {UI_LABELS.API_KEY_LABEL}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  name="apiKey"
                  value={config.apiKey}
                  onChange={handleChange}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none pr-10 transition-all"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  aria-label={showApiKey ? "Hide API Key" : "Show API Key"}
                >
                  <Icon name={showApiKey ? "eye-off" : "eye"} size={16} />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Required for generating questions. Stored locally.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                {UI_LABELS.SHEET_URL_LABEL}
              </label>
              <input
                type="text"
                name="sheetUrl"
                value={config.sheetUrl}
                onChange={handleChange}
                placeholder="https://script.google.com/..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Required for Load/Export to Sheets.
              </p>
            </div>
          </div>

          {/* User Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Creator Name
              </label>
              <input
                type="text"
                name="creatorName"
                value={config.creatorName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Reviewer Name
              </label>
              <input
                type="text"
                name="reviewerName"
                value={config.reviewerName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Source Files */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold uppercase text-slate-500">
                Source Files (CSV)
              </label>
              {files && files.length > 0 && (
                <button
                  onClick={handleDetectTopics}
                  disabled={isDetecting || !isApiReady}
                  className="text-[10px] flex items-center gap-1 text-indigo-400 bg-indigo-900/50 px-2 py-1 rounded border border-indigo-700/50 disabled:opacity-50"
                >
                  {isDetecting ? "..." : "Detect Topics"}
                </button>
              )}
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 rounded p-4 hover:bg-slate-800 cursor-pointer text-center bg-slate-800/50 transition-colors"
            >
              <Icon name="upload" className="mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">Click to upload .csv</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                className="hidden"
              />
            </div>
            {files &&
              files.map((f, i) => (
                <div
                  key={i}
                  className="flex justify-between bg-slate-800 p-2 rounded border border-slate-700 text-xs text-slate-400"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-red-500 hover:text-red-400"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              ))}
          </div>

          {/* Custom Tags Management */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Icon name="tag" size={16} className="text-orange-400" />
              Custom Tags
            </h3>
            <p className="text-xs text-slate-500">
              Create custom tags to focus question generation on specific topics
              within each discipline.
            </p>
            <TagManager
              discipline={config.discipline}
              customTags={customTags || {}}
              onSaveCustomTags={onSaveCustomTags}
            />
          </div>

          {/* Advanced: Vertex AI Data & Danger Zone (Admin Only) */}
          {isAdmin && (
            <>
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                  <Icon name="database" size={16} className="text-purple-400" />
                  Vertex AI Training Data
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => downloadTrainingData(true)}
                    className="flex-1 px-3 py-2 bg-purple-900/30 hover:bg-purple-900/50 text-purple-200 text-xs font-bold rounded border border-purple-700/50 transition-colors flex items-center justify-center gap-2"
                    title="Download questions with >75% score"
                  >
                    <Icon name="download" size={14} />
                    Download Good Data
                  </button>
                  <button
                    onClick={() => downloadTrainingData(false)}
                    className="flex-1 px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 text-slate-400 text-xs font-bold rounded border border-slate-600/50 transition-colors flex items-center justify-center gap-2"
                    title="Download questions with <75% score"
                  >
                    <Icon name="download" size={14} />
                    Download Bad Data
                  </button>
                </div>
                <button
                  onClick={() => {
                    const count = downloadTrainingData("all");
                    alert(`Exported ${count} total questions for training`);
                  }}
                  className="w-full mt-2 px-3 py-2 bg-blue-900/20 hover:bg-blue-900/30 text-blue-400 rounded flex items-center justify-center gap-2 transition-colors text-xs font-bold border border-blue-900/30"
                  title="Download all questions"
                >
                  <Icon name="download" size={14} />
                  Export All Training Data
                </button>
                <p className="text-[10px] text-slate-500 mt-2 text-center">
                  Exports JSONL format for Vertex AI fine-tuning.
                </p>
              </div>

              {/* Environment Info */}
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                  <Icon name="server" size={16} className="text-cyan-400" />
                  Environment Info
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Firebase Project:</span>
                    <span className="text-slate-300 font-mono">
                      {import.meta.env.VITE_FIREBASE_PROJECT_ID || "Not Set"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Environment:</span>
                    <span
                      className={`font-bold ${
                        import.meta.env.VITE_FIREBASE_PROJECT_ID?.includes(
                          "prod"
                        )
                          ? "text-red-400"
                          : "text-green-400"
                      }`}
                    >
                      {import.meta.env.VITE_FIREBASE_PROJECT_ID?.includes(
                        "prod"
                      )
                        ? "🔴 PRODUCTION"
                        : "🟢 DEVELOPMENT"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">API Mode:</span>
                    <span className="text-cyan-400">Cloud Functions</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("npm run dev:dev");
                      alert(
                        "Copied! Paste in terminal to switch to DEV environment."
                      );
                    }}
                    className="flex-1 px-2 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-300 text-xs font-bold rounded border border-green-700/50 transition-colors flex items-center justify-center gap-1"
                  >
                    <Icon name="clipboard" size={12} />
                    Switch to DEV
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("npm run dev:prod");
                      alert(
                        "Copied! Paste in terminal to switch to PROD environment."
                      );
                    }}
                    className="flex-1 px-2 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-300 text-xs font-bold rounded border border-red-700/50 transition-colors flex items-center justify-center gap-1"
                  >
                    <Icon name="clipboard" size={12} />
                    Switch to PROD
                  </button>
                </div>
              </div>

              {/* API Key Management */}
              <div className="bg-amber-900/20 p-4 rounded-lg border border-amber-700/30">
                <h3 className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
                  <Icon name="key" size={16} />
                  Gemini API Key Management
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  API keys are stored securely in Firebase Secrets. Use these
                  commands in PowerShell:
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const projectId =
                        import.meta.env.VITE_FIREBASE_PROJECT_ID ||
                        "ue5-questions-prod";
                      const cmd = `firebase functions:secrets:set GEMINI_API_KEY --project ${projectId}`;
                      navigator.clipboard.writeText(cmd);
                      alert(
                        "Command copied! Paste in PowerShell, then enter your new API key when prompted."
                      );
                    }}
                    className="w-full px-3 py-2 bg-amber-900/30 hover:bg-amber-900/50 text-amber-200 text-xs font-bold rounded border border-amber-700/50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon name="clipboard" size={14} />
                    Copy: Update API Key Command
                  </button>
                  <button
                    onClick={() => {
                      const projectId =
                        import.meta.env.VITE_FIREBASE_PROJECT_ID ||
                        "ue5-questions-prod";
                      const cmd = `firebase deploy --only functions --project ${projectId}`;
                      navigator.clipboard.writeText(cmd);
                      alert("Command copied! Run after updating the API key.");
                    }}
                    className="w-full px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 text-xs font-bold rounded border border-slate-600/50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon name="clipboard" size={14} />
                    Copy: Redeploy Functions Command
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 text-center">
                  After updating, wait 1-2 min for functions to restart.
                </p>
              </div>

              {/* DANGER ZONE - Link to separate modal */}
              <div className="bg-red-900/10 p-4 rounded-lg border border-red-900/30">
                <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                  <Icon name="alert-triangle" size={16} />
                  Data Management
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  For destructive operations (clear data, factory reset), use
                  the Danger Zone.
                </p>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    // Signal parent to open DangerZoneModal
                    if (window.openDangerZone) window.openDangerZone();
                  }}
                  className="w-full px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 text-sm font-bold rounded border border-red-900/50 transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="alert-triangle" size={16} />
                  Open Danger Zone
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
