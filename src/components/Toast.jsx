import { useEffect } from 'react';
import Icon from './Icon';

const Toast = ({ message, type = 'info', onClose, action = null, duration = 5000 }) => {
    useEffect(() => {
        if (!action && duration) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [onClose, action, duration]);

    const bgColors = {
        success: 'bg-green-900/90 border-green-700',
        error: 'bg-red-900/90 border-red-700',
        warning: 'bg-orange-900/90 border-orange-700',
        info: 'bg-blue-900/90 border-blue-700',
    };

    const iconNames = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info',
    };

    return (
        <div 
            className={`fixed bottom-4 right-4 z-50 ${bgColors[type]} border rounded-lg shadow-2xl p-4 max-w-md backdrop-blur-sm animate-in slide-in-from-bottom`}
            role="alert"
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Icon name={iconNames[type]} size={20} className="text-white" />
                    <span className="text-white font-medium">{message}</span>
                </div>
                
                <div className="flex items-center gap-2">
                    {action && (
                        <button
                            onClick={action.onClick}
                            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded transition-colors text-sm font-medium"
                        >
                            {action.label}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition-colors"
                        aria-label="Close notification"
                    >
                        <Icon name="x" size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Toast;
