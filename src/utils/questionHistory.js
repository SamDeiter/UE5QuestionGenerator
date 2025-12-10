/**
 * Question History Manager
 * Provides undo/redo functionality for question edits
 */

const HISTORY_KEY_PREFIX = 'question_history_';
const MAX_HISTORY_SIZE = 10; // Keep last 10 states per question

/**
 * Saves a question state to history
 * @param {string} questionId - Question ID
 * @param {Object} questionState - Question state to save
 */
export const saveQuestionHistory = (questionId, questionState) => {
    try {
        const historyKey = `${HISTORY_KEY_PREFIX}${questionId}`;
        const history = getQuestionHistory(questionId);
        
        // Add new state to history
        history.states.push({
            timestamp: new Date().toISOString(),
            state: JSON.parse(JSON.stringify(questionState)) // Deep clone
        });
        
        // Keep only last MAX_HISTORY_SIZE states
        if (history.states.length > MAX_HISTORY_SIZE) {
            history.states = history.states.slice(-MAX_HISTORY_SIZE);
        }
        
        // Reset current pointer to end
        history.currentIndex = history.states.length - 1;
        
        localStorage.setItem(historyKey, JSON.stringify(history));
    } catch (error) {
        console.error('Error saving question history:', error);
    }
};

/**
 * Gets question history
 * @param {string} questionId - Question ID
 * @returns {Object} History object with states and currentIndex
 */
export const getQuestionHistory = (questionId) => {
    try {
        const historyKey = `${HISTORY_KEY_PREFIX}${questionId}`;
        const data = localStorage.getItem(historyKey);
        return data ? JSON.parse(data) : { states: [], currentIndex: -1 };
    } catch (error) {
        console.error('Error reading question history:', error);
        return { states: [], currentIndex: -1 };
    }
};

/**
 * Undo last change
 * @param {string} questionId - Question ID
 * @returns {Object|null} Previous state or null if can't undo
 */
export const undoQuestionChange = (questionId) => {
    try {
        const history = getQuestionHistory(questionId);
        
        if (history.currentIndex > 0) {
            history.currentIndex--;
            const historyKey = `${HISTORY_KEY_PREFIX}${questionId}`;
            localStorage.setItem(historyKey, JSON.stringify(history));
            return history.states[history.currentIndex].state;
        }
        
        return null; // Can't undo
    } catch (error) {
        console.error('Error undoing question change:', error);
        return null;
    }
};

/**
 * Redo last undone change
 * @param {string} questionId - Question ID
 * @returns {Object|null} Next state or null if can't redo
 */
export const redoQuestionChange = (questionId) => {
    try {
        const history = getQuestionHistory(questionId);
        
        if (history.currentIndex < history.states.length - 1) {
            history.currentIndex++;
            const historyKey = `${HISTORY_KEY_PREFIX}${questionId}`;
            localStorage.setItem(historyKey, JSON.stringify(history));
            return history.states[history.currentIndex].state;
        }
        
        return null; // Can't redo
    } catch (error) {
        console.error('Error redoing question change:', error);
        return null;
    }
};

/**
 * Checks if undo is available
 * @param {string} questionId - Question ID
 * @returns {boolean} True if can undo
 */
export const canUndo = (questionId) => {
    const history = getQuestionHistory(questionId);
    return history.currentIndex > 0;
};

/**
 * Checks if redo is available
 * @param {string} questionId - Question ID
 * @returns {boolean} True if can redo
 */
export const canRedo = (questionId) => {
    const history = getQuestionHistory(questionId);
    return history.currentIndex < history.states.length - 1;
};

/**
 * Clears history for a question
 * @param {string} questionId - Question ID
 */
export const clearQuestionHistory = (questionId) => {
    try {
        const historyKey = `${HISTORY_KEY_PREFIX}${questionId}`;
        localStorage.removeItem(historyKey);
    } catch (error) {
        console.error('Error clearing question history:', error);
    }
};

/**
 * Clears all question histories
 */
export const clearAllHistories = () => {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(HISTORY_KEY_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.error('Error clearing all histories:', error);
    }
};
