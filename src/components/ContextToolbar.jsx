import { useState, useRef, useEffect } from "react";
import Icon from "./Icon";
import FilterButton from "./FilterButton";
import { getMergedTags } from "../utils/tagTaxonomy";

const ContextToolbar = ({
  mode,
  counts = {},
  filterMode,
  setFilterMode,
  filterByCreator,
  setFilterByCreator,
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  isProcessing,
  status,
  isAuthReady,
  config,
  onLoadSheets,
  onLoadFirestore,
  onBulkExport,
  _onClearPending,
  _onBulkAcceptHighScores,
  _onBulkCritiqueAll,
  filterTags = [],
  setFilterTags,
  filterScoreTier = "",
  setFilterScoreTier,
  customTags = {},
  isAdmin = false, // Admin-only features
  handleChange, // Added prop for config updates
}) => {
  const [dataMenuOpen, setDataMenuOpen] = useState(false);
  const dataMenuRef = useRef(null);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const tagMenuRef = useRef(null);

  // Click outside handler for Data menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dataMenuRef.current && !dataMenuRef.current.contains(event.target)) {
        setDataMenuOpen(false);
      }
      if (tagMenuRef.current && !tagMenuRef.current.contains(event.target)) {
        setTagMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ------------------------------------------------------------------------
  // RENDERERS FOR EACH MODE
  // ------------------------------------------------------------------------

  const renderCreateToolbar = () => (
    <div className="flex justify-between items-center w-full">
      <div className="flex items-center gap-4">
        {/* Status Indicator */}
        {isAuthReady ? (
          <>
            {status ? (
              <span className="text-xs text-orange-500 font-medium flex items-center gap-1 animate-pulse">
                <Icon name="loader" size={12} className="animate-spin" />{" "}
                {status}
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <Icon
                  name="check-circle"
                  size={14}
                  className="text-green-500"
                />{" "}
                Ready to Generate
              </span>
            )}
          </>
        ) : (
          <span className="text-xs text-yellow-500 font-medium flex items-center gap-1 animate-pulse">
            <Icon name="plug" size={12} className="animate-pulse" /> Connecting
            to DB...
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Data Menu */}
        <div className="relative" ref={dataMenuRef}>
          <button
            onClick={() => setDataMenuOpen(!dataMenuOpen)}
            disabled={isProcessing}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
              dataMenuOpen
                ? "bg-slate-700 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
            } disabled:opacity-50 border border-slate-700`}
            data-tour="export-menu"
          >
            <Icon name="folder" size={14} />
            Data Operations
            <Icon
              name="chevron-down"
              size={10}
              className={`transition-transform ${
                dataMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {dataMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="py-1">
                <button
                  onClick={() => {
                    onLoadSheets();
                    setDataMenuOpen(false);
                  }}
                  disabled={isProcessing || !config.sheetUrl}
                  className="w-full text-left px-4 py-2 text-xs text-blue-300 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="table" size={14} />
                  Load from Sheets
                </button>
                <button
                  onClick={() => {
                    onLoadFirestore();
                    setDataMenuOpen(false);
                  }}
                  disabled={isProcessing}
                  className="w-full text-left px-4 py-2 text-xs text-indigo-300 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Icon name="cloud-lightning" size={14} />
                  Load from Firestore
                </button>
                <div className="h-px bg-slate-700 my-1"></div>
                {isAdmin && (
                  <button
                    onClick={() => {
                      onBulkExport();
                      setDataMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-green-300 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Icon name="download" size={14} />
                    Export Questions
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderReviewToolbar = () => (
    <div className="flex justify-between items-center w-full">
      <div className="flex items-center gap-2">
        {/* Discipline Selector in Toolbar */}
        <div className="flex items-center gap-1 mr-2 px-2 py-1 bg-slate-800 rounded border border-slate-700 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-500 select-none">
            Discipline:
          </span>
          <select
            name="discipline" // Required for handleChange
            value={config.discipline}
            onChange={handleChange}
            className="bg-slate-800 text-xs text-slate-200 font-medium outline-none border-none cursor-pointer focus:ring-0 hover:text-white transition-colors"
          >
            <option value="" className="bg-slate-800 text-slate-200">
              All Disciplines
            </option>
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
        <div className="w-px h-4 bg-slate-700 mx-1"></div>
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
        {/* GLOBAL ACTIONS */}

        <div className="h-4 w-px bg-slate-700"></div>

        <button
          onClick={() => setFilterByCreator(!filterByCreator)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 border ${
            filterByCreator
              ? "bg-blue-600/20 text-blue-300 border-blue-500/50"
              : "bg-transparent text-slate-400 border-transparent hover:bg-slate-800"
          }`}
          title={`Filter by Creator: ${config.creatorName}`}
        >
          <Icon name="user" size={14} />
          {filterByCreator ? "My Questions Only" : "All Creators"}
        </button>

        <div className="h-4 w-px bg-slate-700"></div>

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
                {getMergedTags(config.discipline, customTags).map((tag) => {
                  const isSelected = filterTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        if (isSelected)
                          setFilterTags(filterTags.filter((t) => t !== tag));
                        else setFilterTags([...filterTags, tag]);
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
                {getMergedTags(config.discipline, customTags).length === 0 && (
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

        <div className="relative">
          <Icon
            name="search"
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-48 bg-slate-900 text-slate-300 placeholder-slate-600 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs py-1.5 pl-8 pr-8 rounded-md transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400"
            >
              <Icon name="x" size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderDatabaseToolbar = () => (
    <div className="flex justify-between items-center w-full">
      <div className="flex items-center gap-4">
        <span className="text-xs text-slate-500 flex items-center gap-2">
          <Icon name="database" size={12} />
          Viewing Database Records
        </span>

        {/* Sort Control */}
        <div
          className="flex items-center gap-2 bg-slate-800/50 p-1 rounded border border-slate-700"
          data-tour="sort-dropdown"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase px-1">
            Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-900 text-slate-300 text-xs border-none outline-none focus:ring-0 rounded py-0.5 pl-1 pr-6 cursor-pointer"
          >
            <option value="default">Default</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="language">Language</option>
            <option value="discipline">Discipline</option>
            <option value="difficulty">Difficulty</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Load Data Buttons */}
        <button
          onClick={onLoadFirestore}
          disabled={isProcessing}
          className="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
        >
          <Icon name="cloud-lightning" size={14} />
          Load from Firestore
        </button>
        <button
          onClick={onLoadSheets}
          disabled={isProcessing || !config.sheetUrl}
          className="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
          title={
            !config.sheetUrl
              ? "Configure Sheet URL in Settings first"
              : "Load from Google Sheets"
          }
        >
          <Icon name="table" size={14} />
          Load from Sheets
        </button>

        {isAdmin && (
          <button
            onClick={onBulkExport}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white"
            data-tour="export-menu"
          >
            <Icon name="download" size={14} />
            Export
          </button>
        )}

        <div className="h-4 w-px bg-slate-700"></div>

        {/* Reuse Search for DB View */}
        <div className="relative">
          <Icon
            name="search"
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            placeholder="Search database..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 bg-slate-900 text-slate-300 placeholder-slate-600 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs py-1.5 pl-8 pr-8 rounded-md transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400"
            >
              <Icon name="x" size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderAnalyticsToolbar = () => (
    <div className="flex justify-between items-center w-full">
      <span className="text-xs text-slate-500">Analytics Dashboard</span>
    </div>
  );

  const renderTestToolbar = () => (
    <div className="flex justify-between items-center w-full">
      <div className="flex items-center gap-2">
        <Icon name="clipboard-check" size={16} className="text-indigo-400" />
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Test Configuration
        </span>
      </div>
    </div>
  );

  // ------------------------------------------------------------------------
  // MAIN RENDER
  // ------------------------------------------------------------------------
  return (
    <div className="h-12 px-4 border-b border-slate-800 bg-slate-900/50 flex items-center">
      {mode === "create" && renderCreateToolbar()}
      {mode === "review" && renderReviewToolbar()}
      {mode === "database" && renderDatabaseToolbar()}
      {mode === "analytics" && renderAnalyticsToolbar()}
      {mode === "test" && renderTestToolbar()}
    </div>
  );
};

export default ContextToolbar;
