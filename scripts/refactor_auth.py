"""
Refactor App.jsx to use the new useAuth hook.

This script:
1. Adds the import for useAuth
2. Removes the inline auth/compliance state and effects
3. Adds the useAuth hook call
4. Removes now-unused imports
"""

def refactor_app_jsx():
    """Refactor App.jsx to use useAuth hook."""
    
    with open('src/App.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add import for useAuth after useBulkSelection import
    old_import = "import { useBulkSelection } from './hooks/useBulkSelection';"
    new_import = """import { useBulkSelection } from './hooks/useBulkSelection';
import { useAuth } from './hooks/useAuth';"""
    content = content.replace(old_import, new_import)
    
    # 2. Remove the old utility imports that are now in useAuth
    old_util_import = """import { getTokenUsage } from './utils/analyticsStore';
import { auth, getCustomTags, saveCustomTags } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';"""
    new_util_import = """import { saveCustomTags } from './services/firebase';"""
    content = content.replace(old_util_import, new_util_import)
    
    # 3. Replace the inline auth state and effects with hook call
    old_auth_section = """    // ========================================================================
    // STATE - Token Usage and Auth
    // ========================================================================
    const [tokenUsage, setTokenUsage] = useState(() => getTokenUsage());
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [customTags, setCustomTags] = useState({});

    // Compliance modals
    const [showTerms, setShowTerms] = useState(false);
    const [showAgeGate, setShowAgeGate] = useState(false);
    const [_termsAccepted, setTermsAccepted] = useState(false);

    // Listen for auth state changes and load custom tags
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Load custom tags from Firestore
                try {
                    const tags = await getCustomTags();
                    setCustomTags(tags);
                } catch (error) {
                    console.error("Failed to load custom tags:", error);
                }
            }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Refresh token usage periodically and after generations
    useEffect(() => {
        const interval = setInterval(() => setTokenUsage(getTokenUsage()), 5000);
        return () => clearInterval(interval);
    }, []);

    // Check compliance status on app load
    useEffect(() => {
        const ageVerified = localStorage.getItem('ue5_age_verified');
        const termsAcceptedStorage = localStorage.getItem('ue5_terms_accepted');

        if (!ageVerified) {
            setShowAgeGate(true);
        } else if (!termsAcceptedStorage) {
            setShowTerms(true);
        } else {
            setTermsAccepted(true);
        }
    }, []);

"""
    
    new_auth_section = """    // ========================================================================
    // HOOKS - Auth, Custom Tags, and Compliance (extracted to useAuth)
    // ========================================================================
    const {
        user,
        authLoading,
        customTags,
        setCustomTags,
        handleSaveCustomTags,
        tokenUsage,
        showTerms,
        setShowTerms,
        showAgeGate,
        setShowAgeGate,
        termsAccepted: _termsAccepted,
        setTermsAccepted
    } = useAuth(showMessage);

"""
    
    content = content.replace(old_auth_section, new_auth_section)
    
    # 4. Update the onSaveCustomTags handler to use handleSaveCustomTags
    old_save_tags = """onSaveCustomTags: async (newTags) => {
                        try {
                            await saveCustomTags(newTags);
                            setCustomTags(newTags);
                            showMessage("Custom tags saved!", 2000);
                        } catch {
                            showMessage("Failed to save tags", 3000);
                        }
                    },"""
    new_save_tags = """onSaveCustomTags: handleSaveCustomTags,"""
    content = content.replace(old_save_tags, new_save_tags)
    
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Refactored App.jsx to use useAuth hook")
    print("   - Added import for useAuth")
    print("   - Removed auth/compliance state declarations")
    print("   - Removed auth-related useEffect hooks")
    print("   - Replaced inline onSaveCustomTags with handleSaveCustomTags")

if __name__ == '__main__':
    refactor_app_jsx()
