import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TrendCharts = ({ generations }) => {
    // Process data for charts
    // Sort generations by timestamp
    const sortedGenerations = [...generations].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const data = sortedGenerations.map((gen, index) => ({
        name: `Batch ${index + 1}`,
        date: new Date(gen.timestamp).toLocaleDateString(),
        quality: gen.averageQuality || 0,
        cost: (gen.estimatedCost || 0) * 100, // Convert to cents for better visibility
        tokens: (gen.tokensUsed?.input || 0) + (gen.tokensUsed?.output || 0)
    }));

    if (data.length === 0) {
        return (
            <div className="text-center p-8 text-slate-500">
                Not enough data to show trends. Generate some questions first!
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Quality Trend */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 mb-4 text-center">Average Quality Score Trend</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#94a3b8" domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                labelStyle={{ color: '#94a3b8' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="quality" stroke="#8884d8" activeDot={{ r: 8 }} name="Avg Quality Score" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Cost & Token Trend */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 mb-4 text-center">Token Usage & Cost Trend</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#94a3b8" />
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                labelStyle={{ color: '#94a3b8' }}
                            />
                            <Area type="monotone" dataKey="tokens" stroke="#82ca9d" fillOpacity={1} fill="url(#colorTokens)" name="Total Tokens" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-slate-500 text-center mt-2">
                    * Cost is correlated with token usage.
                </p>
            </div>
        </div>
    );
};

export default TrendCharts;
