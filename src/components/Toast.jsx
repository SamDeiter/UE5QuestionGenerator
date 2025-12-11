import { useEffect, useState } from 'react';
import Icon from './Icon';

const Toast = ({ message, type = 'info', onClose, action = null, duration = 5000, sticky = false, progress = null }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Don't auto-dismiss if sticky or has action
        if (sticky || action || !duration) {
            return;
        }
        
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onClose, 200); // Wait for exit animation
        }, duration);
        
        return () => clearTimeout(timer);
    }, [onClose, action, duration, sticky]);

    const bgColors = {
        success: 'bg-emerald-900/95 border-emerald-500/50 shadow-emerald-900/20',
        error: 'bg-red-950/95 border-red-500/50 shadow-red-900/20',
        warning: 'bg-amber-900/95 border-amber-500/50 shadow-amber-900/20',
        info: 'bg-slate-900/95 border-slate-600/50 shadow-slate-900/20',
        progress: 'bg-blue-950/95 border-blue-500/50 shadow-blue-900/20',
    };

    const iconNames = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info',
        progress: 'loader',
    };

    const progressColors = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        warning: 'bg-amber-500',
        info: 'bg-blue-500',
        progress: 'bg-blue-500',
    };

    return (
        <div 
            className={`
                ${bgColors[type] || bgColors.info} 
                border rounded-lg shadow-2xl p-4 max-w-md backdrop-blur-sm 
                transition-all duration-200
                ${isExiting ? 'opacity-0 translate-x-4' : 'animate-in slide-in-from-right'}
            `}
            role="alert"
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon 
                        name={iconNames[type] || iconNames.info} 
                        size={20} 
                        className={`text-white flex-shrink-0 ${type === 'progress' ? 'animate-spin' : ''}`} 
                    />
                    <span className="text-white font-medium truncate">{message}</span>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                    {action && (
                        <button
                            onClick={action.onClick}
                            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded transition-colors text-sm font-medium"
                        >
                            {action.label}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setIsExiting(true);
                            setTimeout(onClose, 200);
                        }}
                        className="text-white/70 hover:text-white transition-colors"
                        aria-label="Close notification"
                    >
                        <Icon name="x" size={18} />
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            {progress !== null && progress !== undefined && (
                <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${progressColors[type] || progressColors.info} transition-all duration-300 rounded-full`}
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                </div>
            )}
        </div>
    );
};

export default Toast;

