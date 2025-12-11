"""
Fix #4: Granular Progress Tracking
Enhances progress display with stage-based tracking and time estimates.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from jsx_editor import JSXEditor


def enhance_granular_progress(editor, file_path):
    """Enhance GranularProgress component with stages and time estimates"""
    
    enhanced_progress = """import React from 'react';

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
"""
    
    editor.backup_file(file_path)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(enhanced_progress)
    
    print("[OK] Enhanced GranularProgress.jsx")


def create_progress_tracker_hook(editor, project_root):
    """Create a custom hook for tracking multi-stage progress"""
    
    hook_content = """import { useState, useCallback, useRef } from 'react';

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
"""
    
    hooks_dir = project_root / 'src' / 'hooks'
    hook_path = hooks_dir / 'useProgressTracker.js'
    
    with open(hook_path, 'w', encoding='utf-8') as f:
        f.write(hook_content)
    
    print("[OK] Created useProgressTracker.js hook")


if __name__ == '__main__':
    project_root = Path(__file__).parent.parent
    editor = JSXEditor(project_root)
    
    progress_path = project_root / 'src' / 'components' / 'GranularProgress.jsx'
    
    print("=" * 60)
    print("Fix #4: Granular Progress Tracking Implementation")
    print("=" * 60)
    
    try:
        enhance_granular_progress(editor, progress_path)
        create_progress_tracker_hook(editor, project_root)
        
        print("\n[SUCCESS] Fix #4 Complete!")
        print("Note: Update useGeneration.js to use useProgressTracker hook")
        print(f"Backups saved to: {editor.backup_dir}")
        
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
