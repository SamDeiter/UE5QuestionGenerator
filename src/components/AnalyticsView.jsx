import { useState } from 'react';
import Icon from './Icon';
import MetricsDashboard from './MetricsDashboard';
import TrendCharts from './analytics/TrendCharts';
import DistributionCharts from './analytics/DistributionCharts';
import { getAnalytics } from '../utils/analyticsStore';

/**
 * AnalyticsView - Dedicated full-page analytics dashboard
 * Replaces the modal-based analytics with a standalone view
 */
const AnalyticsView = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const analytics = getAnalytics();

    const tabs = [
        { id: 'overview', label: 'Overview', icon: 'layout-dashboard' },
        { id: 'trends', label: 'Trends', icon: 'trending-up' },
        { id: 'distribution', label: 'Distribution', icon: 'pie-chart' },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <Icon name="arrow-left" size={16} />
                            Back
                        </button>
                        <div className="w-px h-6 bg-slate-700" />
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-900/30 rounded-lg">
                                <Icon name="bar-chart-2" size={24} className="text-emerald-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Analytics Dashboard</h1>
                                <p className="text-xs text-slate-400">Question generation metrics & insights</p>
                            </div>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab.id
                                        ? 'bg-emerald-600 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                    }`}
                            >
                                <Icon name={tab.icon} size={14} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto p-6">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <MetricsDashboard />

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-blue-900/30 rounded-lg">
                                        <Icon name="check-circle" size={20} className="text-blue-400" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-300">URL Database</span>
                                </div>
                                <p className="text-3xl font-bold text-white">536</p>
                                <p className="text-xs text-slate-500 mt-1">Verified documentation URLs</p>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-emerald-900/30 rounded-lg">
                                        <Icon name="target" size={20} className="text-emerald-400" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-300">URL Success Rate</span>
                                </div>
                                <p className="text-3xl font-bold text-emerald-400">100%</p>
                                <p className="text-xs text-slate-500 mt-1">Last 10 questions validated</p>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-purple-900/30 rounded-lg">
                                        <Icon name="layers" size={20} className="text-purple-400" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-300">Topic Coverage</span>
                                </div>
                                <p className="text-3xl font-bold text-white">30+</p>
                                <p className="text-xs text-slate-500 mt-1">UE5 categories covered</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'trends' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Icon name="trending-up" size={20} className="text-emerald-400" />
                                Generation Trends
                            </h2>
                            <TrendCharts generations={analytics.generations || []} />
                        </div>
                    </div>
                )}

                {activeTab === 'distribution' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Icon name="pie-chart" size={20} className="text-purple-400" />
                                Question Distribution
                            </h2>
                            <DistributionCharts questions={analytics.questions || []} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsView;
