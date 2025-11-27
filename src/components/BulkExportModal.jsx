import React from 'react';
import Icon from './Icon';

import { LANGUAGE_FLAGS } from '../utils/constants';

const BulkExportModal = ({ onClose, onExport, questionCount }) => {
    const [exportOptions, setExportOptions] = React.useState({
        format: 'sheets',
        includeRejected: false,
        languages: ['English'],
        disciplines: 'all',
        scope: 'all',
        segmentFiles: false,
        limit: null
    });

    const availableLanguages = Object.keys(LANGUAGE_FLAGS);

    const handleLanguageToggle = (lang) => {
        setExportOptions(prev => ({
            ...prev,
            languages: prev.languages.includes(lang)
                ? prev.languages.filter(l => l !== lang)
                : [...prev.languages, lang]
        }));
    };

    const handleExport = () => {
        onExport(exportOptions);
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-2xl w-full p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-600 p-2 rounded-lg">
                                <Icon name="download" size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Bulk Export</h2>
                                <p className="text-xs text-slate-400">Export {questionCount} questions with custom options</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <Icon name="x" size={24} />
                        </button>
                    </div>

                    {/* Export Options */}
                    <div className="space-y-6">
                        {/* Scope Selection */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">1. Select Scope</label>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-3 p-3 rounded border border-slate-700 bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${exportOptions.scope === 'all' ? 'bg-green-600 border-green-500' : 'border-slate-600 bg-slate-900'}`}>
                                        {exportOptions.scope === 'all' && <Icon name="check" size={14} className="text-white" />}
                                    </div>
                                    <input type="radio" name="scope" className="hidden" checked={exportOptions.scope === 'all'} onChange={() => setExportOptions(prev => ({ ...prev, scope: 'all' }))} />
                                    <div>
                                        <span className="text-sm font-bold text-slate-200">All Questions</span>
                                        <p className="text-xs text-slate-500">Export everything in the database ({questionCount} questions)</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-3 rounded border border-slate-700 bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${exportOptions.scope === 'filtered' ? 'bg-green-600 border-green-500' : 'border-slate-600 bg-slate-900'}`}>
                                        {exportOptions.scope === 'filtered' && <Icon name="check" size={14} className="text-white" />}
                                    </div>
                                    <input type="radio" name="scope" className="hidden" checked={exportOptions.scope === 'filtered'} onChange={() => setExportOptions(prev => ({ ...prev, scope: 'filtered' }))} />
                                    <div>
                                        <span className="text-sm font-bold text-slate-200">Current Filtered View</span>
                                        <p className="text-xs text-slate-500">Export only questions currently visible in the list</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Format Selection */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">2. Select Format</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['sheets', 'csv', 'json', 'markdown'].map(fmt => (
                                    <label key={fmt} className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-all ${exportOptions.format === fmt ? 'bg-indigo-900/30 border-indigo-500' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}`}>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${exportOptions.format === fmt ? 'bg-indigo-500 border-indigo-400' : 'border-slate-600 bg-slate-900'}`}>
                                            {exportOptions.format === fmt && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        <input type="radio" name="format" className="hidden" checked={exportOptions.format === fmt} onChange={() => setExportOptions(prev => ({ ...prev, format: fmt }))} />
                                        <span className="text-sm font-bold text-slate-200 uppercase flex items-center gap-2">
                                            <Icon name={fmt === 'sheets' ? 'table' : fmt === 'json' ? 'code' : fmt === 'markdown' ? 'file-code' : 'file-text'} size={14} />
                                            {fmt === 'sheets' ? 'Google Sheets' : fmt}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {exportOptions.format === 'sheets' && (
                                <p className="text-xs text-amber-400 flex items-center gap-1 mt-2">
                                    <Icon name="alert-circle" size={12} />
                                    <span>Tip: If columns look wrong, delete the top header row in your Sheet and try again.</span>
                                </p>
                            )}
                        </div>

                        {/* Additional Options */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">3. Options</label>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/50 cursor-pointer">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${exportOptions.includeRejected ? 'bg-green-600 border-green-500' : 'border-slate-600 bg-slate-900'}`}>
                                        {exportOptions.includeRejected && <Icon name="check" size={14} className="text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={exportOptions.includeRejected} onChange={() => setExportOptions(prev => ({ ...prev, includeRejected: !prev.includeRejected }))} />
                                    <span className="text-sm text-slate-300">Include Rejected Questions</span>
                                </label>

                                {exportOptions.format === 'csv' && (
                                    <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/50 cursor-pointer">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${exportOptions.segmentFiles ? 'bg-green-600 border-green-500' : 'border-slate-600 bg-slate-900'}`}>
                                            {exportOptions.segmentFiles && <Icon name="check" size={14} className="text-white" />}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={exportOptions.segmentFiles} onChange={() => setExportOptions(prev => ({ ...prev, segmentFiles: !prev.segmentFiles }))} />
                                        <span className="text-sm text-slate-300">Segment Files (Separate by Language/Discipline)</span>
                                    </label>
                                )}

                                <div className="flex items-center gap-3 p-2">
                                    <div className="w-5 flex justify-center"><Icon name="hash" size={14} className="text-slate-500" /></div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-300">Limit to:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max={questionCount}
                                            placeholder="All"
                                            className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                                            value={exportOptions.limit || ''}
                                            onChange={(e) => setExportOptions(prev => ({ ...prev, limit: e.target.value ? parseInt(e.target.value) : null }))}
                                        />
                                        <span className="text-xs text-slate-500">questions</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Language Selection */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">4. Languages</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {availableLanguages.map(lang => (
                                    <label key={lang} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${exportOptions.languages.includes(lang) ? 'bg-slate-800 border-slate-600' : 'bg-slate-900/50 border-slate-800 opacity-60 hover:opacity-100'}`}>
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${exportOptions.languages.includes(lang) ? 'bg-indigo-600 border-indigo-500' : 'border-slate-600 bg-slate-900'}`}>
                                            {exportOptions.languages.includes(lang) && <Icon name="check" size={10} className="text-white" />}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={exportOptions.languages.includes(lang)} onChange={() => handleLanguageToggle(lang)} />
                                        <span className="text-xs font-medium text-slate-300">{LANGUAGE_FLAGS[lang]} {lang}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-slate-800">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={exportOptions.languages.length === 0}
                            className={`flex-1 py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${exportOptions.languages.length === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        >
                            <Icon name="download" size={16} />
                            Export {exportOptions.format.toUpperCase()}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BulkExportModal;
