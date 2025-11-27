// ============================================================================
// QUESTION FILTERING UTILITIES
// ============================================================================

/**
 * Primary filter: Filters questions by status, creator, search term, discipline, difficulty, type, and language
 * @param {Array} questions - Current session questions
 * @param {Array} historicalQuestions - Historical questions from previous sessions
 * @param {boolean} showHistory - Whether to show all questions or just current session
 * @param {string} filterMode - Filter by status: 'pending', 'accepted', 'rejected', or 'all'
 * @param {boolean} filterByCreator - Whether to filter by creator name
 * @param {string} searchTerm - Text search term
 * @param {string} creatorName - Current user's creator name
 * @param {string} discipline - Selected discipline (e.g., 'Technical Art')
 * @param {string} difficulty - Selected difficulty setting (e.g., 'Easy MC', 'Hard T/F', or 'Balanced All')
 * @param {string} language - Selected language (e.g., 'English', 'Chinese (Simplified)')
 * @returns {Array} Filtered questions
 */
export const createFilteredQuestions = (
    questions,
    historicalQuestions,
    showHistory,
    filterMode,
    filterByCreator,
    searchTerm,
    creatorName,
    discipline,
    difficulty,
    language
) => {
    // Determine source: either current session or all history
    const sourceQuestions = showHistory ? [...questions, ...historicalQuestions] : questions;

    return sourceQuestions.filter(q => {
        // Filter by status (pending, accepted, rejected)
        if (filterMode === 'pending' && q.status !== 'pending') return false;
        if (filterMode === 'accepted' && q.status !== 'accepted') return false;
        if (filterMode === 'rejected' && q.status !== 'rejected') return false;

        // Filter by creator
        if (filterByCreator && q.creatorName !== creatorName) return false;

        // Filter by discipline
        if (discipline && q.discipline !== discipline) return false;

        // Filter by difficulty and type (if not "Balanced All")
        if (difficulty && difficulty !== 'Balanced All') {
            const [targetDiff, targetTypeAbbrev] = difficulty.split(' ');
            const targetType = targetTypeAbbrev === 'MC' ? 'Multiple Choice' : 'True/False';

            if (q.difficulty !== targetDiff || q.type !== targetType) return false;
        }

        // Filter by search term (searches across multiple fields)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchesId = q.uniqueId && q.uniqueId.toLowerCase().includes(term);
            const matchesQuestion = q.question && q.question.toLowerCase().includes(term);
            const matchesDiscipline = q.discipline && q.discipline.toLowerCase().includes(term);
            const matchesDifficulty = q.difficulty && q.difficulty.toLowerCase().includes(term);
            const matchesOptions = q.options && Object.values(q.options).some(opt =>
                opt && opt.toLowerCase().includes(term)
            );

            if (!matchesId && !matchesQuestion && !matchesDiscipline && !matchesDifficulty && !matchesOptions) {
                return false;
            }
        }

        return true;
    });
};

/**
 * Secondary filter: Groups questions by uniqueId and selects one variant per group
 * Prioritizes the selected language, then English, then any available variant
 * @param {Array} filteredQuestions - Already filtered questions from createFilteredQuestions
 * @param {string} language - Preferred language to display
 * @returns {Array} Unique questions (one per uniqueId) in preferred language
 */
export const createUniqueFilteredQuestions = (filteredQuestions, language = 'English') => {
    // Group by uniqueId
    const grouped = new Map();
    filteredQuestions.forEach(q => {
        const id = q.uniqueId;
        if (!grouped.has(id)) grouped.set(id, []);
        grouped.get(id).push(q);
    });

    // Select one variant per group (prefer current language, then English, then first available)
    const uniqueQuestions = [];
    grouped.forEach((variants) => {
        let selected = null;

        // Try to find variant in selected language
        selected = variants.find(v => (v.language || 'English') === language);

        // Fall back to English if selected language not found
        if (!selected) {
            selected = variants.find(v => (v.language || 'English') === 'English');
        }

        // Fall back to first variant if neither selected language nor English found
        if (!selected) {
            selected = variants[0];
        }

        if (selected) {
            uniqueQuestions.push(selected);
        }
    });

    return uniqueQuestions;
};

