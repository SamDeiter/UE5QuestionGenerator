import React from 'react';
import Icon from '../Icon';

const CreativitySettings = ({ config, handleChange }) => {
    const getTempLabel = (val) => {
        if (val < 0.3) return { text: "Strict", color: "text-blue-400" };
        if (val > 0.7) return { text: "Wild", color: "text-orange-400" };
        return { text: "Balanced", color: "text-slate-400" };
    };

    const tempLabel = getTempLabel(config.temperature);

    return (
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 shadow-inner">
            <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <Icon name="thermometer" size={12} /> Creativity
                </label>
                <span className={`text-xs font-bold uppercase ${tempLabel.color}`}>{tempLabel.text} ({config.temperature})</span>
            </div>
            <input
                type="range"
                min="0" max="1" step="0.1"
                name="temperature"
                value={config.temperature || 0.2}
                onChange={handleChange}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono uppercase">
                <span>Strict</span>
                <span>Balanced</span>
                <span>Wild</span>
            </div>
        </div>
    );
};

export default CreativitySettings;
