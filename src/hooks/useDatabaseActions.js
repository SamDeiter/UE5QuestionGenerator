import { useCallback } from 'react';
import { deleteQuestionFromFirestore } from '../services/firebase';

/**
 * Hook for managing database view actions.
 * Handles updating database questions and kicking questions back to review.
 * 
 * @param {Object} params - Hook parameters
 * @param {Function} params.setDatabaseQuestions - Setter for database questions state
 * @param {Function} params.setHistoricalQuestions - Setter for historical questions state
 * @param {Function} params.showMessage - Function to display toast messages
 * @returns {Object} Database action handlers
 */
export const useDatabaseActions = ({
    setDatabaseQuestions,
    setHistoricalQuestions,
    showMessage
}) => {
    /**
     * Update a single question in the database view (local only).
     * User must sync to Firestore manually.
     * 
     * @param {string|number} id - Question ID
     * @param {Object|Function} update - Update data or updater function
     */
    const handleUpdateDatabaseQuestion = useCallback((id, update) => {
        setDatabaseQuestions(prev => prev.map(q => {
            if (q.id !== id) return q;
            const newData = typeof update === 'function' ? update(q) : update;
            return { ...q, ...newData };
        }));
        showMessage("Question updated locally. Click 'Sync to Firestore' to save changes.", 3000);
    }, [setDatabaseQuestions, showMessage]);

    /**
     * Remove question from database and send it back to Review Mode.
     * Deletes from Firestore and adds to historical questions as pending.
     * 
     * @param {Object} question - Question to kick back
     */
    const handleKickBackToReview = useCallback(async (question) => {
        try {
            // Delete from Firestore
            await deleteQuestionFromFirestore(question.uniqueId);

            // Remove from database view
            setDatabaseQuestions(prev => prev.filter(q => q.uniqueId !== question.uniqueId));

            // Add to historical questions with 'pending' status so it appears in Review Mode
            setHistoricalQuestions(prev => {
                // Check if already exists to prevent duplicates
                if (prev.some(q => q.uniqueId === question.uniqueId)) {
                    return prev.map(q => q.uniqueId === question.uniqueId ? { ...question, status: 'pending' } : q);
                }
                return [...prev, { ...question, status: 'pending' }];
            });

            showMessage("Question removed from database and sent to Review Mode.", 3000);
        } catch (error) {
            console.error("Error kicking back question:", error);
            showMessage("Failed to kick back question. Please try again.", 3000);
        }
    }, [setDatabaseQuestions, setHistoricalQuestions, showMessage]);

    return {
        handleUpdateDatabaseQuestion,
        handleKickBackToReview
    };
};
