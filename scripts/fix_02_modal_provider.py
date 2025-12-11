"""
Fix #2: Create Modal Management System
Creates a ModalProvider context to manage modal state centrally.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from jsx_editor import JSXEditor


MODAL_PROVIDER_CONTENT = """import React, { createContext, useContext, useState, useEffect } from 'react';

const ModalContext = createContext();

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};

export const ModalProvider = ({ children }) => {
    const [activeModal, setActiveModal] = useState(null);
    const [modalProps, setModalProps] = useState({});

    const openModal = (modalName, props = {}) => {
        setActiveModal(modalName);
        setModalProps(props);
    };

    const closeModal = () => {
        setActiveModal(null);
        setModalProps({});
    };

    // ESC key support
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && activeModal) {
                closeModal();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [activeModal]);

    const value = {
        activeModal,
        modalProps,
        openModal,
        closeModal,
        isModalOpen: (modalName) => activeModal === modalName,
    };

    return (
        <ModalContext.Provider value={value}>
            {children}
        </ModalContext.Provider>
    );
};

export default ModalProvider;
"""


def create_modal_provider(editor, contexts_dir, file_path):
    """Create the ModalProvider context component"""
    
    # Create contexts directory if it doesn't exist
    contexts_dir.mkdir(exist_ok=True)
    
    # Write the ModalProvider component
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(MODAL_PROVIDER_CONTENT)
    
    print(f"[OK] Created {file_path.name}")


def update_main_jsx(editor, file_path):
    """Wrap App with ModalProvider in main.jsx"""
    
    def edit_function(content):
        # Add import for ModalProvider
        import_line = "import ModalProvider from './contexts/ModalProvider';"
        
        # Find where to insert import (after other imports)
        if 'import App from' in content:
            content = content.replace(
                "import App from './App.jsx';",
                "import App from './App.jsx';\nimport ModalProvider from './contexts/ModalProvider';"
            )
        
        # Wrap App with ModalProvider
        old_root_render = '''root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);'''
        
        new_root_render = '''root.render(
  <React.StrictMode>
    <ModalProvider>
      <App />
    </ModalProvider>
  </React.StrictMode>,
);'''
        
        if old_root_render in content:
            content = content.replace(old_root_render, new_root_render)
        else:
            # Try alternative format
            content = content.replace(
                '<App />',
                '<ModalProvider>\n      <App />\n    </ModalProvider>'
            )
        
        return content
    
    editor.safe_edit(file_path, edit_function)
    print("[OK] Updated main.jsx to include ModalProvider")


def add_modal_wrapper_component(editor, project_root):
    """Create a reusable ModalWrapper component"""
    
    modal_wrapper_content = """import React from 'react';
import Icon from './Icon';

const ModalWrapper = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className={`relative bg-slate-900 rounded-xl ${maxWidth} w-full shadow-2xl border border-slate-800`}>
                {/* Header with close button */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 id="modal-title" className="text-xl font-bold text-white">
                        {title}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
                        aria-label="Close modal"
                    >
                        <Icon name="x" size={24} />
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default ModalWrapper;
"""
    
    modal_wrapper_path = project_root / 'src' / 'components' / 'ModalWrapper.jsx'
    with open(modal_wrapper_path, 'w', encoding='utf-8') as f:
        f.write(modal_wrapper_content)
    
    print(f"[OK] Created ModalWrapper.jsx")


if __name__ == '__main__':
    project_root = Path(__file__).parent.parent
    editor = JSXEditor(project_root)
    
    contexts_dir = project_root / 'src' / 'contexts'
    modal_provider_path = contexts_dir / 'ModalProvider.jsx'
    main_jsx_path = project_root / 'src' / 'main.jsx'
    
    print("=" * 60)
    print("Fix #2: Modal Management System Implementation")
    print("=" * 60)
    
    try:
        create_modal_provider(editor, contexts_dir, modal_provider_path)
        update_main_jsx(editor, main_jsx_path)
        add_modal_wrapper_component(editor, project_root)
        
        print("\n[SUCCESS] Fix #2 Complete!")
        print("Note: Individual modal components should be updated to use ModalWrapper")
        print(f"Backups saved to: {editor.backup_dir}")
        
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
