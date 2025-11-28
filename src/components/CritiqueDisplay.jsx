import React from 'react';
import Icon from './Icon';

const CritiqueDisplay = ({ critique, onRewrite, isProcessing }) => {
    if (!critique) return null;

    // Handle both old (string) and new (object with score) formats
    const isNewFormat = typeof critique === 'object' && critique.score !== undefined;
    const score = isNewFormat ? critique.score : null;
    const text = isNewFormat ? critique.text : critique;

    // Color coding based on score
    const getScoreColor = (score) => {
        if (score >= 90) return 'bg-green-900/30 border-green-700/50 text-green-300';
        if (score >= 70) return 'bg-yellow-900/30 border-yellow-700/50 text-yellow-300';
        if (score >= 50) return 'bg-orange-900/30 border-orange-700/50 text-orange-300';
        return 'bg-red-900/30 border-red-700/50 text-red-300';
    };

    return (
        <div className={`mb-3 p-3 border rounded-lg animate-in fade-in slide-in-from-top-2 ${isNewFormat ? getScoreColor(score) : 'bg-red-950/30 border-red-500/30'}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase">
                    <Icon name="zap" size={12} />
                    AI Critique
                </div>
                <div className="flex items-center gap-2">
                    {isNewFormat && (
                        <div className="px-2 py-1 rounded bg-black/30 border border-current">
                            <span className="text-xs font-bold">Score: {score}/100</span>
                        </div>
                    )}
                    {onRewrite && (
                        <button
                            onClick={onRewrite}
                            disabled={isProcessing}
                            className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Auto-rewrite this question based on critique"
                        >
                            <Icon name="edit" size={12} />
                            {isProcessing ? 'Rewriting...' : 'Rewrite'}
                        </button>
                    )}
                </div>
            </div>
            <div className="text-xs text-slate-300 leading-relaxed space-y-1.5">
                {text.split('\n').map((line, index) => {
                    if (line.match(/^(\*|-|\d+\.)\s/)) {
                        return <p key={index} className="pl-3 text-current opacity-80 indent-[-12px]">{line.trim()}</p>;
                    }
                    return <p key={index}>{line.trim()}</p>;
                })}
            </div>
        </div>
    );
};

export default CritiqueDisplay;
