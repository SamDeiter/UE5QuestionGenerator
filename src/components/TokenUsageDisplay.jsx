const TokenUsageDisplay = ({ tokenUsage }) => {
    if (!tokenUsage) return null;

    const { inputTokens, outputTokens, totalCost } = tokenUsage;

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex flex-col gap-1 text-xs">
            <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase">Session Usage</span>
                <span className="text-emerald-400 font-mono font-bold">${totalCost.toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500">
                <span title="Input Tokens">In: {inputTokens.toLocaleString()}</span>
                <span title="Output Tokens">Out: {outputTokens.toLocaleString()}</span>
            </div>
        </div>
    );
};

export default TokenUsageDisplay;
