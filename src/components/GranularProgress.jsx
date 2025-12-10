const GranularProgress = ({ 
    currentStage = 1, 
    totalStages = 1, 
    percentage = 0, 
    stageName = 'Processing', 
    estimatedTimeLeft = null,
    message = ''
}) => {
    return (
        <div className="space-y-3">
            {/* Stage and Time Info */}
            <div className="flex justify-between items-center text-sm">
                <span className="text-white font-medium">
                    Step {currentStage} of {totalStages}: {stageName}
                </span>
                <span className="text-slate-400">
                    {percentage}%
                    {estimatedTimeLeft !== null && ` • ~${estimatedTimeLeft}s left`}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <div 
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label={`${stageName} progress`}
                />
            </div>

            {/* Status Message */}
            {message && (
                <p className="text-xs text-slate-400 animate-pulse">
                    {message}
                </p>
            )}

            {/* Stage Indicators */}
            {totalStages > 1 && (
                <div className="flex justify-between gap-1 mt-2">
                    {Array.from({ length: totalStages }, (_, i) => (
                        <div 
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                                i + 1 < currentStage ? 'bg-green-500' :
                                i + 1 === currentStage ? 'bg-orange-500' :
                                'bg-slate-700'
                            }`}
                            aria-label={`Stage ${i + 1} ${i + 1 < currentStage ? 'complete' : i + 1 === currentStage ? 'in progress' : 'pending'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default GranularProgress;
