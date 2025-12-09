"""
Fix #3: Safe Bulk Actions with Confirmation
Enhances bulk actions in ReviewMode with pre-confirmation and undo support.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from jsx_editor import JSXEditor


def enhance_confirm_dialog(editor, file_path):
    """Enhance ConfirmDialog to support custom buttons and better styling"""
    
    def edit_function(content):
        # Check if it already has the enhanced structure
        if 'confirmButtonText' in content and 'cancelButtonText' in content:
            print("  ConfirmDialog already appears to be enhanced, skipping...")
            return content
        
        # Add custom button text props
        old_signature = 'const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel }'
        new_signature = 'const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmButtonText = "Confirm", cancelButtonText = "Cancel", confirmButtonColor = "bg-green-600 hover:bg-green-700", affectedCount = null }'
        
        if old_signature in content:
            content = content.replace(old_signature, new_signature)
        
        # Update button text to use props
        content = content.replace(
            '>Confirm<',
            '>{confirmButtonText}<'
        )
        content = content.replace(
            '>Cancel<',
            '>{cancelButtonText}<'
        )
        
        # Add affected count display
        if '<p className="text-slate-300 mb-6">{message}</p>' in content:
            content = content.replace(
                '<p className="text-slate-300 mb-6">{message}</p>',
                '''<div className="mb-6">
                    <p className="text-slate-300">{message}</p>
                    {affectedCount !== null && (
                        <p className="text-orange-400 font-semibold mt-2">
                            This will affect {affectedCount} question{affectedCount !== 1 ? 's' : ''}.
                        </p>
                    )}
                </div>'''
            )
        
        return content
    
    editor.safe_edit(file_path, edit_function)
    print("[OK] Enhanced ConfirmDialog.jsx")


def update_app_bulk_actions(editor, file_path):
    """Update App.jsx bulk action handlers with confirmation and undo"""
    
    def edit_function(content):
        # Find and update handleBulkAcceptHighScores
        old_bulk_accept = '''// Bulk accept all questions with critique score >= 70
    const handleBulkAcceptHighScores = async () => {'''
        
        new_bulk_accept = '''// Bulk accept all questions with critique score >= 70
    const handleBulkAcceptHighScores = async () => {
        const highScoreQuestions = questions.filter(q => q.critiqueScore >= 70);
        const affectedCount = highScoreQuestions.length;
        
        if (affectedCount === 0) {
            showToast('No high-scoring questions to approve', 'info');
            return;
        }
        
        // Show confirmation dialog
        setConfirmDialog({
            isOpen: true,
            title: 'Bulk Approve High-Scoring Questions',
            message: 'This will approve all questions with critique scores ≥ 70%. This action can be undone for 10 seconds.',
            affectedCount: affectedCount,
            confirmButtonText: 'Approve All',
            cancelButtonText: 'Cancel',
            confirmButtonColor: 'bg-green-600 hover:bg-green-700',
            onConfirm: async () => {'''
        
        if old_bulk_accept in content:
            content = content.replace(old_bulk_accept, new_bulk_accept)
            
            # Find the end of the function and wrap it
            # Add the closing for the onConfirm callback
            # This is simplified - in reality you'd need more sophisticated parsing
        
        return content
    
    editor.safe_edit(file_path, edit_function)
    print("[OK] Updated App.jsx bulk actions")


def create_toast_with_undo(editor, project_root):
    """Create an enhanced Toast component with undo support"""
    
    toast_undo_content = """import React, { useEffect } from 'react';
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
"""
    
    toast_path = project_root / 'src' / 'components' / 'Toast.jsx'
    
    # Backup existing Toast.jsx
    editor.backup_file(toast_path)
    
    with open(toast_path, 'w', encoding='utf-8') as f:
        f.write(toast_undo_content)
    
    print("[OK] Enhanced Toast.jsx with undo action support")


if __name__ == '__main__':
    project_root = Path(__file__).parent.parent
    editor = JSXEditor(project_root)
    
    confirm_dialog_path = project_root / 'src' / 'components' / 'ConfirmDialog.jsx'
    app_path = project_root / 'src' / 'App.jsx'
    
    print("=" * 60)
    print("Fix #3: Safe Bulk Actions Implementation")
    print("=" * 60)
    
    try:
        enhance_confirm_dialog(editor, confirm_dialog_path)
        create_toast_with_undo(editor, project_root)
        # update_app_bulk_actions(editor, app_path)  # Commented out - requires careful App.jsx editing
        
        print("\n[SUCCESS] Fix #3 Partial Complete!")
        print("Note: App.jsx bulk action handlers need manual review for specific integration")
        print(f"Backups saved to: {editor.backup_dir}")
        
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
