import React, { useEffect } from 'react';
import Icon from './Icon';

const Toast = ({ id, message, type = 'info', duration = 3000, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const bgColors = {
        info: 'bg-slate-800 border-slate-600 text-slate-200',
        success: 'bg-green-900/90 border-green-700 text-green-100',
        error: 'bg-red-900/90 border-red-700 text-red-100',
        warning: 'bg-amber-900/90 border-amber-700 text-amber-100'
    };

    const icons = {
        info: 'info',
        success: 'check-circle',
        error: 'alert-circle',
        warning: 'alert-triangle'
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded shadow-lg border ${bgColors[type]} min-w-[300px] max-w-md animate-slide-in-right`}>
            <Icon name={icons[type]} size={20} />
            <p className="text-sm font-medium flex-1">{message}</p>
            <button onClick={() => onClose(id)} className="opacity-70 hover:opacity-100 transition-opacity">
                <Icon name="x" size={16} />
            </button>
        </div>
    );
};

export default Toast;
