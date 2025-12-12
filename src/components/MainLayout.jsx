/**
 * MainLayout Component
 *
 * The main application layout containing:
 * - Sidebar (create mode only)
 * - Main content area with navigation and toolbar
 * - ViewRouter for rendering different modes
 */
import { Suspense } from "react";
import Icon from "./Icon";
import Sidebar from "./Sidebar";
import AppNavigation from "./AppNavigation";
import ContextToolbar from "./ContextToolbar";
import ViewRouter from "./ViewRouter";
import EmptyState from "./EmptyState";
import ReviewModeBanner from "./ReviewModeBanner";
import { TARGET_TOTAL, TARGET_PER_CATEGORY } from "../utils/constants";

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-10 text-slate-500">
    <Icon name="loader" className="animate-spin mr-2" /> Loading...
  </div>
);

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

  // ViewRouter props
  viewRouterHandlers,
  viewRouterState,
  viewRouterSetters,
  handleGoHome,
  onStartTutorial,
}) => {
  return (
    <div className="flex flex-1 overflow-hidden">
      {appMode === "create" && (
        <Sidebar
          {...sidebarProps}
          TARGET_TOTAL={TARGET_TOTAL}
          TARGET_PER_CATEGORY={TARGET_PER_CATEGORY}
        />
      )}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <div className="flex flex-col border-b border-slate-800 bg-slate-900 z-10">
          <AppNavigation
            activeMode={appMode}
            onNavigate={(mode) => {
              if (mode === "analytics") setAppMode("analytics");
              else if (mode === "database") handleViewDatabase();
              else handleModeSelect(mode);
            }}
            counts={{ pending: pendingCount }}
            isAdmin={isAdmin}
          />
          <ContextToolbar {...toolbarProps} />
        </div>

        <div
          className="flex-1 overflow-auto p-6 bg-black/20 space-y-4"
          data-tour="review-area"
        >
          {!showHistory &&
            uniqueFilteredQuestions.length === 0 &&
            questions.length === 0 &&
            !status &&
            appMode === "create" && <EmptyState />}

          {/* CREATE MODE: Call-to-Action Banner */}
          {appMode === "create" && questions.length > 0 && (
            <ReviewModeBanner
              onNavigateToReview={() => handleModeSelect("review")}
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
              onNavigateToCreate={() => handleModeSelect("create")}
              onNavigateHome={handleGoHome}
              onStartTutorial={onStartTutorial}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
