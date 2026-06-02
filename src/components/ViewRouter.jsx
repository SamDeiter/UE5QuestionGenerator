import React from "react";
import { Suspense } from "react";
import Icon from "./Icon";
import { SuspenseSpinner as LoadingSpinner } from "./LoadingSpinner";
import EmptyReviewState from "./EmptyReviewState";
import ReviewLoadingState from "./ReviewLoadingState";
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
import { useShallow } from "zustand/react/shallow";
import { useAppConfigStore } from "../store/appConfigStore";
import { useFilterStore } from "../store/filterStore";
import {
  useTranslationMap,
  useSessionQuestions,
} from "../store/questionSelectors";
import { usePaginatedReview } from "../hooks/usePaginatedReview";

const ViewRouter = ({
  uniqueFilteredQuestions,
  databaseQuestions,

  effectiveApiKey,
  isAdmin,
  isProcessing,
  handlers,
  state,
  setters = {},
  onNavigateToCreate, // callback to switch to Create mode
  onNavigateHome, // callback to go back to landing page
  onStartTutorial, // callback to start tutorial scenario
  allQuestionsMap, // all questions for analytics
  allLanguageQuestions, // flat all-variants list (for SCORM per-language export)
  activeScenario, // active tutorial scenario for demo card injection
}) => {
  // appMode + config + filter state + pure-derived views now come from the
  // stores instead of being threaded through MainLayout's state/setters bags.
  const appMode = useAppConfigStore((s) => s.appMode);
  const config = useAppConfigStore((s) => s.config);
  const translationMap = useTranslationMap();
  const questions = useSessionQuestions();
  const {
    currentReviewIndex,
    setCurrentReviewIndex,
    filterByCreator,
    setFilterByCreator,
    filterMode,
    sortBy,
    searchTerm,
    showHistory,
    filterTags,
    filterScoreTier,
    filterByReviewer,
  } = useFilterStore(
    useShallow((s) => ({
      currentReviewIndex: s.currentReviewIndex,
      setCurrentReviewIndex: s.setCurrentReviewIndex,
      filterByCreator: s.filterByCreator,
      setFilterByCreator: s.setFilterByCreator,
      filterMode: s.filterMode,
      sortBy: s.sortBy,
      searchTerm: s.searchTerm,
      showHistory: s.showHistory,
      filterTags: s.filterTags,
      filterScoreTier: s.filterScoreTier,
      filterByReviewer: s.filterByReviewer,
    }))
  );

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

  const { filteredQuestions, status, userRole, isInitialLoading } = state;

  // Tier 2: first-paint pagination for Review mode. Only kicks in on a cold
  // load (in-memory list still empty) and only for the "clean default" filter
  // state the paginated query can faithfully reproduce server-side. As soon as
  // the background sync fills the in-memory list, we switch back to it.
  const hasMemoryData = uniqueFilteredQuestions.length > 0;
  const cleanDefault =
    searchTerm === "" &&
    (filterTags?.length ?? 0) === 0 &&
    filterScoreTier === "" &&
    filterByReviewer === "" &&
    filterByCreator === false &&
    showHistory === false &&
    sortBy === "default";
  const {
    questions: paginatedReviewQuestions,
    hasMore: paginatedHasMore,
    fetchNextPage: fetchMoreReview,
  } = usePaginatedReview({
    appMode,
    filterMode,
    discipline: config.discipline,
    hasMemoryData,
    cleanDefault,
  });

  /**
   * Render the appropriate view based on appMode
   */
  const renderView = () => {
    // Review mode with questions is special-cased because it's the most common and complex
    if (appMode === APP_MODES.REVIEW) {
      // Check if tutorial is active for review mode - ALWAYS use demo card during tutorial
      const isReviewTutorialActive = activeScenario === "review";

      // During tutorial, always use demo card for consistent experience.
      // Otherwise prefer the in-memory list; on a cold load fall back to the
      // Tier 2 paginated first-paint slice until the in-memory list arrives.
      let effectiveQuestions = uniqueFilteredQuestions;
      if (isReviewTutorialActive) {
        effectiveQuestions = [createTutorialDemoQuestion()];
      } else if (effectiveQuestions.length === 0) {
        effectiveQuestions = paginatedReviewQuestions;
      }

      // Whether the card list is currently served by the paginated fallback
      // (so we only wire prefetch when there are more server pages to pull).
      const usingPaginated =
        !isReviewTutorialActive &&
        uniqueFilteredQuestions.length === 0 &&
        paginatedReviewQuestions.length > 0;

      // Show loading state during initial data fetch (prevents false empty state on refresh)
      if (isInitialLoading && effectiveQuestions.length === 0) {
        return <ReviewLoadingState />;
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
            onRequestMore={usingPaginated ? fetchMoreReview : undefined}
            hasMore={usingPaginated ? paginatedHasMore : false}
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
          allQuestionsMap={allQuestionsMap}
          sheetUrl={config.sheetUrl}
          onLoad={handleLoadFromSheets}
          onLoadFirestore={handleLoadFromFirestore}
          onUpdateQuestion={handleUpdateDatabaseQuestion}
          onKickBack={handleKickBackToReview}
          onCritique={handleCritique}
          onTranslateSingle={handleTranslateSingle}
          onSwitchLanguage={handleLanguageSwitch}
          addQuestionsToState={handlers.addQuestionsToState}
          isProcessing={isProcessing}
          filterMode={filterMode}
          sortBy={sortBy}
          searchTerm={searchTerm}
          onStartTutorial={() => onStartTutorial(APP_MODES.DATABASE)}
          isAdmin={isAdmin}
          userRole={userRole}
        />
      ),
      [APP_MODES.TEST]: isAdmin && (
        <TestView
          questions={[...questions, ...databaseQuestions]}
          allLanguageQuestions={allLanguageQuestions}
          config={config}
          isAdmin={isAdmin}
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
          userRole={userRole}
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
          userRole={userRole}
          searchTerm={searchTerm}
          filterMode={filterMode}
          onRefresh={handleLoadFromFirestore}
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

      {!showHistory &&
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
