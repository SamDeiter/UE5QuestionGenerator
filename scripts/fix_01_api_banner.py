"""
Fix #1: Add API Key Status Banner to LandingPage
Adds a prominent banner when API key is missing with a "Configure Now" button.
"""

import sys
from pathlib import Path

# Add tools directory to path
sys.path.insert(0, str(Path(__file__).parent))
from jsx_editor import JSXEditor


def add_api_banner_to_landing_page(editor, file_path):
    """Add API key status banner to LandingPage.jsx"""
    
    def edit_function(content):
        # 1. Add onOpenSettings to component props
        props_pattern = 'const LandingPage = ({ onSelectMode, apiKeyStatus, isCloudReady }'
        new_props = 'const LandingPage = ({ onSelectMode, apiKeyStatus, isCloudReady, onOpenSettings }'
        content = content.replace(props_pattern, new_props)
        
        # 2. Add the banner JSX right after the opening div
        banner_code = '''
        {/* API Key Missing Banner */}
        {(!apiKeyStatus.includes('Loaded') && !apiKeyStatus.includes('Auto')) && (
            <div className="fixed top-0 left-0 right-0 z-50 bg-orange-900/90 border-b border-orange-700 p-3 flex items-center justify-between backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <Icon name="alert-triangle" className="text-orange-300" size={20} />
                    <span className="text-white font-medium">API Key Not Configured - Question generation is disabled</span>
                </div>
                <button 
                    onClick={onOpenSettings} 
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors duration-200 font-medium"
                    aria-label="Open settings to configure API key"
                >
                    Configure Now
                </button>
            </div>
        )}
'''
        
        insert_point = '    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4 relative overflow-hidden">'
        content = content.replace(insert_point, insert_point + banner_code)
        
        return content
    
    editor.safe_edit(file_path, edit_function)
    print("[OK] Added API key banner to LandingPage.jsx")


def update_app_jsx(editor, file_path):
    """Update App.jsx to pass onOpenSettings prop to LandingPage"""
    
    def edit_function(content):
        # Find the LandingPage component usage and add the prop
        pattern = '''<LandingPage
                        onSelectMode={handleModeSelect}
                        apiKeyStatus={apiKeyStatus}
                        isCloudReady={isCloudReady}'''
        
        replacement = '''<LandingPage
                        onSelectMode={handleModeSelect}
                        apiKeyStatus={apiKeyStatus}
                        isCloudReady={isCloudReady}
                        onOpenSettings={() => setShowSettings(true)}'''
        
        if pattern in content:
            content = content.replace(pattern, replacement)
        else:
            print("[WARN] Warning: Could not find exact LandingPage pattern, trying alternative...")
            # Try to find it with regex
            import re
            alt_pattern = r'(<LandingPage[^/>]*?apiKeyStatus=\{apiKeyStatus\}[^/>]*?isCloudReady=\{isCloudReady\})'
            match = re.search(alt_pattern, content)
            if match:
                old_tag = match.group(1)
                new_tag = old_tag + '\n                        onOpenSettings={() => setShowSettings(true)}'
                content = content.replace(old_tag, new_tag)
            
        return content
    
    editor.safe_edit(file_path, edit_function)
    print("[OK] Updated App.jsx to pass onOpenSettings prop")


if __name__ == '__main__':
    project_root = Path(__file__).parent.parent
    editor = JSXEditor(project_root)
    
    landing_page_path = project_root / 'src' / 'components' / 'LandingPage.jsx'
    app_path = project_root / 'src' / 'App.jsx'
    
    print("=" * 60)
    print("Fix #1: API Key Status Banner Implementation")
    print("=" * 60)
    
    try:
        add_api_banner_to_landing_page(editor, landing_page_path)
        update_app_jsx(editor, app_path)
        
        print("\n[SUCCESS] Fix #1 Complete!")
        print(f"Backups saved to: {editor.backup_dir}")
        
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
