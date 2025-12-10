/**
 * useModalState Hook
 * 
 * Manages all modal visibility states in the application:
 * - Export menu
 * - Bulk export modal
 * - Analytics modal
 * - Data menu
 * - Advanced config
 * - Danger zone
 * - API Key modal
 * 
 * Also handles click-outside for dropdown menus.
 */
import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for managing modal and menu visibility states.
 * 
 * @returns {Object} Modal states, refs, and handlers
 */
export function useModalState() {
    // ========================================================================
    // STATE
    // ========================================================================
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showBulkExportModal, setShowBulkExportModal] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [dataMenuOpen, setDataMenuOpen] = useState(false);
    const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
    const [showDangerZone, setShowDangerZone] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    
    // Refs
    const dataMenuRef = useRef(null);

    // ========================================================================
    // EFFECTS
    // ========================================================================

    // Set up global function for Settings modal to open DangerZone
    useEffect(() => {
        window.openDangerZone = () => setShowDangerZone(true);
        return () => { delete window.openDangerZone; };
    }, []);

    // Click-outside handler for Data dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dataMenuRef.current && !dataMenuRef.current.contains(event.target)) {
                setDataMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ========================================================================
    // RETURN
    // ========================================================================
    return {
        // Export menu
        showExportMenu,
        setShowExportMenu,
        
        // Bulk export modal
        showBulkExportModal,
        setShowBulkExportModal,
        
        // Analytics
        showAnalytics,
        setShowAnalytics,
        
        // Data menu
        dataMenuOpen,
        setDataMenuOpen,
        dataMenuRef,
        
        // Advanced config
        showAdvancedConfig,
        setShowAdvancedConfig,
        
        // Danger zone
        showDangerZone,
        setShowDangerZone,
        
        // API Key modal
        showApiKeyModal,
        setShowApiKeyModal
    };
}
