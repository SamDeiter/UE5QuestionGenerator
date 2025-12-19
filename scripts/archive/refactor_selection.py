"""
Refactor App.jsx to use the new useBulkSelection hook.

This script:
1. Adds the import for useBulkSelection
2. Removes the inline selection state and handlers
3. Adds the useBulkSelection hook call
"""

def refactor_app_jsx():
    """Refactor App.jsx to use useBulkSelection hook."""
    
    with open('src/App.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add import for useBulkSelection after useToast import
    old_import = "import { useToast } from './hooks/useToast';"
    new_import = """import { useToast } from './hooks/useToast';
import { useBulkSelection } from './hooks/useBulkSelection';"""
    content = content.replace(old_import, new_import)
    
    # 2. Remove the old selection state and handlers, replace with hook call
    old_selection_section = """    // ========================================================================
    // STATE - Selection
    // ========================================================================
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [tokenUsage, setTokenUsage] = useState(() => getTokenUsage());"""
    
    new_selection_section = """    // ========================================================================
    // STATE - Token Usage and Auth
    // ========================================================================
    const [tokenUsage, setTokenUsage] = useState(() => getTokenUsage());"""
    
    content = content.replace(old_selection_section, new_selection_section)
    
    # 3. Remove the toggleSelection and clearSelection callbacks 
    old_selection_handlers = """    const toggleSelection = useCallback((id) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

"""
    
    content = content.replace(old_selection_handlers, "")
    
    # 4. Remove the old selectAll and bulkUpdateStatus callbacks (they appear after useNavigation)
    old_bulk_callbacks = """    // Bulk selection callbacks (must be after uniqueFilteredQuestions is defined)
    const selectAll = useCallback(() => {
        setSelectedIds(new Set(uniqueFilteredQuestions.map(q => q.id)));
    }, [uniqueFilteredQuestions]);

    const bulkUpdateStatus = useCallback((status, rejectionReason = null) => {
        selectedIds.forEach(id => handleUpdateStatus(id, status, rejectionReason));
        clearSelection();
        showMessage(`${status === 'accepted' ? 'Accepted' : 'Rejected'} ${selectedIds.size} questions`);
    }, [selectedIds, handleUpdateStatus, clearSelection, showMessage]);

"""
    
    new_bulk_section = """    // Bulk selection (extracted to useBulkSelection hook)
    const {
        selectedIds,
        toggleSelection,
        clearSelection,
        selectAll,
        bulkUpdateStatus
    } = useBulkSelection({
        items: uniqueFilteredQuestions,
        handleUpdateStatus,
        showMessage
    });

"""
    
    content = content.replace(old_bulk_callbacks, new_bulk_section)
    
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Refactored App.jsx to use useBulkSelection hook")
    print("   - Added import for useBulkSelection")
    print("   - Removed selection state declaration")
    print("   - Removed toggleSelection and clearSelection handlers")
    print("   - Replaced selectAll and bulkUpdateStatus with hook call")

if __name__ == '__main__':
    refactor_app_jsx()
