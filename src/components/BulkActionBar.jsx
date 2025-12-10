import Icon from './Icon';

const BulkActionBar = ({
    selectedCount,
    onSelectAll,
    onClearSelection,
    onAcceptAll,
    onRejectAll
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="mb-3 p-3 bg-indigo-900/30 border border-indigo-700/50 rounded-lg flex items-center justify-between animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-indigo-300">{selectedCount} selected</span>
                <button onClick={onSelectAll} className="text-xs text-indigo-400 hover:text-indigo-300 underline">Select All</button>
                <button onClick={onClearSelection} className="text-xs text-slate-400 hover:text-slate-300 underline">Clear</button>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={onAcceptAll} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                    <Icon name="check" size={14} /> Accept All
                </button>
                <button onClick={onRejectAll} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                    <Icon name="x" size={14} /> Reject All
                </button>
            </div>
        </div>
    );
};

export default BulkActionBar;
