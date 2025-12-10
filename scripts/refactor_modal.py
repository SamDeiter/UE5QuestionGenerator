"""
Refactor App.jsx to use the new useModalState hook.

This script:
1. Adds the import for useModalState
2. Removes the inline modal state declarations
3. Removes the useEffect hooks for click-outside and global DangerZone
4. Adds the useModalState hook call
"""

def refactor_app_jsx():
    """Refactor App.jsx to use useModalState hook."""
    
    with open('src/App.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add import for useModalState after useAuth import
    old_import = "import { useAuth } from './hooks/useAuth';"
    new_import = """import { useAuth } from './hooks/useAuth';
import { useModalState } from './hooks/useModalState';"""
    content = content.replace(old_import, new_import)
    
    # 2. Remove the inline modal state and effects, add hook call
    old_modal_section = """    // 7. Export Logic
    const [_showExportMenu, setShowExportMenu] = useState(false);
    const [showBulkExportModal, setShowBulkExportModal] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [_dataMenuOpen, setDataMenuOpen] = useState(false);
    const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
    const [showDangerZone, setShowDangerZone] = useState(false);
    const dataMenuRef = useRef(null);

    // Set up global function for Settings modal to open DangerZone
    useEffect(() => {
        window.openDangerZone = () => setShowDangerZone(true);
        return () => { delete window.openDangerZone; };
    }, []);

"""
    
    new_modal_section = """    // 7. Modal State (extracted to useModalState hook)
    const {
        showExportMenu: _showExportMenu,
        setShowExportMenu,
        showBulkExportModal,
        setShowBulkExportModal,
        showAnalytics,
        setShowAnalytics,
        dataMenuOpen: _dataMenuOpen,
        setDataMenuOpen,
        dataMenuRef,
        showAdvancedConfig,
        setShowAdvancedConfig,
        showDangerZone,
        setShowDangerZone,
        showApiKeyModal,
        setShowApiKeyModal
    } = useModalState();

"""
    
    content = content.replace(old_modal_section, new_modal_section)
    
    # 3. Remove the inline API Key Modal State since it's now in useModalState
    old_api_key_state = """    // API Key Modal State (simpler than full settings)
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);

"""
    content = content.replace(old_api_key_state, "")
    
    # 4. Remove the click-outside effect (now in useModalState)
    old_click_outside = """    // Click-outside handler for Data dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dataMenuRef.current && !dataMenuRef.current.contains(event.target)) {
                setDataMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

"""
    content = content.replace(old_click_outside, "")
    
    # 5. Remove useRef from imports since it's now in useModalState
    old_react_import = "import { useState, useEffect, Suspense, useRef } from 'react';"
    new_react_import = "import { useState, useEffect, Suspense } from 'react';"
    content = content.replace(old_react_import, new_react_import)
    
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Refactored App.jsx to use useModalState hook")
    print("   - Added import for useModalState")
    print("   - Replaced 7 modal state declarations with hook call")
    print("   - Removed click-outside useEffect")
    print("   - Removed DangerZone global function useEffect")
    print("   - Removed useRef import (now in hook)")

if __name__ == '__main__':
    refactor_app_jsx()
