import { Suspense } from "react";
import Sidebar from "./Sidebar";
import AppNavigation from "./AppNavigation";
import ContextToolbar from "./ContextToolbar";
import ViewRouter from "./ViewRouter";
import EmptyState from "./EmptyState";
import ReviewModeBanner from "./ReviewModeBanner";
import { SuspenseSpinner as LoadingSpinner } from "./LoadingSpinner";
import { APP_MODES } from "../utils/constants";

/**
 * MainLayout Component
 *
 * The main application layout containing:
 * - Sidebar (create mode only)
 * - Main content area with navigation and toolbar
 * - ViewRouter for rendering different modes
 *
 * @param {Object} props - Component props
 *
 * @param {string} props.appMode - Current application mode ('create' | 'review' | 'database' | 'analytics' | 'test')
 * @param {Function} props.setAppMode - Function to set the application mode
 * @param {string} props.effectiveApiKey - Active API key for Gemini calls
 * @param {boolean} props.isAdmin - Whether the current user has admin privileges
 *
 * @param {Object} props.sidebarProps - Props to pass to the Sidebar component
 * @param {Object} props.sidebarProps.config - Application configuration
 * @param {Function} props.sidebarProps.handleChange - Configuration change handler
 * @param {Array} props.sidebarProps.questions - Current questions array
 * @param {Function} props.sidebarProps.handleGenerate - Question generation handler
 * @param {boolean} props.sidebarProps.isProcessing - Whether generation is in progress
 * @param {Function} props.sidebarProps.showMessage - Toast message function
 *
 * @param {Function} props.handleModeSelect - Handler for mode selection (create/review)
 * @param {Function} props.handleViewDatabase - Handler for database view navigation
 * @param {number} props.pendingCount - Count of pending questions for review
 *
 * @param {Object} props.toolbarProps - Props to pass to the ContextToolbar component
 * @param {string} props.toolbarProps.mode - Current toolbar mode
 * @param {Object} props.toolbarProps.counts - Question counts by status
 * @param {string} props.toolbarProps.filterMode - Current filter mode
 * @param {Function} props.toolbarProps.setFilterMode - Filter mode setter
 * @param {boolean} props.toolbarProps.filterByCreator - Whether to filter by creator
 * @param {Function} props.toolbarProps.setFilterByCreator - Creator filter setter
 * @param {string} props.toolbarProps.searchTerm - Current search term
 * @param {Function} props.toolbarProps.setSearchTerm - Search term setter
 * @param {string} props.toolbarProps.sortBy - Current sort order
 * @param {Function} props.toolbarProps.setSortBy - Sort order setter
 * @param {boolean} props.toolbarProps.isProcessing - Whether processing is in progress
 * @param {string} props.toolbarProps.status - Current status message
 * @param {boolean} props.toolbarProps.isAuthReady - Whether authentication is ready
 * @param {Object} props.toolbarProps.config - Application configuration
 * @param {Function} props.toolbarProps.onLoadSheets - Google Sheets load handler
 * @param {Function} props.toolbarProps.onLoadFirestore - Firestore load handler
 * @param {Function} props.toolbarProps.onBulkExport - Bulk export handler
 * @param {Array} props.toolbarProps.filterTags - Active filter tags
 * @param {Function} props.toolbarProps.setFilterTags - Filter tags setter
 * @param {string} props.toolbarProps.filterScoreTier - Active score tier filter
 * @param {Function} props.toolbarProps.setFilterScoreTier - Score tier filter setter
 * @param {Object} props.toolbarProps.customTags - Custom tags by discipline
 * @param {Function} props.toolbarProps.handleChange - Configuration change handler
 *
 * @param {boolean} props.showHistory - Whether to show question history
 * @param {Array} props.uniqueFilteredQuestions - Filtered questions for current view
 * @param {Array} props.questions - All questions in current session
 * @param {string} props.status - Current status message
 * @param {Array} props.databaseQuestions - Questions loaded from database
 * @param {Object} props.config - Application configuration
 * @param {boolean} props.isProcessing - Whether processing is in progress
 * @param {Map} props.allQuestionsMap - Map of all questions by ID for quick lookup
 *
 * @param {Object} props.viewRouterHandlers - Event handlers for ViewRouter
 * @param {Function} props.viewRouterHandlers.onUpdateStatus - Question status update handler
 * @param {Function} props.viewRouterHandlers.onExplain - Question explanation handler
 * @param {Function} props.viewRouterHandlers.onVariate - Question variation handler
 * @param {Function} props.viewRouterHandlers.onCritique - Question critique handler
 * @param {Function} props.viewRouterHandlers.onApplyRewrite - Rewrite application handler
 * @param {Function} props.viewRouterHandlers.onTranslateSingle - Single translation handler
 * @param {Function} props.viewRouterHandlers.onSwitchLanguage - Language switch handler
 * @param {Function} props.viewRouterHandlers.onDelete - Question deletion handler
 * @param {Function} props.viewRouterHandlers.onUpdateQuestion - Question update handler
 * @param {Function} props.viewRouterHandlers.onKickBack - Kick back to review handler
 * @param {Function} props.viewRouterHandlers.showMessage - Toast message function
 *
 * @param {Object} props.viewRouterState - State values for ViewRouter
 * @param {Array} props.viewRouterState.availableLanguages - Available translation languages
 * @param {boolean} props.viewRouterState.isProcessing - Whether processing is in progress
 *
 * @param {Object} props.viewRouterSetters - State setters for ViewRouter
 * @param {Function} props.viewRouterSetters.setShowHistory - History visibility setter
 *
 * @param {Function} props.handleGoHome - Handler for home navigation
 * @param {Function} props.onStartTutorial - Handler for tutorial start
 */
