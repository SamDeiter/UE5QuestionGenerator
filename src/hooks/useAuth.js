/**
 * useAuth Hook
 * 
 * Manages authentication state, custom tags, and compliance modals:
 * - Firebase authentication state
 * - Custom tags from Firestore
 * - Token usage tracking
 * - Age verification and terms acceptance modals
 */
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, getCustomTags, saveCustomTags } from '../services/firebase';
import { getTokenUsage } from '../utils/analyticsStore';

// Hardcoded whitelist for Admin access (Create Mode, Settings)
const ADMIN_EMAILS = [
    'sam.deiter@epicgames.com',
    'samdeiter@gmail.com',
    // Add other admin emails here
];

/**
 * Custom hook for managing authentication and compliance state.
 * 
 * @param {Function} showMessage - Function to display toast messages
 * @returns {Object} Auth state, custom tags, compliance state and handlers
 */
export function useAuth(showMessage) {
    // ========================================================================
    // STATE
    // ========================================================================
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [customTags, setCustomTags] = useState({});
    const [tokenUsage, setTokenUsage] = useState(() => getTokenUsage());
    
    // Compliance modals
    const [showTerms, setShowTerms] = useState(false);
    const [showAgeGate, setShowAgeGate] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    // ========================================================================
    // EFFECTS
    // ========================================================================

    // Listen for auth state changes and load custom tags
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            
            // Determine Admin Status
            if (currentUser && currentUser.email) {
                const isWhitelisted = ADMIN_EMAILS.includes(currentUser.email.toLowerCase());
                setIsAdmin(isWhitelisted);
            } else {
                setIsAdmin(false);
            }

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

    // Refresh token usage periodically
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

    // ========================================================================
    // HANDLERS
    // ========================================================================

    /**
     * Save custom tags to Firestore.
     * 
     * @param {Object} newCustomTags - New custom tags object
     */
    const handleSaveCustomTags = async (newCustomTags) => {
        try {
            await saveCustomTags(newCustomTags);
            setCustomTags(newCustomTags);
            showMessage("Custom tags saved!", 2000);
        } catch (error) {
            console.error("Failed to save custom tags:", error);
            showMessage("Failed to save tags", 3000);
        }
    };

    // ========================================================================
    // RETURN
    // ========================================================================
    return {
        // Auth state
        user,
        authLoading,
        isAdmin,
        
        // Custom tags
        customTags,
        setCustomTags,
        handleSaveCustomTags,
        
        // Token usage
        tokenUsage,
        
        // Compliance
        showTerms,
        setShowTerms,
        showAgeGate,
        setShowAgeGate,
        termsAccepted,
        setTermsAccepted
    };
}
