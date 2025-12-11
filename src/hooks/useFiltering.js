/**
 * useFiltering Hook
 * 
 * Manages all filtering and search state for the question list, including:
 * - Search term
 * - Filter mode (pending/accepted/rejected/all)
 * - Show history toggle
 * - Filter by creator
 * - Filter by tags
 * - Sort order
 * - Current review index
 * - Computed filtered question lists
 * - LocalStorage persistence
 */
import { useState, useEffect, useMemo } from 'react';
import { createFilteredQuestions, createUniqueFilteredQuestions } from '../utils/questionFilters';

/**
 * Custom hook for managing question filtering state and logic.
 * 
 * @param {Object} params - Hook parameters
 * @param {Array} params.questions - Current session questions
 * @param {Array} params.historicalQuestions - Historical questions from cloud
 * @param {Object} params.config - App configuration (creatorName, discipline, difficulty, language)
 * @param {string} params.appMode - Current app mode ('create', 'review', 'database', etc.)
 * @returns {Object} Filtering state and handlers
 */
export function useFiltering({ questions, historicalQuestions, config, appMode }) {
    // ========================================================================
    // STATE - Filter & Search
    // ========================================================================
    const [searchTerm, setSearchTerm] = useState(
        () => localStorage.getItem('ue5_pref_search') || ''
    );
    const [filterMode, setFilterMode] = useState(
        () => localStorage.getItem('ue5_pref_filter') || 'pending'
    );
    const [showHistory, setShowHistory] = useState(
        () => localStorage.getItem('ue5_pref_history') === 'true'
    );
    const [filterByCreator, setFilterByCreator] = useState(false);
    const [filterTags, setFilterTags] = useState([]);
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
    const [sortBy, setSortBy] = useState('default');

    // ========================================================================
    // EFFECTS - Persistence
    // ========================================================================
    
    // Persist filter preferences to localStorage
    useEffect(() => {
        localStorage.setItem('ue5_pref_search', searchTerm);
        localStorage.setItem('ue5_pref_filter', filterMode);
        localStorage.setItem('ue5_pref_history', showHistory);
    }, [searchTerm, filterMode, showHistory]);

    // Reset review index when filters change
    useEffect(() => {
        setCurrentReviewIndex(0);
    }, [appMode, config.discipline, config.difficulty, config.language, filterMode, searchTerm]);

    // ========================================================================
    // COMPUTED VALUES - Filtered Questions
    // ========================================================================



    // 1. First, get questions that match all filters EXCEPT status (for counts)
    const contextFilteredQuestions = useMemo(() => createFilteredQuestions(
        questions,
        historicalQuestions,
        showHistory || appMode === 'review' || appMode === 'create', // Show history in Create & Review modes
        'all', // Ignore status for this intermediate list
        filterByCreator,
        searchTerm,
        config.creatorName,
        config.discipline,
        appMode === 'review' ? null : config.difficulty, // Review mode: ignore difficulty filter
        appMode === 'review' ? null : config.type, // Review mode: ignore type filter
        config.language,
        filterTags
    ), [questions, historicalQuestions, showHistory, appMode, filterByCreator, searchTerm, config, filterTags]);

    // 2. Calculate counts based on the context
    const contextCounts = useMemo(() => {
        const pending = contextFilteredQuestions.filter(q => !q.status || q.status === 'pending').length;
        const accepted = contextFilteredQuestions.filter(q => q.status === 'accepted').length;
        const rejected = contextFilteredQuestions.filter(q => q.status === 'rejected').length;
        const all = contextFilteredQuestions.length;
        return { pending, accepted, rejected, all };
    }, [contextFilteredQuestions]);

    // 3. Now apply the status filter for the actual view
    const filteredQuestions = useMemo(() => {
        if (filterMode === 'all') return contextFilteredQuestions;
        return contextFilteredQuestions.filter(q => {
            if (filterMode === 'pending') return !q.status || q.status === 'pending';
            return q.status === filterMode;
        });
    }, [contextFilteredQuestions, filterMode]);

    // 4. Get unique questions for the current language
    const uniqueFilteredQuestions = useMemo(() => createUniqueFilteredQuestions(
        filteredQuestions,
        config.language
    ), [filteredQuestions, config.language]);

    // ========================================================================
    // RETURN
    // ========================================================================
    return {
        // State
        searchTerm,
        setSearchTerm,
        filterMode,
        setFilterMode,
        showHistory,
        setShowHistory,
        filterByCreator,
        setFilterByCreator,
        filterTags,
        setFilterTags,
        currentReviewIndex,
        setCurrentReviewIndex,
        sortBy,
        setSortBy,
        
        // Computed values
        contextFilteredQuestions,
        contextCounts,
        filteredQuestions,
        uniqueFilteredQuestions
    };
}
