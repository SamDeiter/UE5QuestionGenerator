import { useState, useCallback, useRef } from 'react';

/**
 * Hook for tracking multi-stage progress with time estimation
 * @param {Array} stages - Array of stage objects with { name, weight }
 */
export const useProgressTracker = (stages) => {
    const [progress, setProgress] = useState({
        currentStage: 0,
        percentage: 0,
        stageName: stages[0]?.name || 'Processing',
        estimatedTimeLeft: null,
        message: ''
    });

    const startTime = useRef(null);
    const stageStartTime = useRef(null);

    const startTracking = useCallback(() => {
        startTime.current = Date.now();
        stageStartTime.current = Date.now();
        setProgress({
            currentStage: 1,
            percentage: 0,
            stageName: stages[0]?.name || 'Processing',
            estimatedTimeLeft: null,
            message: ''
        });
    }, [stages]);

    const updateProgress = useCallback((stageIndex, stageProgress, message = '') => {
        if (stageIndex >= stages.length) return;

        // Calculate overall percentage
        const completedWeight = stages.slice(0, stageIndex).reduce((sum, s) => sum + s.weight, 0);
        const currentStageWeight = stages[stageIndex].weight * Math.min(1, Math.max(0, stageProgress));
        const totalPercentage = Math.round((completedWeight + currentStageWeight) * 100);

        // Estimate time remaining
        let estimatedTimeLeft = null;
        if (startTime.current && totalPercentage > 5) {
            const elapsed = (Date.now() - startTime.current) / 1000;
            const estimatedTotal = (elapsed / totalPercentage) * 100;
            estimatedTimeLeft = Math.round(estimatedTotal - elapsed);
        }

        setProgress({
            currentStage: stageIndex + 1,
            totalStages: stages.length,
            percentage: totalPercentage,
            stageName: stages[stageIndex].name,
            estimatedTimeLeft,
            message
        });
    }, [stages]);

    const completeStage = useCallback((stageIndex) => {
        if (stageIndex + 1 < stages.length) {
            stageStartTime.current = Date.now();
            updateProgress(stageIndex + 1, 0);
        } else {
            // All stages complete
            setProgress({
                currentStage: stages.length,
                totalStages: stages.length,
                percentage: 100,
                stageName: 'Complete',
                estimatedTimeLeft: 0,
                message: 'All stages completed!'
            });
        }
    }, [stages, updateProgress]);

    const reset = useCallback(() => {
        startTime.current = null;
        stageStartTime.current = null;
        setProgress({
            currentStage: 0,
            percentage: 0,
            stageName: stages[0]?.name || 'Processing',
            estimatedTimeLeft: null,
            message: ''
        });
    }, [stages]);

    return {
        progress,
        startTracking,
        updateProgress,
        completeStage,
        reset
    };
};

export default useProgressTracker;
