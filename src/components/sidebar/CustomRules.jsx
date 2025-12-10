import Icon from '../Icon';
import InfoTooltip from '../InfoTooltip';
const CustomRules = ({ config, handleChange }) => {
    return (
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 shadow-inner">
            <div className="flex items-center mb-2">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <Icon name="shield" size={12} /> Custom Rules
                </label>
                <InfoTooltip text="Add specific constraints (e.g., 'No code snippets', 'Focus on UE5.3 features')" />
            </div>
            <textarea
                name="customRules"
                value={config.customRules || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-orange-500 min-h-[60px]"
                placeholder="e.g. No code snippets, Focus on UE5.3..."
            />
        </div>
    );
};

export default CustomRules;
