import Icon from './Icon';

const FilterButton = ({ mode, current, setFilter, label, count }) => {
    const isActive = mode === current;
    const baseClasses = "px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1";
    const activeClasses = "bg-orange-600 text-white shadow-md shadow-orange-900/50";
    let inactiveClasses = "bg-slate-800 text-slate-400 hover:bg-slate-700/50";
    if (mode === 'accepted' && !isActive) inactiveClasses = "bg-green-900/20 text-green-400 hover:bg-green-900/30";
    if (mode === 'rejected' && !isActive) inactiveClasses = "bg-red-900/20 text-red-400 hover:bg-red-900/30";
    if (mode === 'pending' && !isActive) inactiveClasses = "bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/30";
    return (
        <button onClick={() => setFilter(mode)} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            <Icon name={mode === 'accepted' ? 'check' : mode === 'rejected' ? 'x' : mode === 'pending' ? 'clock' : 'list'} size={12} />
            {label} <span className="text-[10px] bg-slate-950/50 px-1.5 rounded-full">{count}</span>
        </button>
    );
};

export default FilterButton;
