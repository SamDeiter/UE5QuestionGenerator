import re

# Read the file
with open('src/components/AnalyticsDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the position after "Acceptance Rate by Discipline" chart and add rejection chart
insert_marker = '''                                        <Bar dataKey="rate" fill="#6366f1" radius={[4, 4, 0, 0]} name="Acceptance Rate" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>'''

new_chart = '''                                        <Bar dataKey="rate" fill="#6366f1" radius={[4, 4, 0, 0]} name="Acceptance Rate" />
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
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                    </div>'''

content = content.replace(insert_marker, new_chart)

with open('src/components/AnalyticsDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Added rejection reasons chart')
