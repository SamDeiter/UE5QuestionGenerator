import React, { useState } from 'react';
import { listModels } from '../../services/gemini';
import Icon from '../Icon';
import InfoTooltip from '../InfoTooltip';
import { getMergedTags } from '../../utils/tagTaxonomy';

/**
 * GenerationSettings - Configuration panel with progressive disclosure
 * Basic settings always visible, Advanced collapsed by default
 */
const GenerationSettings = ({ config, handleChange, customTags = {}, isOpen, onToggle, allQuestionsMap = {} }) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const availableTags = getMergedTags(config.discipline, customTags);

    // Compute counts for each tag to show coverage
    const tagCounts = React.useMemo(() => {
        const counts = {};
        availableTags.forEach(tag => counts[tag] = 0);
        Object.values(allQuestionsMap).forEach(question => {
            if (question.tags && Array.isArray(question.tags)) {
                question.tags.forEach(t => {
                    const normalizedTag = t.startsWith('#') ? t : `#${t}`;
                    const match = availableTags.find(at => at.toLowerCase() === normalizedTag.toLowerCase());
                    if (match) counts[match] = (counts[match] || 0) + 1;
                });
            }
        });
        return counts;
    }, [allQuestionsMap, availableTags]);

    // Auto-expand Focus & Model if tags are selected or custom model is used
    React.useEffect(() => {
        if ((config.tags?.length > 0 || config.model !== 'gemini-2.0-flash') && !showAdvanced) {
            setShowAdvanced(true);
        }
    }, [config.tags?.length, config.model, showAdvanced]);

    const toggleTag = (tag) => {
        const currentTags = config.tags || [];
        const newTags = currentTags.includes(tag) 
            ? currentTags.filter(t => t !== tag) 
            : [...currentTags, tag];
        handleChange({ target: { name: 'tags', value: newTags } });
    };

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

            {isOpen && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200 mb-6">
                    
                    {/* ═══════════════════════════════════════════════════════════════
                       BASIC SETTINGS - Always visible
                       ═══════════════════════════════════════════════════════════════ */}
                    <div className="space-y-3 p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                        <h3 className="text-[10px] font-bold uppercase text-green-400 tracking-wider flex items-center gap-1">
                            <Icon name="check-circle" size={12} /> Basic Settings
                        </h3>
                        
                        {/* Discipline Selector */}
                        <div className="space-y-1">
                            <div className="flex items-center">
                                <label className="text-xs font-bold uppercase text-slate-400">Discipline</label>
                                <InfoTooltip text="Topic focus for question generation" />
                            </div>
                            <select 
                                name="discipline" 
                                data-tour="discipline-selector" 
                                value={config.discipline} 
                                onChange={handleChange} 
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm outline-none focus:border-orange-500"
                            >
                                <option value="Technical Art">Technical Art</option>
                                <option value="Animation & Rigging">Animation & Rigging</option>
                                <option value="Game Logic & Systems">Game Logic & Systems</option>
                                <option value="Look Development (Materials)">Look Development (Materials)</option>
                                <option value="Networking">Networking</option>
                                <option value="C++ Programming">C++ Programming</option>
                                <option value="VFX (Niagara)">VFX (Niagara)</option>
                                <option value="World Building & Level Design">World Building & Level Design</option>
                                <option value="Blueprints">Blueprints</option>
                                <option value="Lighting & Rendering">Lighting & Rendering</option>
                            </select>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════
                       FOCUS & MODEL SETTINGS - Collapsed by default
                       ═══════════════════════════════════════════════════════════════ */}
                    <div className="border border-slate-700 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
                        >
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                <Icon name="settings" size={12} /> Focus & Model
                                {(config.tags?.length > 0 || config.model !== 'gemini-2.0-flash') && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-[9px]">
                                        {config.tags?.length > 0 ? `${config.tags.length} TAGS` : ''} 
                                        {config.tags?.length > 0 && config.model !== 'gemini-2.0-flash' ? ' + ' : ''}
                                        {config.model !== 'gemini-2.0-flash' ? 'CUSTOM' : ''}
                                    </span>
                                )}
                            </span>
                            <Icon 
                                name={showAdvanced ? "chevron-up" : "chevron-down"} 
                                size={14} 
                                className="text-slate-500"
                            />
                        </button>

                        {showAdvanced && (
                            <div className="p-3 space-y-4 bg-slate-900/30 animate-in slide-in-from-top-1 duration-150">
                                
                                {/* Focus Tags */}
                                {availableTags.length > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold uppercase text-slate-400">Focus Tags</label>
                                            <span className="text-[10px] text-slate-500">{config.tags?.length || 0} selected</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                            {availableTags.map(tag => {
                                                const isSelected = (config.tags || []).includes(tag);
                                                const count = tagCounts[tag] || 0;
                                                const countColor = count === 0 ? 'text-slate-500' : (count >= 5 ? 'text-green-400 font-bold' : 'text-orange-300');

                                                return (
                                                    <button
                                                        key={tag}
                                                        onClick={() => toggleTag(tag)}
                                                        className={`text-[10px] pl-2 pr-1.5 py-1 rounded border transition-all flex items-center gap-1 ${isSelected
                                                            ? 'bg-orange-500/20 border-orange-500 text-orange-200 hover:bg-orange-500/30'
                                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                                                        }`}
                                                    >
                                                        <span>{tag}</span>
                                                        <span className={`text-[9px] bg-slate-950/50 px-1 rounded ml-1 ${countColor}`}>
                                                            {count}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* AI Model Selection */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-slate-400">AI Model</label>
                                    <select 
                                        name="model" 
                                        value={config.model || 'gemini-2.0-flash'} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm outline-none focus:border-orange-500"
                                    >
                                        <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</option>
                                        <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Experimental</option>
                                    </select>
                                    <button
                                        onClick={async () => {
                                            if (!config.apiKey) { alert('Please enter an API key first'); return; }
                                            const models = await listModels(config.apiKey);
                                            alert(`Available Models:\n${models.join('\n')}`);
                                        }}
                                        className="text-[10px] text-indigo-400 hover:text-indigo-300 underline mt-1"
                                    >
                                        Check Available Models
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GenerationSettings;

