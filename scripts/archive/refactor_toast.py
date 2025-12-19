"""
Refactor App.jsx to use the new useToast hook.

This script:
1. Adds the import for useToast
2. Removes the inline toast state and handlers
3. Adds the useToast hook call
"""

def refactor_app_jsx():
    """Refactor App.jsx to use useToast hook."""
    
    with open('src/App.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add import for useToast after useKeyboardShortcuts import
    old_import = "import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';"
    new_import = """import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useToast } from './hooks/useToast';"""
    content = content.replace(old_import, new_import)
    
    # 2. Replace toast state and handlers with hook call
    old_toast_section = """    // ========================================================================
    // STATE - Toast Notifications (Local to App for now)
    // ========================================================================
    const [toasts, setToasts] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());"""
    
    new_toast_section = """    // ========================================================================
    // HOOKS - Toast Notifications
    // ========================================================================
    const { toasts, addToast, removeToast, showMessage } = useToast();
    
    // ========================================================================
    // STATE - Selection
    // ========================================================================
    const [selectedIds, setSelectedIds] = useState(new Set());"""
    
    content = content.replace(old_toast_section, new_toast_section)
    
    # 3. Remove the old toast handlers (addToast, removeToast, showMessage)
    old_toast_handlers = """    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => {
            // Prevent duplicate messages
            if (prev.some(t => t.message === message)) {
                return prev;
            }
            const newToasts = [...prev, { id, message, type, duration }];
            // Keep only the 3 most recent toasts
            return newToasts.slice(-3);
        });
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showMessage = useCallback((msg, duration = 3000) => {
        addToast(msg, 'info', duration);
    }, [addToast]);

"""
    
    content = content.replace(old_toast_handlers, "")
    
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Refactored App.jsx to use useToast hook")
    print("   - Added import for useToast")
    print("   - Replaced toast state with hook call")
    print("   - Removed addToast, removeToast, showMessage handlers")

if __name__ == '__main__':
    refactor_app_jsx()
