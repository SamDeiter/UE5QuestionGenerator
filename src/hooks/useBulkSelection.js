/**
 * useBulkSelection Hook
 * 
 * Manages bulk selection state and operations for question lists:
 * - Selected IDs set
 * - Toggle selection
 * - Clear selection
 * - Select all
 * - Bulk update status
 */
import { useState, useCallback } from 'react';

/**
 * Custom hook for managing bulk selection of questions.
 * 
 * @param {Object} params - Hook parameters
 * @param {Array} params.items - Array of items that can be selected (must have 'id' property)
 * @param {Function} params.handleUpdateStatus - Function to update question status
 * @param {Function} params.showMessage - Function to show toast message
 * @returns {Object} Selection state and handlers
 */
export function useBulkSelection({ items = [], handleUpdateStatus, showMessage }) {
    const [selectedIds, setSelectedIds] = useState(new Set());

    /**
     * Toggle selection of a single item.
     * 
     * @param {string|number} id - Item ID to toggle
     */
    const toggleSelection = useCallback((id) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    }, []);

    /**
     * Clear all selected items.
     */
    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    /**
     * Select all items in the current list.
     */
    const selectAll = useCallback(() => {
        setSelectedIds(new Set(items.map(item => item.id)));
    }, [items]);

    /**
     * Update status of all selected items.
     * 
     * @param {string} status - New status ('accepted', 'rejected', 'pending')
     * @param {string|null} rejectionReason - Optional rejection reason
     */
    const bulkUpdateStatus = useCallback((status, rejectionReason = null) => {
        selectedIds.forEach(id => handleUpdateStatus(id, status, rejectionReason));
        clearSelection();
        showMessage(`${status === 'accepted' ? 'Accepted' : 'Rejected'} ${selectedIds.size} questions`);
    }, [selectedIds, handleUpdateStatus, clearSelection, showMessage]);

    return {
        selectedIds,
        toggleSelection,
        clearSelection,
        selectAll,
        bulkUpdateStatus
    };
}
