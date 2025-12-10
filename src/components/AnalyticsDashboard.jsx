import { useState, useMemo } from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip
} from 'recharts';
import { format } from 'date-fns';
import { BarChart2, Download, X, Activity, TrendingUp, PieChart } from 'lucide-react';
import { getAnalytics } from '../utils/analyticsStore';
import { TAGS_BY_DISCIPLINE } from '../utils/tagTaxonomy';

const MetricCard = ({ title, value, icon, color }) => {
    const colors = {
        blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    };

    return (
        <div className={`p-4 rounded-xl border ${colors[color]} flex items-center justify-between`}>
            <div>
                <p className="text-xs font-medium opacity-80 uppercase tracking-wider">{title}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-lg bg-slate-900/50`}>
                {icon}
            </div>
        </div>
    );
};

const AnalyticsDashboard = ({ isOpen, onClose }) => {
    const [timeRange, setTimeRange] = useState('7d'); // 24h, 7d, 14d, 30d, all

    // Re-fetch analytics data whenever modal opens (removes useMemo dependency issue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const allAnalyticsData = isOpen ? getAnalytics() : { generations: [], questions: [], summary: {} };

    // Filter data based on time range
    const analyticsData = useMemo(() => {
        if (!isOpen || timeRange === 'all') return allAnalyticsData;

        const now = new Date();
        let cutoffDate;

        switch (timeRange) {
            case '24h':
                cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '14d':
                cutoffDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                return allAnalyticsData;
        }

        return {
            generations: allAnalyticsData.generations.filter(g =>
                new Date(g.timestamp) >= cutoffDate
            ),
            questions: allAnalyticsData.questions.filter(q =>
                new Date(q.created) >= cutoffDate
            ),
            summary: allAnalyticsData.summary // Keep overall summary
        };
    }, [isOpen, timeRange, allAnalyticsData]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <BarChart2 className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Analytics Dashboard</h2>
                            <p className="text-xs text-slate-400">Track generation performance and costs</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-slate-300 text-sm rounded px-3 py-1.5 outline-none focus:border-indigo-500"
                        >
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="14d">Last 14 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="all">All Time</option>
                        </select>

                        <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded border border-slate-700 transition-colors">
                            <Download size={14} />
                            Export CSV
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Total Questions"
                            value={analyticsData.summary?.totalQuestions || 0}
                            icon={<Activity size={18} />}
                            color="blue"
                        />
                        <MetricCard
                            title="Success Rate"
                            value={`${Math.round((analyticsData.generations.filter(g => g.success).length / (analyticsData.summary?.totalGenerations || 1)) * 100)}%`}
                            icon={<TrendingUp size={18} />}
                            color="green"
                        />
                        <MetricCard
                            title="Est. Cost"
                            value={`$${(analyticsData.summary?.estimatedCost || 0).toFixed(4)}`}
                            icon={<PieChart size={18} />}
                            color="orange"
                        />
                        <MetricCard
                            title="Avg Quality"
                            value={`${analyticsData.summary?.averageQuality || 0}/100`}
                            icon={<BarChart2 size={18} />}
                            color="purple"
                        />
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Token Usage Chart */}
                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 h-80 flex flex-col min-w-0">
                            <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                                <Activity size={16} /> Token Usage History
                            </h3>
                            <div className="flex-1 min-h-0 w-full" style={{ minHeight: 200 }}>
                                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={200}>
                                    <AreaChart data={analyticsData.generations.slice(-20)}>
                                        <defs>
                                            <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis dataKey="timestamp" tickFormatter={(t) => format(new Date(t), 'MM/dd')} stroke="#475569" fontSize={10} />
                                        <YAxis stroke="#475569" fontSize={10} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                                            labelFormatter={(t) => format(new Date(t), 'PP pp')}
                                        />
                                        <Area type="monotone" dataKey="tokensUsed.input" stackId="1" stroke="#818cf8" fill="url(#colorTokens)" name="Input Tokens" />
                                        <Area type="monotone" dataKey="tokensUsed.output" stackId="1" stroke="#34d399" fill="#34d399" name="Output Tokens" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Quality Distribution */}
                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 h-80 flex flex-col min-w-0">
                            <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                                <BarChart2 size={16} /> Quality Score Distribution
                            </h3>
                            <div className="flex-1 min-h-0 w-full" style={{ minHeight: 200 }}>
                                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={200}>
                                    <BarChart data={[
                                        { range: '90-100', count: analyticsData.questions.filter(q => q.qualityScore >= 90).length },
                                        { range: '70-89', count: analyticsData.questions.filter(q => q.qualityScore >= 70 && q.qualityScore < 90).length },
                                        { range: '50-69', count: analyticsData.questions.filter(q => q.qualityScore >= 50 && q.qualityScore < 70).length },
                                        { range: '< 50', count: analyticsData.questions.filter(q => q.qualityScore < 50 && q.qualityScore != null).length },
                                    ]}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis dataKey="range" stroke="#475569" fontSize={10} />
                                        <YAxis stroke="#475569" fontSize={10} />
                                        <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                        <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Acceptance Rate by Discipline */}
                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 h-80 flex flex-col lg:col-span-2 min-w-0">
                            <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                                <PieChart size={16} /> Acceptance Rate by Discipline
                            </h3>
                            <div className="flex-1 min-h-0 w-full" style={{ minHeight: 200 }}>
                                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={200}>
                                    <BarChart data={Object.entries(analyticsData.questions.reduce((acc, q) => {
                                        if (!acc[q.discipline]) acc[q.discipline] = { total: 0, accepted: 0 };
                                        acc[q.discipline].total++;
                                        if (q.status === 'accepted') acc[q.discipline].accepted++;
                                        return acc;
                                    }, {})).map(([name, stats]) => ({
                                        name,
                                        rate: Math.round((stats.accepted / stats.total) * 100) || 0,
                                        total: stats.total
                                    }))}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                                        <YAxis stroke="#475569" fontSize={10} unit="%" />
                                        <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                        <Bar dataKey="rate" fill="#6366f1" radius={[4, 4, 0, 0]} name="Acceptance Rate" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Rejection Reasons Breakdown */}
                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 h-80 flex flex-col min-w-0">
                            <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                                <PieChart size={16} /> Rejection Reasons
                            </h3>
                            <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                                {(() => {
                                    const rejectionData = Object.entries(
                                        analyticsData.questions
                                            .filter(q => q.status === 'rejected' && q.rejectionReason)
                                            .reduce((acc, q) => {
                                                const reason = q.rejectionReason || 'other';
                                                acc[reason] = (acc[reason] || 0) + 1;
                                                return acc;
                                            }, {})
                                    ).map(([reason, count]) => ({
                                        name: { too_easy: 'Too Easy', too_hard: 'Too Difficult', incorrect: 'Incorrect', unclear: 'Unclear', duplicate: 'Duplicate', poor_quality: 'Poor Quality', bad_source: 'Bad Source', other: 'Other' }[reason] || reason,
                                        value: count
                                    }));
                                    const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#a855f7', '#ec4899'];
                                    return rejectionData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={200}>
                                            <RechartsPieChart>
                                                <Pie data={rejectionData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={80} fill="#8884d8" dataKey="value">
                                                    {rejectionData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                            </RechartsPieChart>
                                        </ResponsiveContainer>
                                    ) : (<div className="text-slate-500 text-sm">No rejection data yet</div>);
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Training Data Progress */}
                    <div className="grid grid-cols-1 gap-6">
                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 h-80 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                                    <Activity size={16} /> Training Data Readiness
                                </h3>
                                <div className="text-xs font-mono text-slate-500">
                                    Target: 500 Questions
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col justify-center gap-6">
                                {/* Progress Bar */}
                                <div>
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="text-slate-300 font-bold">Total Progress</span>
                                        <span className="text-indigo-400 font-bold">{analyticsData.questions.length} / 500</span>
                                    </div>
                                    <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-1000"
                                            style={{ width: `${Math.min((analyticsData.questions.length / 500) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Breakdown */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-center">
                                        <div className="text-2xl font-bold text-emerald-400">
                                            {analyticsData.questions.filter(q => q.status === 'accepted').length}
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Positive Examples</div>
                                    </div>
                                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-center">
                                        <div className="text-2xl font-bold text-red-400">
                                            {analyticsData.questions.filter(q => q.status === 'rejected').length}
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Negative Examples</div>
                                    </div>
                                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-center">
                                        <div className="text-2xl font-bold text-blue-400">
                                            {analyticsData.questions.filter(q => q.wasRewritten).length}
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Rewritten (High Value)</div>
                                    </div>
                                </div>

                                <div className="text-xs text-slate-500 text-center italic">
                                    "A balanced dataset with both good and bad examples produces the best fine-tuned models."
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Topic Coverage Analysis */}
                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 min-w-0">
                        <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                            <TrendingUp size={16} /> Topic Coverage Analysis
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(TAGS_BY_DISCIPLINE).map(([discipline, tags]) => {
                                // Calculate coverage for this discipline
                                const disciplineQuestions = analyticsData.questions.filter(q => q.discipline === discipline);
                                const coverageStats = tags.map(tag => {
                                    // Normalized match
                                    const normalize = t => t.toLowerCase();
                                    const count = disciplineQuestions.filter(q =>
                                        (q.tags || []).some(qt => normalize(qt) === normalize(tag))
                                    ).length;
                                    return { tag, count };
                                }).sort((a, b) => b.count - a.count); // Most covered first

                                return (
                                    <div key={discipline} className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                                        <h4 className="text-xs font-bold text-slate-300 uppercase mb-3 border-b border-slate-800 pb-2">
                                            {discipline} <span className="text-slate-500">({disciplineQuestions.length})</span>
                                        </h4>
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                            {coverageStats.map(({ tag, count }) => {
                                                const coveragePercent = Math.min((count / 5) * 100, 100); // Goal: 5 questions per tag
                                                return (
                                                    <div key={tag} className="flex flex-col gap-1">
                                                        <div className="flex justify-between text-[10px]">
                                                            <span className={count === 0 ? 'text-slate-500' : 'text-slate-300'}>{tag}</span>
                                                            <span className={count === 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-mono'}>{count}</span>
                                                        </div>
                                                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${count === 0 ? 'bg-transparent' : (count < 3 ? 'bg-orange-500' : 'bg-emerald-500')}`}
                                                                style={{ width: `${coveragePercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
