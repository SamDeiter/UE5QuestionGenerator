/**
 * ContextToolbar
 * Main toolbar component that delegates to mode-specific toolbars
 *
 * This is a thin orchestrator that maps app modes to their respective toolbar components.
 * Each toolbar is responsible for its own state and rendering.
 */
import Icon from "../Icon";
import CreateModeToolbar from "./CreateModeToolbar";
import ReviewModeToolbar from "./ReviewModeToolbar";
import DatabaseModeToolbar from "./DatabaseModeToolbar";
import TranslateModeToolbar from "./TranslateModeToolbar";
import {
  AnalyticsModeToolbar,
  TestModeToolbar,
  AdminModeToolbar,
  PlaygroundModeToolbar,
} from "./MinimalToolbars";

// Mode to component mapping
const TOOLBAR_BY_MODE = {
  create: CreateModeToolbar,
  review: ReviewModeToolbar,
  database: DatabaseModeToolbar,
  translate: TranslateModeToolbar,
  analytics: AnalyticsModeToolbar,
  test: TestModeToolbar,
  admin: AdminModeToolbar,
  playground: PlaygroundModeToolbar,
};

const _KNOWN_MODES = Object.keys(TOOLBAR_BY_MODE);

/**
 * Main ContextToolbar component
 * Routes to the appropriate mode-specific toolbar
 */
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
  filterScoreTier: _filterScoreTier = "",
  setFilterScoreTier: _setFilterScoreTier,
  filterByReviewer = "",
  setFilterByReviewer,
  uniqueReviewers = [],
  customTags = {},
  isAdmin = false,
  handleChange,
}) => {
  // Get the appropriate toolbar component for this mode
  const ToolbarComponent = TOOLBAR_BY_MODE[mode];

  // Props passed to all toolbars (each toolbar uses what it needs)
  const toolbarProps = {
    // Common
    mode,
    isProcessing,
    isAuthReady,
    status,
    config,
    isAdmin,
    handleChange,
    // Data operations
    onLoadSheets,
    onLoadFirestore,
    onBulkExport,
    // Filtering
    counts,
    filterMode,
    setFilterMode,
    filterByCreator,
    setFilterByCreator,
    filterTags,
    setFilterTags,
    filterScoreTier: _filterScoreTier,
    setFilterScoreTier: _setFilterScoreTier,
    filterByReviewer,
    setFilterByReviewer,
    uniqueReviewers,
    customTags,
    // Search & Sort
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
  };

  return (
    <div className="h-12 px-4 border-b border-slate-800 bg-slate-900/50 flex items-center">
      {ToolbarComponent ? (
        <ToolbarComponent {...toolbarProps} />
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Icon name="alert-triangle" size={14} className="text-yellow-500" />
          Unknown mode: <span className="font-mono text-slate-400">{mode}</span>
        </div>
      )}
    </div>
  );
};

export default ContextToolbar;
