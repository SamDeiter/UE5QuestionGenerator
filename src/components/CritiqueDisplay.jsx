import React from 'react';
import Icon from './Icon';

const CritiqueDisplay = ({ critique }) => (
    <div className="mb-3 p-3 bg-red-950/30 border border-red-500/30 rounded-lg animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center gap-2 mb-2 text-red-300 text-xs font-bold uppercase">
            <Icon name="zap" size={12} /> AI Critique
        </div>
        <div className="text-xs text-slate-300 leading-relaxed space-y-1.5">
            {critique.split('\n').map((line, index) => {
                if (line.match(/^(\*|-|\d+\.)\s/)) {
                    return <p key={index} className="pl-3 text-red-100/80 indent-[-12px]">{line.trim()}</p>;
                }
                return <p key={index}>{line.trim()}</p>;
            })}
        </div>
    </div>
);

export default CritiqueDisplay;
