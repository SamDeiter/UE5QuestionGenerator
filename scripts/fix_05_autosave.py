"""
Fix #5: Auto-Save and Unsaved Work Detection
Adds auto-save functionality and warns users about unsaved work.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from jsx_editor import JSXEditor


def create_autosave_hook(editor, project_root):
    """Create a custom hook for auto-save functionality"""
    
    hook_content = """import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook for auto-saving data to localStorage
 * @param {string} key - localStorage key
 * @param {any} data - Data to save
 * @param {number} interval - Save interval in milliseconds (default: 10000)
 * @param {boolean} enabled - Whether auto-save is enabled
 */
export const useAutoSave = (key, data, interval = 10000, enabled = true) => {
    const intervalRef = useRef(null);
    const lastSaveRef = useRef(null);

    const saveData = useCallback(() => {
        if (!enabled || !data) return;

        try {
            const savePayload = {
                data,
                timestamp: Date.now(),
                version: '1.0'
            };
            localStorage.setItem(key, JSON.stringify(savePayload));
            lastSaveRef.current = Date.now();
            console.log(`Auto-saved: ${key}`);
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }, [key, data, enabled]);

    const loadData = useCallback(() => {
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const { data: savedData, timestamp } = JSON.parse(saved);
                return { data: savedData, timestamp };
            }
        } catch (error) {
            console.error('Failed to load saved data:', error);
        }
        return null;
    }, [key]);

    const clearSaved = useCallback(() => {
        localStorage.removeItem(key);
        lastSaveRef.current = null;
        console.log(`Cleared saved data: ${key}`);
    }, [key]);

    const hasSavedData = useCallback(() => {
        return localStorage.getItem(key) !== null;
    }, [key]);

    // Auto-save effect
    useEffect(() => {
        if (enabled && data) {
            // Initial save
            saveData();

            // Set up interval
            intervalRef.current = setInterval(saveData, interval);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [enabled, data, interval, saveData]);

    return {
        saveData,
        loadData,
        clearSaved,
        hasSavedData,
        lastSaveTime: lastSaveRef.current
    };
};

export default useAutoSave;
"""
    
    hooks_dir = project_root / 'src' / 'hooks'
    hook_path = hooks_dir / 'useAutoSave.js'
    
    with open(hook_path, 'w', encoding='utf-8') as f:
        f.write(hook_content)
    
    print("[OK] Created useAutoSave.js hook")


def create_unsaved_changes_component(editor, project_root):
    """Create a component to warn about unsaved changes"""
    
    component_content = """import React from 'react';
import Icon from './Icon';

const UnsavedChangesDialog = ({ isOpen, onSaveDraft, onDiscard, onCancel, draftTimestamp }) => {
    if (!isOpen) return null;

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-xl max-w-md w-full border border-slate-800 shadow-2xl">
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-900/30 rounded-lg">
                            <Icon name="alert-triangle" size={24} className="text-orange-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Unsaved Work Detected</h2>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-slate-300">
                        You have unsaved work in Creation Mode. What would you like to do?
                    </p>
                    {draftTimestamp && (
                        <p className="text-sm text-slate-400">
                            Last saved: {formatTimestamp(draftTimestamp)}
                        </p>
                    )}
                </div>

                <div className="p-6 border-t border-slate-800 flex gap-3">
                    <button
                        onClick={onSaveDraft}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Icon name="save" size={18} />
                            Keep Draft
                        </div>
                    </button>
                    <button
                        onClick={onDiscard}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Icon name="trash" size={18} />
                            Discard
                        </div>
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnsavedChangesDialog;
"""
    
    components_dir = project_root / 'src' / 'components'
    component_path = components_dir / 'UnsavedChangesDialog.jsx'
    
    with open(component_path, 'w', encoding='utf-8') as f:
        f.write(component_content)
    
    print("[OK] Created UnsavedChangesDialog.jsx")


def create_draft_restoration_banner(editor, project_root):
    """Create a banner component for draft restoration notifications"""
    
    banner_content = """import React from 'react';
import Icon from './Icon';

const DraftRestorationBanner = ({ timestamp, onClear }) => {
    const formatTimestamp = (ts) => {
        const date = new Date(ts);
        const now = new Date();
        const diffMinutes = Math.floor((now - date) / 60000);
        
        if (diffMinutes < 1) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        
        return date.toLocaleString();
    };

    return (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-4 animate-in slide-in-from-top">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Icon name="info" size={20} className="text-blue-400" />
                    <div>
                        <p className="text-white font-medium">
                            Draft Restored
                        </p>
                        <p className="text-sm text-slate-400">
                            Your work from {formatTimestamp(timestamp)} has been restored
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClear}
                    className="px-3 py-1 text-sm bg-blue-700 hover:bg-blue-600 text-white rounded transition-colors"
                >
                    Clear Draft
                </button>
            </div>
        </div>
    );
};

export default DraftRestorationBanner;
"""
    
    components_dir = project_root / 'src' / 'components'
    banner_path = components_dir / 'DraftRestorationBanner.jsx'
    
    with open(banner_path, 'w', encoding='utf-8') as f:
        f.write(banner_content)
    
    print("[OK] Created DraftRestorationBanner.jsx")


if __name__ == '__main__':
    project_root = Path(__file__).parent.parent
    editor = JSXEditor(project_root)
    
    print("=" * 60)
    print("Fix #5: Auto-Save and Unsaved Work Detection Implementation")
    print("=" * 60)
    
    try:
        create_autosave_hook(editor, project_root)
        create_unsaved_changes_component(editor, project_root)
        create_draft_restoration_banner(editor, project_root)
        
        print("\n[SUCCESS] Fix #5 Complete!")
        print("Note: Integrate useAutoSave hook into App.jsx Creation Mode")
        print(f"Backups saved to: {editor.backup_dir}")
        
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
