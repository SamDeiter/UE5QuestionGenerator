import React from "react";
import { Suspense } from "react";
import Icon from "./Icon";
// Lazy load heavy views
const DatabaseView = React.lazy(() => import("./DatabaseView"));
const ReviewMode = React.lazy(() => import("./ReviewMode"));

const AnalyticsView = React.lazy(() => import("./AnalyticsView"));
const PromptPlayground = React.lazy(() => import("./PromptPlayground"));
import BulkActionBar from "./BulkActionBar";
import QuestionList from "./QuestionList";

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-10 text-slate-500">
    <Icon name="loader" className="animate-spin mr-2" /> Loading...
  </div>
);

/**
 * EmptyReviewState - Illustrated empty state with CTA
 * Guides users to generate questions when Review is empty
 */
const EmptyReviewState = ({
  onNavigateToCreate,
  hasQuestionsInOtherFilters = false,
}) => (
  <div className="flex flex-col items-center justify-center h-full py-16 px-8">
    {/* Illustration */}
    <div className="relative mb-8">
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
        <Icon name="clipboard-list" size={48} className="text-indigo-400" />
      </div>
      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center animate-bounce">
        <Icon name="sparkles" size={20} className="text-orange-400" />
      </div>
    </div>

    {/* Message */}
    <h3 className="text-xl font-bold text-white mb-2">
      {hasQuestionsInOtherFilters ? "No Pending Questions" : "Ready to Review"}
    </h3>
    <p className="text-slate-400 text-center max-w-md mb-6">
      {hasQuestionsInOtherFilters
        ? "All questions in this filter have been reviewed! Check other filters or generate more."
        : "Generate your first batch of questions to start reviewing and approving them for your assessments."}
    </p>

    {/* CTA Button */}
    <button
      onClick={onNavigateToCreate}
      className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95"
    >
      <Icon name="plus-circle" size={20} />
      Generate Your First Batch
    </button>

    {/* Keyboard shortcut hint */}
    <p className="text-xs text-slate-600 mt-4">
      or press{" "}
      <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">
        Ctrl
      </kbd>{" "}
      +{" "}
      <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">
        Enter
      </kbd>{" "}
      in Create mode
    </p>
  </div>
);

const ViewRouter = ({
  appMode,
  uniqueFilteredQuestions,
  databaseQuestions,

  config,
  effectiveApiKey,
  isAdmin,
  isProcessing,
  handlers,
  state,
  setters,
  onNavigateToCreate, // callback to switch to Create mode
  onNavigateHome, // callback to go back to landing page
  onStartTutorial, // callback to start tutorial scenario
}) => {
  const {
    handleLoadFromSheets,
    handleLoadFromFirestore,
    handleUpdateDatabaseQuestion,
    handleKickBackToReview,
    handleUpdateStatus,
    handleExplain,
    handleVariate,
    handleCritique,
    handleApplyRewrite,
    handleTranslateSingle,
    handleLanguageSwitch,
    handleDelete,
    handleManualUpdate,
    selectAll,
    clearSelection,
    bulkUpdateStatus,
    toggleSelection,
  } = handlers;

  const {
    currentReviewIndex,
    selectedIds,
    translationMap,
    filterByCreator,
    filteredQuestions,
    questions,
    status,
  } = state;
  const {
    setDatabaseQuestions,
    setCurrentReviewIndex,
    setFilterByCreator,
    showMessage,
  } = setters;

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {appMode === "analytics" ? (
        <AnalyticsView
          onBack={onNavigateHome}
          onStartTutorial={() => onStartTutorial("analytics")}
        />
      ) : appMode === "database" ? (
        <DatabaseView
          questions={databaseQuestions}
          sheetUrl={config.sheetUrl}
          onLoad={handleLoadFromSheets}
          onLoadFirestore={handleLoadFromFirestore}
          onClearView={() => setDatabaseQuestions([])}
          onHardReset={() => setDatabaseQuestions([])}
          onUpdateQuestion={handleUpdateDatabaseQuestion}
          onKickBack={handleKickBackToReview}
          isProcessing={isProcessing}
          showMessage={showMessage}
          filterMode={state.filterMode}
          sortBy={state.sortBy}
          onStartTutorial={() => onStartTutorial("database")}
        />
      ) : appMode === "playground" && isAdmin ? (
        <PromptPlayground
          config={config}
          apiKeyReady={!!effectiveApiKey}
          effectiveApiKey={effectiveApiKey}
        />
      ) : appMode === "review" && uniqueFilteredQuestions.length > 0 ? (
        <ReviewMode
          questions={uniqueFilteredQuestions}
          currentIndex={currentReviewIndex}
          setCurrentIndex={setCurrentReviewIndex}
          onUpdateStatus={handleUpdateStatus}
          onExplain={handleExplain}
          onVariate={handleVariate}
          onCritique={handleCritique}
          onApplyRewrite={handleApplyRewrite}
          onTranslateSingle={handleTranslateSingle}
          onSwitchLanguage={handleLanguageSwitch}
          onDelete={handleDelete}
          onUpdateQuestion={handleManualUpdate}
          translationMap={translationMap}
          isProcessing={isProcessing}
          showMessage={showMessage}
          onStartTutorial={() => onStartTutorial("review")}
        />
      ) : appMode === "review" && uniqueFilteredQuestions.length === 0 ? (
        /* NEW: Empty state for Review mode with CTA */
        <EmptyReviewState
          onNavigateToCreate={onNavigateToCreate}
          hasQuestionsInOtherFilters={
            filteredQuestions.length > 0 || questions.length > 0
          }
        />
      ) : (
        <>
          <BulkActionBar
            selectedCount={selectedIds.size}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onAcceptAll={() => bulkUpdateStatus("accepted")}
            onRejectAll={() => bulkUpdateStatus("rejected", "other")}
          />
          <QuestionList
            questions={uniqueFilteredQuestions}
            translationMap={translationMap}
            selectedIds={selectedIds}
            appMode={appMode}
            isProcessing={isProcessing}
            onUpdateStatus={handleUpdateStatus}
            onExplain={handleExplain}
            onVariate={handleVariate}
            onCritique={handleCritique}
            onApplyRewrite={handleApplyRewrite}
            onTranslateSingle={handleTranslateSingle}
            onSwitchLanguage={handleLanguageSwitch}
            onDelete={handleDelete}
            onUpdateQuestion={handleManualUpdate}
            showMessage={showMessage}
            toggleSelection={toggleSelection}
          />
        </>
      )}

      {uniqueFilteredQuestions.length === 0 &&
        filteredQuestions.length > 0 &&
        appMode !== "review" && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 pt-10">
            <Icon name="filter" size={32} className="mb-3 text-slate-800" />
            <p className="font-medium text-slate-500">
              No questions match current filters.
            </p>
            {filterByCreator && (
              <p className="text-xs text-slate-600 mt-2">
                Filtering by Creator:{" "}
                <span className="text-blue-500 font-bold">
                  {config.creatorName}
                </span>
                .
                <button
                  onClick={() => setFilterByCreator(false)}
                  className="ml-2 underline hover:text-blue-400"
                >
                  Show All Creators?
                </button>
              </p>
            )}
          </div>
        )}

      {!state.showHistory &&
        uniqueFilteredQuestions.length === 0 &&
        questions.length === 0 &&
        !status &&
        appMode === "create" && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <Icon name="terminal" size={48} className="mb-4 text-slate-800" />
            <p className="font-medium text-slate-500">
              Ready. Click 'GENERATE QUESTIONS' to begin or upload a source
              file.
            </p>
          </div>
        )}
    </Suspense>
  );
};

export default ViewRouter;
