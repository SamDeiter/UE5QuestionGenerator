
import { useMemo, useState, useEffect } from 'react';
import { calculateMetrics } from '../utils/metricsUtils';
import { getAnalytics } from '../utils/analyticsStore';
import DistributionCharts from './analytics/DistributionCharts';
import TrendCharts from './analytics/TrendCharts';
import Icon from './Icon';
const MetricsDashboard = ({ questions }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [analyticsData, setAnalyticsData] = useState({ generations: [] });

    const metrics = useMemo(() => calculateMetrics(questions), [questions]);

    useEffect(() => {
        // Load analytics data for trends
        const data = getAnalytics();
        setAnalyticsData(data);
    }, [questions]); // Reload when questions change as it might indicate new generation

    if (!questions || questions.length === 0) return null;

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 mb-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Icon name="bar-chart-2" size={14} /> Database Metrics
                </h3>

                {/* Tab Navigation */}
                <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors ${activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('distributions')}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors ${activeTab === 'distributions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Distributions
                    </button>
                    <button
                        onClick={() => setActiveTab('trends')}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors ${activeTab === 'trends' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Trends
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[200px]">
                {activeTab === 'overview' && (
                    <div className="animate-in fade-in duration-300">
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
                )}

                {activeTab === 'distributions' && (
                    <div className="animate-in fade-in duration-300">
                        <DistributionCharts questions={questions} />
                    </div>
                )}

                {activeTab === 'trends' && (
                    <div className="animate-in fade-in duration-300">
                        <TrendCharts generations={analyticsData.generations} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetricsDashboard;
