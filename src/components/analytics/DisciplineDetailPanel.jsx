import Icon from '../Icon';
import { CATEGORY_KEYS } from '../../utils/constants';

// Difficulty colors (shared with parent)
const DIFFICULTY_COLORS = {
    'Easy MC': '#22c55e',
    'Easy T/F': '#4ade80',
    'Medium MC': '#eab308',
    'Medium T/F': '#facc15',
    'Hard MC': '#ef4444',
    'Hard T/F': '#f87171'
};

/**
 * DisciplineDetailPanel - Shows detailed breakdown when a discipline card is clicked
 * @param {Object} props
 * @param {string} props.discipline - Discipline name
 * @param {Array} props.questions - All questions array
 * @param {string} props.color - Discipline color
 * @param {Function} props.onClose - Close handler
 */
const DisciplineDetailPanel = ({ discipline, questions, color, onClose }) => {
    const disciplineQuestions = questions.filter(q => q.discipline === discipline);
    
    // Difficulty breakdown for this discipline
    const difficultyBreakdown = CATEGORY_KEYS.map(key => ({
        name: key.replace(' MC', '\nMC').replace(' T/F', '\nT/F'),
        shortName: key,
        value: disciplineQuestions.filter(q => q.difficulty === key).length,
        fill: DIFFICULTY_COLORS[key]
    })).filter(d => d.value > 0);
    
    // Status breakdown
    const accepted = disciplineQuestions.filter(q => q.status === 'accepted').length;
    const pending = disciplineQuestions.filter(q => !q.status || q.status === 'pending').length;
    const rejected = disciplineQuestions.filter(q => q.status === 'rejected').length;
    
    // Average quality
    const withScores = disciplineQuestions.filter(q => q.critiqueScore != null);
    const avgQuality = withScores.length > 0 
        ? Math.round(withScores.reduce((sum, q) => sum + q.critiqueScore, 0) / withScores.length)
        : null;
    
    return (
        <div 
            className="bg-slate-900 border-2 rounded-xl p-6 animate-in slide-in-from-top-2 duration-200"
            style={{ borderColor: color }}
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                    <h3 className="text-lg font-bold text-white">{discipline}</h3>
                    <span className="text-sm text-slate-400">({disciplineQuestions.length} questions)</span>
                </div>
                <button 
                    onClick={onClose}
                    className="p-1 hover:bg-slate-800 rounded transition-colors"
                >
                    <Icon name="x" size={18} className="text-slate-400" />
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Difficulty Breakdown */}
                <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3">Difficulty Breakdown</h4>
                    {difficultyBreakdown.length > 0 ? (
                        <div className="space-y-2">
                            {difficultyBreakdown.map(d => (
                                <div key={d.shortName} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                                    <span className="text-xs text-slate-300 flex-1">{d.shortName}</span>
                                    <span className="text-sm font-bold text-white">{d.value}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500">No questions yet</p>
                    )}
                </div>
                
                {/* Status Distribution */}
                <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3">Status</h4>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs text-slate-300 flex-1">Accepted</span>
                            <span className="text-sm font-bold text-green-400">{accepted}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-xs text-slate-300 flex-1">Pending</span>
                            <span className="text-sm font-bold text-amber-400">{pending}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-xs text-slate-300 flex-1">Rejected</span>
                            <span className="text-sm font-bold text-red-400">{rejected}</span>
                        </div>
                    </div>
                </div>
                
                {/* Quality Stats */}
                <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3">Quality</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold" style={{ color: avgQuality ? (avgQuality >= 70 ? '#22c55e' : avgQuality >= 50 ? '#eab308' : '#ef4444') : '#64748b' }}>
                            {avgQuality ?? '—'}
                        </span>
                        <span className="text-xs text-slate-500">avg score</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        {withScores.length} of {disciplineQuestions.length} critiqued
                    </p>
                    {disciplineQuestions.length > 0 && (
                        <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-green-500 transition-all"
                                style={{ width: `${(accepted / disciplineQuestions.length) * 100}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DisciplineDetailPanel;
