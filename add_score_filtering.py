"""
Script to add AI score filtering functionality to the Review Mode.

This script:
1. Adds filterScoreTier state to useFiltering.js
2. Adds score filtering logic to createFilteredQuestions
3. Adds score filter dropdown to ContextToolbar.jsx
4. Updates App.jsx to pass the filterScoreTier state
"""

import re

def add_score_filter_to_use_filtering():
    """Add filterScoreTier state to useFiltering.js"""
    file_path = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\hooks\useFiltering.js"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add filterScoreTier state after filterTags
    filter_tags_line = "  const [filterTags, setFilterTags] = useState([]);"
    if filter_tags_line in content and "filterScoreTier" not in content:
        content = content.replace(
            filter_tags_line,
            filter_tags_line + "\n  const [filterScoreTier, setFilterScoreTier] = useState(\"\"); // '', 'exceptional', 'very-good', 'good', 'adequate', 'needs-work'"
        )
    
    # Add filterScoreTier to the return object
    return_section = """    filterTags,
    setFilterTags,
    currentReviewIndex,"""
    
    if return_section in content and "filterScoreTier" not in content:
        content = content.replace(
            return_section,
            """    filterTags,
    setFilterTags,
    filterScoreTier,
    setFilterScoreTier,
    currentReviewIndex,"""
        )
    
    # Reset filter when filters change (add filterScoreTier dependency)
    reset_deps = """  }, [
    appMode,
    config.discipline,
    config.difficulty,
    config.language,
    filterMode,
    searchTerm,
  ]);"""
    
    if reset_deps in content and "filterScoreTier" not in content:
        content = content.replace(
            reset_deps,
            """  }, [
    appMode,
    config.discipline,
    config.difficulty,
    config.language,
    filterMode,
    searchTerm,
    filterScoreTier,
  ]);"""
        )
    
    # Add filterScoreTier to createFilteredQuestions call
    create_filtered_call = """      createFilteredQuestions(
        questions,
        historicalQuestions,
        showHistory || appMode === \"review\" || appMode === \"create\", // Show history in Create & Review modes
        \"all\", // Ignore status for this intermediate list
        filterByCreator,
        searchTerm,
        creatorName,
        discipline,
        appMode === \"review\" ? null : difficulty, // Review mode: ignore difficulty filter
        appMode === \"review\" ? null : type, // Review mode: ignore type filter
        language,
        filterTags
      ),"""
    
    if create_filtered_call in content and "filterScoreTier" not in content:
        content = content.replace(
            create_filtered_call,
            """      createFilteredQuestions(
        questions,
        historicalQuestions,
        showHistory || appMode === \"review\" || appMode === \"create\", // Show history in Create & Review modes
        \"all\", // Ignore status for this intermediate list
        filterByCreator,
        searchTerm,
        creatorName,
        discipline,
        appMode === \"review\" ? null : difficulty, // Review mode: ignore difficulty filter
        appMode === \"review\" ? null : type, // Review mode: ignore type filter
        language,
        filterTags,
        filterScoreTier
      ),"""
        )
    
    # Add filterScoreTier to useMemo dependencies
    memo_deps = """    [\r
      questions,\r
      historicalQuestions,\r
      showHistory,\r
      appMode,\r
      filterByCreator,\r
      searchTerm,\r
      creatorName,\r
      discipline,\r
      difficulty,\r
      type,\r
      language,\r
      filterTags,\r
    ]\r"""
    
    if memo_deps in content and "filterScoreTier" not in content:
        content = content.replace(
            memo_deps,
            """    [\r
      questions,\r
      historicalQuestions,\r
      showHistory,\r
      appMode,\r
      filterByCreator,\r
      searchTerm,\r
      creatorName,\r
      discipline,\r
      difficulty,\r
      type,\r
      language,\r
      filterTags,\r
      filterScoreTier,\r
    ]\r"""
        )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ Updated {file_path}")

