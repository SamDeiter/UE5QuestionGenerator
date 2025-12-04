import React, { useState } from 'react';
import Icon from './Icon';
import TokenUsageDisplay from './TokenUsageDisplay';
import { getTokenUsage, downloadTrainingData } from '../utils/analyticsStore';
import { UI_LABELS } from '../utils/constants';
import { clearQuestionsFromSheets } from '../services/googleSheets';
import { clearAllQuestionsFromFirestore } from '../services/firebase';

const SettingsModal = ({
    showSettings, setShowSettings,
    config, handleChange,
    showApiKey, setShowApiKey,
    onClearData,
    files, handleDetectTopics, isDetecting, fileInputRef, handleFileChange, removeFile, isApiReady
}) => {
    const [isResetting, setIsResetting] = useState(false);

    if (!showSettings) return null;

    const tokenUsage = getTokenUsage();

    const handleFactoryReset = async () => {
        const firstConfirm = window.confirm(
            "⚠️ FACTORY RESET ⚠️\n\n" +
            "This will PERMANENTLY DELETE ALL data from:\n" +
            "• Google Spreadsheet (all Master_ sheets)\n" +
            "• Firestore Database (cloud)\n" +
            "• Local storage (questions, settings, analytics)\n\n" +
            "This action CANNOT be undone. Continue?"
        );

        if (!firstConfirm) return;

        const typed = window.prompt("Type DELETE to confirm permanent deletion of ALL data:");
        if (typed !== "DELETE") {
            alert("Factory reset cancelled. You did not type 'DELETE'.");
            return;
        }

        setIsResetting(true);

        try {
            // 1. Clear Google Spreadsheet
            if (config.sheetUrl) {
                clearQuestionsFromSheets(config.sheetUrl);
            }

            // 2. Clear Firestore
            const deletedCount = await clearAllQuestionsFromFirestore();
            console.log(`Deleted ${deletedCount} questions from Firestore`);

            // 3. Clear localStorage
            localStorage.clear();

            // 4. Reload the page
            alert(`Factory Reset Complete!\n\n• Firestore: ${deletedCount} questions deleted\n• Spreadsheet: Clearing in new tab\n• Local Storage: Cleared\n\nPage will reload.`);
            window.location.reload();
        } catch (error) {
            console.error("Factory reset error:", error);
            alert("Error during factory reset: " + error.message);
            setIsResetting(false);
        }
    };

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
                            <p className="text-[10px] text-slate-500 mt-1">Required for generating questions. Stored locally.</p>
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
                            <p className="text-[10px] text-slate-500 mt-1">Required for Load/Export to Sheets.</p>
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Creator Name</label>
                            <input
                                type="text"
                                name="creatorName"
                                value={config.creatorName}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Reviewer Name</label>
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
                            <label className="text-xs font-bold uppercase text-slate-500">Source Files (CSV)</label>
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
                        {files && files.map((f, i) => (
                            <div key={i} className="flex justify-between bg-slate-800 p-2 rounded border border-slate-700 text-xs text-slate-400">
                                <span className="truncate">{f.name}</span>
                                <button onClick={() => removeFile(i)} className="text-red-500 hover:text-red-400">
                                    <Icon name="x" size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Advanced: Vertex AI Data */}
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
                                const count = downloadTrainingData('all');
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

                    {/* DANGER ZONE */}
                    <div className="bg-red-900/10 p-4 rounded-lg border border-red-900/30">
                        <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                            <Icon name="alert-triangle" size={16} />
                            Danger Zone
                        </h3>
                        <button
                            onClick={onClearData}
                            className="w-full px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 text-sm font-bold rounded border border-red-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                            <Icon name="trash-2" size={16} />
                            {UI_LABELS.CLEAR_DATA_BTN}
                        </button>

                        <button
                            onClick={handleFactoryReset}
                            disabled={isResetting}
                            className="w-full mt-3 px-4 py-2 bg-red-950 hover:bg-red-900 text-red-500 text-sm font-bold rounded border border-red-900/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isResetting ? (
                                <><Icon name="loader" size={16} className="animate-spin" /> Resetting...</>
                            ) : (
                                <><Icon name="bomb" size={16} /> Factory Reset (Nuke Everything)</>
                            )}
                        </button>
                        <p className="text-[10px] text-red-400/70 mt-2 text-center">
                            Deletes ALL data: Spreadsheet + Firestore + Local Storage
                        </p>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default SettingsModal;