const MainLayout = ({
  // Mode
  appMode,
  setAppMode,
  effectiveApiKey,
  isAdmin,

  // Sidebar props
  sidebarProps,

  // Navigation
  handleModeSelect,
  handleViewDatabase,
  pendingCount,
  isInitialLoading,

  // Toolbar props
  toolbarProps,

  // Content area props
  showHistory,
  uniqueFilteredQuestions,
  questions,
  status,
  databaseQuestions,
  config,
  isProcessing,
  allQuestionsMap, // Add this prop
  allLanguageQuestions,

  // ViewRouter props
  viewRouterHandlers,
  viewRouterState,
  viewRouterSetters,
  handleGoHome,
  onStartTutorial,
  activeScenario, // Tutorial state for demo card
}) => {
  /**
   * Handle mode changes with proper cleanup and state management
   * @param {string} mode - Target mode: 'create' | 'review' | 'database' | 'analytics' | 'test'
   */
  const handleModeChange = (mode) => {
    if (mode === APP_MODES.ANALYTICS) setAppMode(APP_MODES.ANALYTICS);
    else if (mode === APP_MODES.DATABASE) handleViewDatabase();
    else handleModeSelect(mode);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {appMode === APP_MODES.CREATE && <Sidebar {...sidebarProps} />}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative overflow-hidden">
        <div className="flex flex-col border-b border-slate-800 bg-slate-900 z-10 sticky top-0 flex-shrink-0">
          <AppNavigation
            activeMode={appMode}
            onNavigate={handleModeChange}
            counts={{ pending: pendingCount }}
            isAdmin={isAdmin}
            isInitialLoading={isInitialLoading}
          />
          <ContextToolbar {...toolbarProps} isAdmin={isAdmin} />
        </div>

        <div
          className="flex-1 overflow-auto p-6 bg-black/20 space-y-4"
          data-tour="review-area"
        >
          {!showHistory &&
            uniqueFilteredQuestions.length === 0 &&
            questions.length === 0 &&
            !status &&
            appMode === APP_MODES.CREATE && <EmptyState />}
          {/* CREATE MODE: Call-to-Action Banner */}
          {appMode === APP_MODES.CREATE && questions.length > 0 && (
            <ReviewModeBanner
              onNavigateToReview={() => handleModeSelect(APP_MODES.REVIEW)}
            />
          )}

          <Suspense fallback={<LoadingSpinner />}>
            <ViewRouter
              appMode={appMode}
              uniqueFilteredQuestions={uniqueFilteredQuestions}
              databaseQuestions={databaseQuestions}
              config={config}
              effectiveApiKey={effectiveApiKey}
              isAdmin={isAdmin}
              isProcessing={isProcessing}
              // ViewRouter props
              handlers={viewRouterHandlers}
              state={viewRouterState}
              setters={viewRouterSetters}
              onNavigateToCreate={() => handleModeSelect(APP_MODES.CREATE)}
              onNavigateHome={handleGoHome}
              onStartTutorial={onStartTutorial}
              allQuestionsMap={allQuestionsMap}
              allLanguageQuestions={allLanguageQuestions}
              activeScenario={activeScenario}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
