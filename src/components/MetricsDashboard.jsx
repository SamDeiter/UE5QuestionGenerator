import React, { useMemo } from 'react';
import { calculateMetrics } from '../utils/metricsUtils';

const MetricsDashboard = ({ questions }) => {
    const metrics = useMemo(() => calculateMetrics(questions), [questions]);

    if (!questions || questions.length === 0) return null;

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 mb-4 animate-in fade-in slide-in-from-top-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Database Metrics</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-800 p-3 rounded border border-slate-700">
                    <div className="text-2xl font-bold text-white">{metrics.total}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Total Questions</div>
                </div>
                <div className="bg-slate-800 p-3 rounded border border-slate-700">
                    <div className="text-2xl font-bold text-indigo-400">{metrics.avgQuality}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Avg Quality</div>
                </div>
                <div className="bg-slate-800 p-3 rounded border border-slate-700">
                    <div className="text-2xl font-bold text-emerald-400">{metrics.byType['Multiple Choice']}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Multiple Choice</div>
                </div>
                <div className="bg-slate-800 p-3 rounded border border-slate-700">
                    <div className="text-2xl font-bold text-blue-400">{metrics.byType['True/False']}</div>
                    <div className="text-[10px] text-slate-400 uppercase">True/False</div>
                </div>
            </div>

            <div className="space-y-3">
                <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1 uppercase font-bold">
                        <span>Difficulty Distribution</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
                        <div className="bg-green-500" style={{ width: `${(metrics.byDifficulty.Easy / metrics.total) * 100}%` }} title={`Easy: ${metrics.byDifficulty.Easy}`}></div>
                        <div className="bg-yellow-500" style={{ width: `${(metrics.byDifficulty.Medium / metrics.total) * 100}%` }} title={`Medium: ${metrics.byDifficulty.Medium}`}></div>
                        <div className="bg-red-500" style={{ width: `${(metrics.byDifficulty.Hard / metrics.total) * 100}%` }} title={`Hard: ${metrics.byDifficulty.Hard}`}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Easy</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Medium</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Hard</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MetricsDashboard;
