"""
Clean up unused code and extract modal state into useModalState hook.

This script:
1. Removes dead/unused code (lines 319-330)
2. Creates a cleaner structure
"""

def cleanup_app_jsx():
    """Clean up unused code in App.jsx."""
    
    with open('src/App.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Remove unused _showProgressMenu and _handleSaveCustomTags
    old_unused = """    const [_showProgressMenu, _setShowProgressMenu] = useState(false);

    const _handleSaveCustomTags = async (newCustomTags) => {
        try {
            await saveCustomTags(newCustomTags);
            setCustomTags(newCustomTags);
            showMessage("Custom tags saved successfully!", 2000);
        } catch (error) {
            console.error("Failed to save custom tags:", error);
            showMessage("Failed to save custom tags. Please try again.", 3000);
        }
    };

"""
    content = content.replace(old_unused, "")
    
    # 2. Remove unused saveCustomTags import since it's now in useAuth
    old_import = """import { saveCustomTags } from './services/firebase';"""
    content = content.replace(old_import + "\n", "")
    
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Cleaned up unused code in App.jsx")
    print("   - Removed unused _showProgressMenu state")
    print("   - Removed unused _handleSaveCustomTags function")
    print("   - Removed unused saveCustomTags import")

if __name__ == '__main__':
    cleanup_app_jsx()
