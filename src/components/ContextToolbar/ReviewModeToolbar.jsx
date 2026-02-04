/**
 * ReviewModeToolbar
 * Toolbar for the Review questions mode - the most complex toolbar
 */
import { useState, useRef, useEffect } from "react";
import Icon from "../Icon";
import FilterButton from "../FilterButton";
import { getMergedTags } from "../../utils/tagTaxonomy";
import { SearchInput, ToolbarDivider } from "./SharedToolbarComponents";

const ReviewModeToolbar = ({
  counts = {},
  filterMode,
  setFilterMode,
  filterByCreator,
  setFilterByCreator,
  searchTerm,
  setSearchTerm,
  config,
  handleChange,
  filterTags = [],
  setFilterTags,
  filterScoreTier = "",
  setFilterScoreTier,
  filterByReviewer = "",
  setFilterByReviewer,
  uniqueReviewers = [],
  customTags = {},
}) => {
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const tagMenuRef = useRef(null);

  // Click outside handler for Tag menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(event.target)) {
        setTagMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mergedTags = getMergedTags(config.discipline, customTags);

  return (
    <div className="flex justify-between items-center w-full">
      <div className="flex items-center gap-2">
        {/* Discipline Selector */}
        <div
          className="flex items-center gap-1 mr-2 px-2 py-1 bg-slate-800 rounded border border-slate-700 shadow-sm"
          data-tour="discipline-selector-container"
        >
          <span className="text-[10px] uppercase font-bold text-slate-500 select-none">
            Discipline:
          </span>
          <select
            name="discipline"
            value={config.discipline}
            onChange={handleChange}
            data-tour="discipline-selector"
            className="bg-slate-800 text-xs text-slate-200 font-medium outline-none border-none cursor-pointer focus:ring-0 hover:text-white transition-colors"
          >
            <option
              value="Worldbuilding"
              className="bg-slate-800 text-slate-200"
            >
              Worldbuilding
            </option>
            <option value="Game Dev" className="bg-slate-800 text-slate-200">
              Game Dev
            </option>
            <option value="Look Dev" className="bg-slate-800 text-slate-200">
              Look Dev
            </option>
            <option value="Tech Art" className="bg-slate-800 text-slate-200">
              Tech Art
            </option>
            <option value="VFX" className="bg-slate-800 text-slate-200">
              VFX
            </option>
            <option value="Animation" className="bg-slate-800 text-slate-200">
              Animation
            </option>
            <option value="Programming" className="bg-slate-800 text-slate-200">
              Programming
            </option>
          </select>
        </div>

        {/* Filter Buttons */}
        <FilterButton
          mode="pending"
          current={filterMode}
          setFilter={setFilterMode}
          label="Pending"
          count={counts.pending}
        />
        <FilterButton
          mode="all"
          current={filterMode}
          setFilter={setFilterMode}
          label="All"
          count={counts.all}
        />
        {counts.other > 0 && (
          <FilterButton
            mode="other"
            current={filterMode}
            setFilter={setFilterMode}
            label="Other"
            count={counts.other}
          />
        )}
        <div className="w-px h-4 bg-slate-700 mx-1" />
        <FilterButton
          mode="accepted"
          current={filterMode}
          setFilter={setFilterMode}
          label="Accepted"
          count={counts.accepted}
        />
        <FilterButton
          mode="rejected"
          current={filterMode}
          setFilter={setFilterMode}
          label="Rejected"
          count={counts.rejected}
        />
      </div>

      <div className="flex items-center gap-3">
        <ToolbarDivider />

        {/* My Reviews Toggle */}
        <button
          onClick={() => setFilterByCreator(!filterByCreator)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 border ${
            filterByCreator
              ? "bg-blue-600/20 text-blue-300 border-blue-500/50"
              : "bg-transparent text-slate-400 border-transparent hover:bg-slate-800"
          }`}
          title={`Filter by Reviewer: ${config.reviewerName || config.creatorName}`}
        >
          <Icon name="user-check" size={14} />
          {filterByCreator ? "My Reviews Only" : "All Reviewers"}
        </button>

        {/* Low Score Filter */}
        <button
          onClick={() => {
            if (filterScoreTier === "needs-work") {
              setFilterScoreTier("");
            } else {
              setFilterScoreTier("needs-work");
            }
          }}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 border ${
            filterScoreTier === "needs-work"
              ? "bg-red-600/20 text-red-300 border-red-500/50"
              : "bg-transparent text-slate-400 border-transparent hover:bg-slate-800"
          }`}
          title="Show questions with score under 70 that need human review"
        >
          <Icon name="alert-triangle" size={14} />
          {filterScoreTier === "needs-work"
            ? "Low Scores Active"
            : "Low Scores"}
        </button>

        {/* Reviewer Filter Dropdown */}
        <div className="relative">
          <select
            value={filterByReviewer}
            onChange={(e) =>
              setFilterByReviewer && setFilterByReviewer(e.target.value)
            }
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all border cursor-pointer ${
              filterByReviewer
                ? "bg-purple-600/20 text-purple-300 border-purple-500/50"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
            }`}
            title="Filter by who verified the question"
          >
            <option value="">All Verifiers</option>
            {uniqueReviewers.map((reviewer) => (
              <option key={reviewer} value={reviewer}>
                {reviewer}
              </option>
            ))}
          </select>
        </div>

        <ToolbarDivider />

        {/* Tag Filter */}
        <div className="relative" ref={tagMenuRef}>
          <button
            onClick={() => setTagMenuOpen(!tagMenuOpen)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 border ${
              filterTags.length > 0
                ? "bg-orange-500/20 text-orange-300 border-orange-500/50"
                : "bg-transparent text-slate-400 border-transparent hover:bg-slate-800"
            }`}
            title="Filter by Tags"
          >
            <Icon name="tag" size={14} />
            {filterTags.length > 0
              ? `${filterTags.length} Active`
              : "Filter Tags"}
          </button>

          {tagMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-2 border-b border-slate-700 bg-slate-900/50">
                <span className="text-xs font-bold uppercase text-slate-300">
                  Filter by Tags (OR)
                </span>
              </div>
              <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar flex flex-wrap gap-1.5">
                {mergedTags.map((tag) => {
                  const isSelected = filterTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        if (isSelected) {
                          setFilterTags(filterTags.filter((t) => t !== tag));
                        } else {
                          setFilterTags([...filterTags, tag]);
                        }
                      }}
                      className={`text-xs px-2 py-1 rounded border transition-all ${
                        isSelected
                          ? "bg-orange-600 border-orange-400 text-white font-medium"
                          : "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
                {mergedTags.length === 0 && (
                  <p className="text-xs text-slate-500 p-2">
                    No tags available for this discipline.
                  </p>
                )}
              </div>
              {filterTags.length > 0 && (
                <div className="p-2 border-t border-slate-700 bg-slate-900/50">
                  <button
                    onClick={() => setFilterTags([])}
                    className="w-full py-1 text-xs text-red-400 hover:bg-red-900/20 rounded"
                  >
                    Clear Tag Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search */}
        <SearchInput
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search questions..."
        />
      </div>
    </div>
  );
};

export default ReviewModeToolbar;
