import { useState, useEffect, useCallback } from 'react';
import { getQuestionsFromFirestore } from '../services/firebase';

/**
 * useCrashRecovery - Detects potential data loss from crashes and offers to restore from Firestore
 * 
 * Detection heuristics:
 * 1. LocalStorage has fewer questions than expected from last session
 * 2. Firestore has questions but localStorage is empty
 * 3. Session flag indicates unexpected termination
 */
export const useCrashRecovery = (localQuestions, addQuestionsToState, showMessage) => {
    const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
    const [recoveryData, setRecoveryData] = useState(null);
    const [isRecovering, setIsRecovering] = useState(false);

    // Check for crash on mount
    useEffect(() => {
        const checkForCrash = async () => {
            try {
                // Get session info
                const lastSessionCount = parseInt(localStorage.getItem('ue5_last_session_count') || '0');
                const sessionActive = localStorage.getItem('ue5_session_active');
                const currentLocalCount = localQuestions.length;

                // If session was marked active but we have fewer questions, might be a crash
                const possibleCrash = sessionActive === 'true' && currentLocalCount < lastSessionCount;
                const localEmpty = currentLocalCount === 0;

                if (possibleCrash || localEmpty) {
                    // Check Firestore for backup data
                    console.log('🔍 Checking Firestore for recoverable data...');
                    const firestoreQuestions = await getQuestionsFromFirestore();

                    if (firestoreQuestions.length > currentLocalCount) {
                        console.log(`📦 Found ${firestoreQuestions.length} questions in Firestore (local has ${currentLocalCount})`);
                        setRecoveryData({
                            firestoreCount: firestoreQuestions.length,
                            localCount: currentLocalCount,
                            questions: firestoreQuestions
                        });
                        setShowRecoveryPrompt(true);
                    }
                }

                // Mark session as active
                localStorage.setItem('ue5_session_active', 'true');
            } catch (error) {
                console.warn('Crash recovery check failed:', error);
            }
        };

        // Delay check to allow auth to settle
        const timer = setTimeout(checkForCrash, 2000);
        return () => clearTimeout(timer);
    }, [localQuestions.length]);

    // Update session count periodically
    useEffect(() => {
        const interval = setInterval(() => {
            localStorage.setItem('ue5_last_session_count', localQuestions.length.toString());
        }, 10000); // Every 10 seconds

        return () => clearInterval(interval);
    }, [localQuestions.length]);

    // Clean up session flag on proper unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            localStorage.setItem('ue5_session_active', 'false');
            localStorage.setItem('ue5_last_session_count', localQuestions.length.toString());
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [localQuestions.length]);

    // Recovery action
    const handleRecover = useCallback(async () => {
        if (!recoveryData) return;

        setIsRecovering(true);
        try {
            // Merge Firestore questions into local state
            const existingIds = new Set(localQuestions.map(q => q.uniqueId));
            const newQuestions = recoveryData.questions.filter(q => !existingIds.has(q.uniqueId));

            if (newQuestions.length > 0) {
                addQuestionsToState(newQuestions, true);
                showMessage(`✅ Recovered ${newQuestions.length} questions from cloud backup!`, 5000);
            }

            setShowRecoveryPrompt(false);
            setRecoveryData(null);
        } catch (error) {
            console.error('Recovery failed:', error);
            showMessage('❌ Recovery failed. Please try loading from Database View.', 5000);
        } finally {
            setIsRecovering(false);
        }
    }, [recoveryData, localQuestions, addQuestionsToState, showMessage]);

    const dismissRecovery = useCallback(() => {
        setShowRecoveryPrompt(false);
        setRecoveryData(null);
        // Mark that user dismissed, don't prompt again this session
        localStorage.setItem('ue5_recovery_dismissed', 'true');
    }, []);

    return {
        showRecoveryPrompt,
        recoveryData,
        isRecovering,
        handleRecover,
        dismissRecovery
    };
};