def add_score_filter_to_question_filters():
    """Add score filtering logic to questionFilters.js"""
    file_path = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\utils\questionFilters.js"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the createFilteredQuestions function signature and add filterScoreTier parameter
    old_signature = """export const createFilteredQuestions = (
  questions,
  historicalQuestions,
  includeHistorical,
  statusFilter,
  filterByCreator,
  searchTerm,
  creatorName,
  discipline,
  difficulty,
  type,
  language,
  filterTags = []
) => {"""
    
    new_signature = """export const createFilteredQuestions = (
  questions,
  historicalQuestions,
  includeHistorical,
  statusFilter,
  filterByCreator,
  searchTerm,
  creatorName,
  discipline,
  difficulty,
  type,
  language,
  filterTags = [],
  filterScoreTier = ""
) => {"""
    
    if old_signature in content and "filterScoreTier" not in content:
        content = content.replace(old_signature, new_signature)
    
    # Add score tier filtering logic after tag filtering
    tag_filter_block = """  // Filter by tags (OR logic)
  if (filterTags && filterTags.length > 0) {
    q = q.filter((question) => {
      const questionTags = question.tags || [];
      return filterTags.some((tag) => questionTags.includes(tag));
    });
  }

  return q;
};"""
    
    score_filter_block = """  // Filter by tags (OR logic)
  if (filterTags && filterTags.length > 0) {
    q = q.filter((question) => {
      const questionTags = question.tags || [];
      return filterTags.some((tag) => questionTags.includes(tag));
    });
  }

  // Filter by AI Score Tier
  if (filterScoreTier) {
    q = q.filter((question) => {
      const score = question.aiScore;
      if (score === null || score === undefined) return false;
      
      switch (filterScoreTier) {
        case 'exceptional':
          return score >= 90;
        case 'very-good':
          return score >= 80 && score < 90;
        case 'good':
          return score >= 70 && score < 80;
        case 'adequate':
          return score >= 60 && score < 70;
        case 'needs-work':
          return score < 60;
        default:
          return true;
      }
    });
  }

  return q;
};"""
    
    if tag_filter_block in content and "filterScoreTier" not in content:
        content = content.replace(tag_filter_block, score_filter_block)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ Updated {file_path}")

def add_score_filter_ui_to_toolbar():
    """Add score filter dropdown to ContextToolbar.jsx"""
    file_path = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\ContextToolbar.jsx"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add filterScoreTier props to component signature
    old_props = """  filterTags = [],
  setFilterTags,
  customTags = {},
  isAdmin = false, // Admin-only features
  handleChange, // Added prop for config updates
}) => {"""
    
    new_props = """  filterTags = [],
  setFilterTags,
  filterScoreTier = "",
  setFilterScoreTier,
  customTags = {},
  isAdmin = false, // Admin-only features
  handleChange, // Added prop for config updates
}) => {"""
    
    if old_props in content and "filterScoreTier" not in content:
        content = content.replace(old_props, new_props)
    
    # Add score filter dropdown after tag filter in renderReviewToolbar
    tag_filter_end = """        </div>

        <div className=\"h-4 w-px bg-slate-700\"></div>

        <div className=\"relative\">
          <Icon
            name=\"search\""""
    
    score_filter_dropdown = """        </div>

        {/* AI Score Filter */}
        <div className=\"flex items-center gap-1 px-2 py-1 bg-slate-800 rounded border border-slate-700 shadow-sm\">
          <span className=\"text-[10px] uppercase font-bold text-slate-500 select-none\">
            Score:
          </span>
          <select
            value={filterScoreTier}
            onChange={(e) => setFilterScoreTier(e.target.value)}
            className=\"bg-slate-800 text-xs text-slate-200 font-medium outline-none border-none cursor-pointer focus:ring-0 hover:text-white transition-colors\"
          >
            <option value=\"\" className=\"bg-slate-800 text-slate-200\">
              All Scores
            </option>
            <option value=\"exceptional\" className=\"bg-slate-800 text-green-400\">
              ⭐ Exceptional (90+)
            </option>
            <option value=\"very-good\" className=\"bg-slate-800 text-blue-400\">
              ✨ Very Good (80-89)
            </option>
            <option value=\"good\" className=\"bg-slate-800 text-yellow-400\">
              👍 Good (70-79)
            </option>
            <option value=\"adequate\" className=\"bg-slate-800 text-orange-400\">
              ⚠️ Adequate (60-69)
            </option>
            <option value=\"needs-work\" className=\"bg-slate-800 text-red-400\">
              ❌ Needs Work (\u003c60)
            </option>
          </select>
        </div>

        <div className=\"h-4 w-px bg-slate-700\"></div>

        <div className=\"relative\">
          <Icon
            name=\"search\""""
    
    if tag_filter_end in content and "AI Score Filter" not in content:
        content = content.replace(tag_filter_end, score_filter_dropdown)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ Updated {file_path}")

if __name__ == "__main__":
    print("Adding AI Score Filtering functionality...\n")
    
    try:
        add_score_filter_to_use_filtering()
        add_score_filter_to_question_filters()
        add_score_filter_ui_to_toolbar()
        
        print("\n✅ Successfully added AI score filtering!")
        print("\nNext steps:")
        print("1. Update App.jsx to pass filterScoreTier and setFilterScoreTier to ContextToolbar")
        print("2. Test the score filtering functionality")
        print("3. Commit changes to git")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise
