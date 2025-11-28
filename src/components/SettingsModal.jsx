import TokenUsageDisplay from './TokenUsageDisplay';
import { getTokenUsage } from '../utils/analyticsStore';

const SettingsModal = ({ showSettings, setShowSettings, config, handleChange, showApiKey, setShowApiKey, onClearData }) => {
    if (!showSettings) return null;

    const tokenUsage = getTokenUsage();

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Icon name="settings" /> Settings</h2>
                    <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white"><Icon name="x" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <TokenUsageDisplay tokenUsage={tokenUsage} />

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Google Gemini API Key</label>
                        <div className="relative">
                            <input
                                type={showApiKey ? "text" : "password"}
                                name="apiKey"
                                value={config.apiKey}
                                onChange={handleChange}
                                placeholder="AIzaSy..."
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none pr-10"
                            />
                            <button
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                <Icon name={showApiKey ? "eye-off" : "eye"} size={16} />
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Required for generating questions. Stored locally.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Google Apps Script URL</label>
                        <input
                            type="text"
                            name="sheetUrl"
                            value={config.sheetUrl}
                            onChange={handleChange}
                            placeholder="https://script.google.com/..."
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Required for Load/Export to Sheets.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Creator Name</label>
                            <input
                                type="text"
                                name="creatorName"
                                value={config.creatorName}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Reviewer Name</label>
                            <input
                                type="text"
                                name="reviewerName"
                                value={config.reviewerName}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-700 mt-4">
                        <button
                            onClick={onClearData}
                            className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs rounded border border-red-900/50 flex items-center justify-center gap-2 transition-colors"
                        >
                            <Icon name="trash" size={14} /> Clear Local Data & Reset App
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
