import Icon from '../Icon';
const BatchSizeControl = ({ maxBatchSize, config, handleChange, batchSizeWarning }) => {
    return (
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 shadow-inner">
            <div className="flex items-center mb-2">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2"><Icon name="hash" size={12} /> Batch Size (Max {maxBatchSize})</label>
                <InfoTooltip text="Number of questions to generate in one batch. Dynamically capped by remaining quota." />
            </div>
            <div className="flex gap-2 mb-2">
                {[6, 12, 18].map(size => (
                    <button
                        key={size}
                        onClick={() => handleChange({ target: { name: 'batchSize', value: size } })}
                        className={`flex-1 py-1 text-xs font-bold rounded border ${parseInt(config.batchSize) === size ? 'bg-orange-600 text-white border-orange-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                    >
                        {size}
                    </button>
                ))}
            </div>
            <input type="number" min="1" max={maxBatchSize || 50} name="batchSize" value={config.batchSize} onChange={handleChange} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-orange-500" placeholder="Custom..." />
            {batchSizeWarning && (
                <div className="text-xs text-yellow-500 mt-1 flex items-center gap-1 animate-pulse">
                    <Icon name="alert-triangle" size={12} /> {batchSizeWarning}
                </div>
            )}
        </div>
    );
};

export default BatchSizeControl;
