import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CATEGORY_KEYS } from '../../utils/constants';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const DistributionCharts = ({ questions }) => {
    // Process data for Difficulty Pie Chart
    const difficultyData = CATEGORY_KEYS.map(key => ({
        name: key,
        value: questions.filter(q => q.difficulty === key).length
    })).filter(item => item.value > 0);

    // Process data for Discipline Bar Chart
    const disciplineCounts = questions.reduce((acc, q) => {
        acc[q.discipline] = (acc[q.discipline] || 0) + 1;
        return acc;
    }, {});

    const disciplineData = Object.entries(disciplineCounts).map(([name, value]) => ({
        name,
        value
    })).sort((a, b) => b.value - a.value);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Difficulty Distribution */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 mb-4 text-center">Difficulty Distribution</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={difficultyData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {difficultyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                itemStyle={{ color: '#f1f5f9' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Discipline Distribution */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 mb-4 text-center">Questions by Discipline</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={disciplineData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                            <XAxis type="number" stroke="#94a3b8" />
                            <YAxis type="category" dataKey="name" stroke="#94a3b8" width={100} tick={{ fontSize: 10 }} />
                            <Tooltip
                                cursor={{ fill: '#334155', opacity: 0.4 }}
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                            />
                            <Bar dataKey="value" fill="#82ca9d" radius={[0, 4, 4, 0]}>
                                {disciplineData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default DistributionCharts;
