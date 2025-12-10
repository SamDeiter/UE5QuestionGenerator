import { useState } from 'react';
import Icon from '../Icon';

const ProgressStats = ({ allQuestionsMap, totalApproved, TARGET_TOTAL, overallPercentage }) => {
    const [showProgress, setShowProgress] = useState(true);

    return (
        <div className="bg-slate-900 rounded-lg border border-slate-800 shadow-inner overflow-hidden">
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() => setShowProgress(!showProgress)}
            >
                <div className="flex items-center gap-2">
                    <Icon name="bar-chart-2" size={14} className="text-slate-400" />
                    <span className="text-xs font-bold uppercase text-slate-400">Progress</span>
                </div>
                <Icon name={showProgress ? "chevron-up" : "chevron-down"} size={14} className="text-slate-500" />
            </div>

            {showProgress && (
                <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="text-center pt-2">
                        <h3 className="text-xl font-extrabold text-white">{allQuestionsMap.size}</h3>
                        <p className="text-xs font-semibold uppercase text-slate-400">UNIQUE QUESTIONS IN DB</p>
                    </div>
                    <div className="border-t border-slate-800 pt-3 space-y-1">
                        <div className="flex justify-between items-end">
                            <h3 className="text-xs font-bold text-slate-300">APPROVED QUOTA ({totalApproved}/{TARGET_TOTAL})</h3>
                            <span className="text-xs font-bold text-orange-400">{overallPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-700">
                            <div className="h-full bg-orange-600 transition-all duration-500" style={{ width: `${overallPercentage}%` }}></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProgressStats;
