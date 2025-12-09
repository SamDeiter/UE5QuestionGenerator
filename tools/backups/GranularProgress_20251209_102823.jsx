import React from 'react';
import Icon from './Icon';

const GranularProgress = ({ approvedCounts, target, isTargetMet, selectedDifficulty, handleSelectCategory }) => {
    const categories = ['Easy MC', 'Easy T/F', 'Medium MC', 'Medium T/F', 'Hard MC', 'Hard T/F'].map(key => {
        const current = approvedCounts[key] || 0;
        const hardTarget = 33;
        const remaining = Math.max(0, hardTarget - current);
        const isComplete = current >= hardTarget;
        const isSelected = key === selectedDifficulty;
        const isDisabled = isComplete;

        let barColor = 'bg-slate-800';
        if (isComplete) barColor = 'bg-blue-600';
        else if (isSelected) barColor = 'bg-orange-600';
        else if (current > 0) barColor = 'bg-green-600';

        const percentage = Math.min(100, (current / hardTarget) * 100);

        const handleClick = () => {
            handleSelectCategory(key);
        };

        return (
            <div
                key={key}
                onClick={handleClick}
                className={`p-2 rounded transition-all cursor-pointer border ${isSelected ? 'bg-slate-800 border-orange-600 shadow-lg' : 'bg-slate-900 border-slate-800 hover:bg-slate-800/70'} ${isDisabled ? 'opacity-75' : ''}`}
            >
                <div className="flex justify-between items-center text-xs mb-1">
                    <span className={`font-semibold ${isComplete ? 'text-blue-300' : 'text-slate-200'}`}>{key}</span>
                    <span className={`text-[10px] font-bold ${isComplete ? 'text-blue-400' : 'text-slate-400'}`}>
                        {current} / {hardTarget} ({remaining} left)
                    </span>
                </div>
                <div className="w-full h-1.5 rounded overflow-hidden bg-slate-700">
                    <div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${percentage}%` }}></div>
                </div>
            </div>
        );
    });

    const isBalancedSelected = selectedDifficulty === 'Balanced All';
    return (
        <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2 border-b border-slate-700/50 pb-1.5 mb-1"><Icon name="list-checks" size={14} /> Generation Target (Cap: 33)</h3>
            {categories}
            <button onClick={() => handleSelectCategory('Balanced All')} className={`w-full p-2 rounded transition-all cursor-pointer border mt-3 ${isBalancedSelected ? 'bg-orange-600 border-orange-400 shadow-lg' : 'bg-slate-800 border-slate-700 hover:bg-slate-700/50'}`}>
                <div className="flex justify-center items-center text-sm font-bold gap-2">
                    <Icon name="archive" size={14} /> VIEW ALL/BULK EXPORT
                </div>
            </button>
        </div>
    );
};

export default GranularProgress;
