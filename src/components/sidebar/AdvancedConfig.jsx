import React from 'react';
import Icon from '../Icon';
import InfoTooltip from '../InfoTooltip';

const AdvancedConfig = ({
    isOpen, onToggle,
    files, handleDetectTopics, isDetecting, fileInputRef, handleFileChange, removeFile,
    config, handleChange,
    apiKeyStatus, showApiError, isApiReady,
    handleLoadFromSheets, handleExportToSheets, isProcessing
}) => {
    return (
        <>
            <div className="pt-4 border-t border-slate-800">
                <button
                    onClick={onToggle}
                    className="w-full flex items-center justify-between text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors"
                >
                    <span>Advanced Configuration</span>
                    <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={14} />
                </button>
            </div>

            {isOpen && (
                <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">
                    {/* Source Files */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end"><label className="text-xs font-bold uppercase text-slate-400">Source Files</label>{files.length > 0 && <button onClick={handleDetectTopics} disabled={isDetecting || !isApiReady} className="text-[10px] flex items-center gap-1 text-indigo-400 bg-indigo-900/50 px-2 py-1 rounded border border-indigo-700/50">{isDetecting ? "..." : "Detect"}</button>}</div>
                        <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-700 rounded p-4 hover:bg-slate-900 cursor-pointer text-center bg-slate-900/50"><Icon name="upload" className="mx-auto text-slate-600 mb-2" /><p className="text-xs text-slate-500">Upload .csv</p><input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" /></div>
                        {files.map((f, i) => <div key={i} className="flex justify-between bg-slate-900 p-2 rounded border border-slate-800 text-xs text-slate-400"><span className="truncate">{f.name}</span><button onClick={() => removeFile(i)} className="text-red-500">x</button></div>)}
                    </div>

                    {/* API Key Configuration */}
                    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 shadow-inner space-y-2">
                        <div className="flex items-center">
                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                <Icon name="key" size={12} /> Gemini API Key
                            </label>
                            <InfoTooltip text="Enter your personal Gemini API key here. Required if running outside the Canvas environment." />
                        </div>
                        <input
                            type="password"
                            name="apiKey"
                            value={config.apiKey}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-orange-500"
                            placeholder="Enter your key..."
                        />
                        <div className={`text-xs font-mono text-right ${apiKeyStatus.includes('Loaded') || apiKeyStatus.includes('Auto') ? 'text-green-500' : 'text-red-500'}`}>
                            {apiKeyStatus}
                        </div>
                        {showApiError && (
                            <div className="text-xs text-red-500 font-bold animate-pulse mt-1 flex items-center gap-1">
                                <Icon name="alert-circle" size={12} /> API Key is required to generate.
                            </div>
                        )}
                    </div>

                    {/* Google Sheets URL Configuration */}
                    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 shadow-inner space-y-2">
                        <div className="flex items-center">
                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                <Icon name="table" size={12} /> Google Sheets App URL
                            </label>
                            <InfoTooltip text="Enter the Web App URL of your Google Apps Script deployment." />
                        </div>
                        <input
                            type="text"
                            name="sheetUrl"
                            value={config.sheetUrl}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-orange-500"
                            placeholder="https://script.google.com/..."
                        />
                        <div className="flex gap-2 mt-2">
                            <button onClick={handleLoadFromSheets} disabled={!config.sheetUrl || isProcessing} className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 text-xs rounded border border-slate-600 text-slate-300">Load</button>
                            <button onClick={handleExportToSheets} disabled={!config.sheetUrl || isProcessing} className="flex-1 py-1 px-2 bg-green-900/50 hover:bg-green-800/50 text-xs rounded border border-green-700 text-green-400">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdvancedConfig;
