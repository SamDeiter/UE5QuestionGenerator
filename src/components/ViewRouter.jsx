import React from "react";
import { Suspense } from "react";
import Icon from "./Icon";
import { SuspenseSpinner as LoadingSpinner } from "./LoadingSpinner";
// Lazy load heavy views - most views are lazy for better navigation perf
const AnalyticsView = React.lazy(() => import("./AnalyticsView"));
const DatabaseView = React.lazy(() => import("./DatabaseView"));
// ReviewMode is eagerly loaded to prevent remount issues with edit locks
import ReviewMode from "./ReviewMode";
const TestView = React.lazy(() => import("./TestView"));
const PromptPlayground = React.lazy(() => import("./PromptPlayground"));
const AdminPanel = React.lazy(() => import("./AdminPanel"));
const TranslationManagementView = React.lazy(
  () => import("./TranslationManagementView")
);
import QuestionList from "./QuestionList";
import { APP_MODES } from "../utils/constants";
import { createTutorialDemoQuestion } from "../utils/tutorialDemoQuestion";

/**
 * EmptyReviewState - Illustrated empty state with CTA
 * Guides users to generate questions when Review is empty
 */
const EmptyReviewState = ({
  onNavigateToCreate,
  hasQuestionsInOtherFilters = false,
  isAdmin = false,
}) => {
  const getMessage = () => {
    if (hasQuestionsInOtherFilters) {
      return "All questions in this filter have been reviewed! Check other filters or generate more.";
    }
    if (isAdmin) {
      return "Generate your first batch of questions to start reviewing and approving them for your assessments.";
    }
    return "No questions are pending review. Ask an administrator to generate more questions.";
  };

  return (
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
        {hasQuestionsInOtherFilters
          ? "No Pending Questions"
          : "Ready to Review"}
      </h3>
      <p className="text-slate-400 text-center max-w-md mb-6">{getMessage()}</p>

      {/* CTA Button - Admin only */}
      {isAdmin && (
        <button
          onClick={onNavigateToCreate}
          className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95"
        >
          <Icon name="plus-circle" size={20} />
          Generate Your First Batch
        </button>
      )}

      {/* Keyboard shortcut hint - Admin only */}
      {isAdmin && (
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
      )}
    </div>
  );
};

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
  allQuestionsMap, // all questions for analytics
  activeScenario, // active tutorial scenario for demo card injection
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
  } = handlers;

  const {
    currentReviewIndex,
    translationMap,
    filterByCreator,
    filteredQuestions,
    questions,
    status,
    userRole,
    isInitialLoading,
  } = state;
  const { setCurrentReviewIndex, setFilterByCreator, showMessage } = setters;

  /**
   * Render the appropriate view based on appMode
   */
  const renderView = () => {
    // Review mode with questions is special-cased because it's the most common and complex
    if (appMode === APP_MODES.REVIEW) {
      // Check if tutorial is active for review mode - ALWAYS use demo card during tutorial
      const isReviewTutorialActive = activeScenario === "review";

      // During tutorial, always use demo card for consistent experience
      // Otherwise, use real questions
      let effectiveQuestions = uniqueFilteredQuestions;
      if (isReviewTutorialActive) {
        effectiveQuestions = [createTutorialDemoQuestion()];
      }

      // Show loading state during initial data fetch (prevents false empty state on refresh)
      if (isInitialLoading && effectiveQuestions.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-full py-16 px-8">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-indigo-200/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Loading Questions
            </h3>
            <p className="text-slate-400 text-sm">Syncing from database...</p>
          </div>
        );
      }

      if (effectiveQuestions.length > 0) {
        return (
          <ReviewMode
            questions={effectiveQuestions}
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
            onStartTutorial={() => onStartTutorial(APP_MODES.REVIEW)}
            onKickBack={handleKickBackToReview}
            userRole={userRole}
            allQuestionsMap={allQuestionsMap}
          />
        );
      }
      return (
        <EmptyReviewState
          onNavigateToCreate={onNavigateToCreate}
          hasQuestionsInOtherFilters={
            filteredQuestions.length > 0 || questions.length > 0
          }
          isAdmin={isAdmin}
        />
      );
    }

    // Map other modes to components
    const viewMap = {
      [APP_MODES.ANALYTICS]: (
        <AnalyticsView
          onBack={onNavigateHome}
          onStartTutorial={() => onStartTutorial(APP_MODES.ANALYTICS)}
          allQuestionsMap={allQuestionsMap}
        />
      ),
      [APP_MODES.DATABASE]: (
        <DatabaseView
          questions={databaseQuestions}
          sheetUrl={config.sheetUrl}
          onLoad={handleLoadFromSheets}
          onLoadFirestore={handleLoadFromFirestore}
          onUpdateQuestion={handleUpdateDatabaseQuestion}
          onKickBack={handleKickBackToReview}
          onCritique={handleCritique}
          isProcessing={isProcessing}
          showMessage={showMessage}
          filterMode={state.filterMode}
          sortBy={state.sortBy}
          searchTerm={state.searchTerm}
          onStartTutorial={() => onStartTutorial(APP_MODES.DATABASE)}
          isAdmin={isAdmin}
          userRole={userRole}
        />
      ),
      [APP_MODES.TEST]: isAdmin && (
        <TestView
          questions={[...questions, ...databaseQuestions]}
          config={config}
          isAdmin={isAdmin}
          showMessage={showMessage}
        />
      ),
      [APP_MODES.PLAYGROUND]: isAdmin && (
        <PromptPlayground
          config={config}
          apiKeyReady={!!effectiveApiKey}
          effectiveApiKey={effectiveApiKey}
        />
      ),
      [APP_MODES.ADMIN]: isAdmin && (
        <AdminPanel
          showMessage={showMessage}
          config={config}
          handleChange={handlers.handleChange}
          showApiKey={state.showApiKey}
          setShowApiKey={setters.setShowApiKey}
          files={state.files}
          handleDetectTopics={handlers.handleDetectTopics}
          isDetecting={state.isDetecting}
          fileInputRef={state.fileInputRef}
          handleFileChange={handlers.handleFileChange}
          removeFile={handlers.removeFile}
          isApiReady={!!effectiveApiKey}
          customTags={state.customTags}
          onSaveCustomTags={handlers.handleSaveCustomTags}
          currentUser={state.currentUser}
        />
      ),
      [APP_MODES.TRANSLATE]: isAdmin && (
        <TranslationManagementView
          questions={databaseQuestions}
          allQuestionsMap={allQuestionsMap}
          translationMap={translationMap}
          onTranslateSingle={handleTranslateSingle}
          onSwitchLanguage={handleLanguageSwitch}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDelete}
          onUpdateQuestion={handleManualUpdate}
          isProcessing={isProcessing}
          showMessage={showMessage}
          userRole={userRole}
        />
      ),
    };

    const selectedView = viewMap[appMode];
    if (selectedView) return selectedView;

    // Default: QuestionList for create mode or any unmapped modes
    return (
      <QuestionList
        questions={uniqueFilteredQuestions}
        translationMap={translationMap}
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
        userRole={userRole}
        allQuestionsMap={allQuestionsMap}
      />
    );
  };

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {renderView()}

      {uniqueFilteredQuestions.length === 0 &&
        filteredQuestions.length > 0 &&
        appMode !== APP_MODES.REVIEW && (
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
        appMode === APP_MODES.CREATE && (
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
