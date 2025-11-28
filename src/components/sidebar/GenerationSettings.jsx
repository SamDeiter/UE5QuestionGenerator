import React from 'react';
import Icon from '../Icon';
import InfoTooltip from '../InfoTooltip';

const GenerationSettings = ({ config, handleChange, isOpen, onToggle }) => {
    return (
        <div className="mb-2">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Icon name="sliders" size={14} /> Generation Settings
                </h2>
                <button
                    onClick={onToggle}
                    className="text-slate-500 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
                    title={isOpen ? "Collapse Settings" : "Expand Settings"}
                >
                    <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={16} />
                </button>
            </div>

            {/* Body */}
            {isOpen && (
                <div className="space-y-6 animate-in slide-in-from-top-2 duration-200 mb-6">
                    {/* Discipline & Language */}
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <div className="flex items-center"><label className="text-xs font-bold uppercase text-slate-400">Discipline</label><InfoTooltip text="Topic focus" /></div>
                            <select name="discipline" value={config.discipline} onChange={handleChange} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm outline-none focus:border-orange-500">
                                <option value="Technical Art">Technical Art</option><option value="Animation & Rigging">Animation & Rigging</option><option value="Game Logic & Systems">Game Logic & Systems</option><option value="Look Development (Materials)">Look Development (Materials)</option><option value="Networking">Networking</option><option value="C++ Programming">C++ Programming</option><option value="VFX (Niagara)">VFX (Niagara)</option><option value="World Building & Level Design">World Building & Level Design</option><option value="Blueprints">Blueprints</option><option value="Lighting & Rendering">Lighting & Rendering</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center"><label className="text-xs font-bold uppercase text-slate-400">Language</label></div>
                            <select name="language" value={config.language} onChange={handleChange} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm outline-none focus:border-orange-500">
                                <option>English</option><option>Chinese (Simplified)</option><option>Japanese</option><option>Korean</option><option>Spanish</option><option>French</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center"><label className="text-xs font-bold uppercase text-slate-400">AI Model</label></div>
                        <select name="model" value={config.model || 'gemini-1.5-flash'} onChange={handleChange} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm outline-none focus:border-orange-500">
                            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</option>
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Smart)</option>
                            <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GenerationSettings;
