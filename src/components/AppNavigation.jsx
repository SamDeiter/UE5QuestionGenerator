import React from 'react';
import Icon from './Icon';

const AppNavigation = ({ activeMode, onNavigate, counts = {} }) => {
    const navItems = [
        { id: 'create', label: 'Create', icon: 'plus-circle', color: 'green' },
        { id: 'review', label: 'Review', icon: 'list-checks', color: 'indigo', badge: counts.pending },
        { id: 'database', label: 'Database', icon: 'database', color: 'blue' },
        { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2', color: 'slate' } // Analytics was a modal trigger, but plan implies tab. I'll treat it as a mode or keep it as a button.
    ];

    // Note: Analytics in App.jsx was a modal (setShowAnalytics). 
    // The plan suggests making it a tab or at least part of this nav. 
    // If the user wants it as a tab, I should probably handle it as a mode or a special action.
    // For now, I will implement it as a mode if passed, or a callback.
    // Looking at App.jsx, handleModeSelect sets appMode. Analytics is separate.
    // I will stick to the plan's "Primary Navigation" which lists Analytics. 
    // I'll assume for now we might want to treat it as a mode eventually, but for now I'll pass a specific handler if needed or just use onNavigate('analytics') and let parent handle it.

    return (
        <div className="flex items-center gap-1 p-2 bg-slate-900 border-b border-slate-800">
            {navItems.map(item => {
                const isActive = activeMode === item.id;
                // Base classes
                let classes = `
                    relative px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2
                    ${isActive
                        ? `bg-${item.color}-600 text-white shadow-lg shadow-${item.color}-900/20`
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }
                `;

                return (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={classes}
                    >
                        <Icon name={item.icon} size={16} />
                        {item.label}
                        {item.badge > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                                {item.badge}
                            </span>
                        )}

                        {/* Active Indicator Line (Optional, for tab look) */}
                        {isActive && (
                            <div className={`absolute bottom-0 left-2 right-2 h-0.5 bg-white/20 rounded-t-full`} />
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default AppNavigation;
