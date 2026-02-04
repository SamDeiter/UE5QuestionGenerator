/**
 * DatabaseModeToolbar
 * Toolbar for the Database view mode
 */
import Icon from "../Icon";
import { SearchInput, ToolbarDivider } from "./SharedToolbarComponents";

const DatabaseModeToolbar = ({
  sortBy,
  setSortBy,
  searchTerm,
  setSearchTerm,
  isProcessing,
  config,
  onLoadSheets,
  onLoadFirestore,
  onBulkExport,
  isAdmin,
}) => {
  return (
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

      <div className="flex items-center gap-2 md:gap-3">
        {/* Load Data Buttons - Admin Only */}
        {isAdmin && (
          <>
            <button
              onClick={onLoadFirestore}
              disabled={isProcessing}
              className="px-2 md:px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 md:gap-2 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              title="Load from Firestore"
            >
              <Icon name="cloud-lightning" size={14} />
              <span className="hidden sm:inline">Firestore</span>
            </button>
            <button
              onClick={onLoadSheets}
              disabled={isProcessing || !config.sheetUrl}
              className="px-2 md:px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 md:gap-2 bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
              title={
                !config.sheetUrl
                  ? "Configure Sheet URL in Settings first"
                  : "Load from Google Sheets"
              }
            >
              <Icon name="table" size={14} />
              <span className="hidden sm:inline">Sheets</span>
            </button>
            <button
              onClick={onBulkExport}
              className="px-2 md:px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 md:gap-2 bg-green-600 hover:bg-green-500 text-white"
              data-tour="export-menu"
              title="Export Questions"
            >
              <Icon name="download" size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </>
        )}

        <ToolbarDivider />

        {/* Search */}
        <SearchInput
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search database..."
          width="w-64"
          focusColor="blue"
        />
      </div>
    </div>
  );
};

export default DatabaseModeToolbar;
