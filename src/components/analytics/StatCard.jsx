import Icon from '../Icon';

/**
 * StatCard - Displays a single metric with an icon
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {string|number} props.value - Metric value to display
 * @param {string} props.icon - Icon name from Icon component
 * @param {string} props.color - Color theme (blue, emerald, amber, purple)
 */
const StatCard = ({ title, value, icon, color }) => {
    const colorClasses = {
        blue: 'bg-blue-900/30 text-blue-400',
        emerald: 'bg-emerald-900/30 text-emerald-400',
        amber: 'bg-amber-900/30 text-amber-400',
        purple: 'bg-purple-900/30 text-purple-400'
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
                    <Icon name={icon} size={14} />
                </div>
                <span className="text-xs text-slate-400">{title}</span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );
};

export default StatCard;
