"""
Refactor App.jsx to use the new useFiltering hook.

This script:
1. Adds the import for useFiltering
2. Removes the inline state declarations and computed values
3. Adds the useFiltering hook call
4. Updates dependent code to use the new hook's return values
"""

import re

def refactor_app_jsx():
    """Refactor App.jsx to use useFiltering hook."""
    
    with open('src/App.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add import for useFiltering after useNavigation import
    old_import = "import { useNavigation } from './hooks/useNavigation';"
    new_import = """import { useNavigation } from './hooks/useNavigation';
import { useFiltering } from './hooks/useFiltering';"""
    content = content.replace(old_import, new_import)
    
    # 2. Remove the old filtering state declarations and replace with hook call
    # Find the section from "// 5. Filtering & Search" to just before "// 6. Generation"
    old_filtering_section = """    // 5. Filtering & Search
    // 5. Filtering & Search
    const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('ue5_pref_search') || '');
    // debouncedSearchTerm removed as it was unused
    const [filterMode, setFilterMode] = useState(() => localStorage.getItem('ue5_pref_filter') || 'pending');
    const [showHistory, setShowHistory] = useState(() => localStorage.getItem('ue5_pref_history') === 'true');
    const [filterByCreator, setFilterByCreator] = useState(false);
    const [filterTags, setFilterTags] = useState([]); // NEW: Filter by tags
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
    const [sortBy, setSortBy] = useState('default');

    // useEffect(() => {
    //     const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 3000);
    //     return () => clearTimeout(timer);
    // }, [searchTerm]);
    // Removed unused SEARCH DEBOUNCE EFFECT as it resulted in unused state

    useEffect(() => {
        localStorage.setItem('ue5_pref_search', searchTerm);
        localStorage.setItem('ue5_pref_filter', filterMode);
        localStorage.setItem('ue5_pref_history', showHistory);
    }, [searchTerm, filterMode, showHistory]);"""
    
    new_filtering_section = """    // 5. Filtering & Search (extracted to useFiltering hook)
    const {
        searchTerm, setSearchTerm,
        filterMode, setFilterMode,
        showHistory, setShowHistory,
        filterByCreator, setFilterByCreator,
        filterTags, setFilterTags,
        currentReviewIndex, setCurrentReviewIndex,
        sortBy, setSortBy,
        contextFilteredQuestions,
        contextCounts,
        filteredQuestions,
        uniqueFilteredQuestions
    } = useFiltering({
        questions,
        historicalQuestions,
        config,
        appMode
    });"""
    
    content = content.replace(old_filtering_section, new_filtering_section)
    
    # 3. Remove the old computed filtered questions section
    old_computed_section = """    // Computed Filtered Questions
    // Computed Filtered Questions
    // 1. First, get questions that match all filters EXCEPT status (for counts)
    const contextFilteredQuestions = useMemo(() => createFilteredQuestions(
        questions,
        historicalQuestions,
        showHistory || appMode === 'review', // Force history on in review mode
        'all', // Ignore status for this intermediate list
        filterByCreator,
        searchTerm,
        config.creatorName,
        config.discipline,
        config.difficulty,
        config.language,
        filterTags // Pass filterTags to filtering logic
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

    const uniqueFilteredQuestions = useMemo(() => createUniqueFilteredQuestions(
        filteredQuestions,
        config.language
    ), [filteredQuestions, config.language]);

"""
    
    content = content.replace(old_computed_section, "")
    
    # 4. Remove the old review index reset effect (now in useFiltering)
    old_review_index_effect = """    // Review Mode Navigation
    useEffect(() => {
        setCurrentReviewIndex(0);
    }, [appMode, config.discipline, config.difficulty, config.language, filterMode, searchTerm]);

"""
    new_review_index_comment = """    // Review Mode Navigation (index reset is handled in useFiltering)
"""
    content = content.replace(old_review_index_effect, new_review_index_comment)
    
    # 5. Remove unused imports from React (useMemo is no longer needed in App.jsx for filtering)
    # Actually, we still use useMemo for other things, so keep it
    
    # 6. Remove unused imports from questionFilters (these are now in useFiltering)
    old_filter_import = "import { createFilteredQuestions, createUniqueFilteredQuestions } from './utils/questionFilters';"
    # Keep this import removed since it's now used in the hook
    content = content.replace(old_filter_import + "\n", "")
    
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Refactored App.jsx to use useFiltering hook")
    print("   - Added import for useFiltering")
    print("   - Replaced inline filtering state with hook call")
    print("   - Removed computed filtered questions (now in hook)")
    print("   - Removed localStorage sync effect (now in hook)")
    print("   - Removed review index reset effect (now in hook)")

if __name__ == '__main__':
    refactor_app_jsx()
