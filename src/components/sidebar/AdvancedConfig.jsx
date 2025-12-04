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


                </div>
            )}
        </>
    );
};

export default AdvancedConfig;
