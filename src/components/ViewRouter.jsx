import React, { Suspense } from 'react';
import Icon from './Icon';
import BulkActionBar from './BulkActionBar';
import QuestionList from './QuestionList';

// Lazy load heavy views
const DatabaseView = React.lazy(() => import('./DatabaseView'));
const ReviewMode = React.lazy(() => import('./ReviewMode'));

const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-10 text-slate-500">
        <Icon name="loader" className="animate-spin mr-2" /> Loading...
    </div>
);

const ViewRouter = ({
    appMode,
    uniqueFilteredQuestions,
    databaseQuestions,
    config,
    isProcessing,
    handlers, // object containing all event handlers
    state, // object containing necessary state (currentIndex, selectedIds, translationMap)
    setters // object containing state setters (setDatabaseQuestions, setCurrentReviewIndex, etc)
}) => {

    // Deconstruct for easier access
    const {
        handleLoadFromSheets, handleLoadFromFirestore, handleUpdateDatabaseQuestion, handleKickBackToReview,
        handleUpdateStatus, handleExplain, handleVariate, handleCritique, handleTranslateSingle, handleLanguageSwitch, handleDelete, handleManualUpdate,
        selectAll, clearSelection, bulkUpdateStatus, toggleSelection
    } = handlers;

    const { currentReviewIndex, selectedIds, translationMap, filterByCreator, filteredQuestions, questions, status } = state;
    const { setDatabaseQuestions, setCurrentReviewIndex, setFilterByCreator, showMessage } = setters;

    return (
        <Suspense fallback={<LoadingSpinner />}>
            {appMode === 'database' ? (
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
                />
            ) : appMode === 'review' && uniqueFilteredQuestions.length > 0 ? (
                <ReviewMode
                    questions={uniqueFilteredQuestions}
                    currentIndex={currentReviewIndex}
                    setCurrentIndex={setCurrentReviewIndex}
                    onUpdateStatus={handleUpdateStatus}
                    onExplain={handleExplain}
                    onVariate={handleVariate}
                    onCritique={handleCritique}
                    onTranslateSingle={handleTranslateSingle}
                    onSwitchLanguage={handleLanguageSwitch}
                    onDelete={handleDelete}
                    onUpdateQuestion={handleManualUpdate}
                    translationMap={translationMap}
                    isProcessing={isProcessing}
                    showMessage={showMessage}
                />
            ) : (
                <>
                    <BulkActionBar
                        selectedCount={selectedIds.size}
                        onSelectAll={selectAll}
                        onClearSelection={clearSelection}
                        onAcceptAll={() => bulkUpdateStatus('accepted')}
                        onRejectAll={() => bulkUpdateStatus('rejected', 'other')}
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
                        onTranslateSingle={handleTranslateSingle}
                        onSwitchLanguage={handleLanguageSwitch}
                        onDelete={handleDelete}
                        onUpdateQuestion={handleManualUpdate}
                        showMessage={showMessage}
                        toggleSelection={toggleSelection}
                    />
                </>
            )}

            {uniqueFilteredQuestions.length === 0 && filteredQuestions.length > 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 pt-10">
                    <Icon name="filter" size={32} className="mb-3 text-slate-800" />
                    <p className="font-medium text-slate-500">No questions match current filters.</p>
                    {filterByCreator && (
                        <p className="text-xs text-slate-600 mt-2">
                            Filtering by Creator: <span className="text-blue-500 font-bold">{config.creatorName}</span>.
                            <button onClick={() => setFilterByCreator(false)} className="ml-2 underline hover:text-blue-400">Show All Creators?</button>
                        </p>
                    )}
                </div>
            )}

            {!state.showHistory && uniqueFilteredQuestions.length === 0 && questions.length === 0 && !status && appMode === 'create' && (
                <div className="flex flex-col items-center justify-center h-full text-slate-600">
                    <Icon name="terminal" size={48} className="mb-4 text-slate-800" />
                    <p className="font-medium text-slate-500">Ready. Click 'GENERATE QUESTIONS' to begin or upload a source file.</p>
                </div>
            )}
        </Suspense>
    );
};

export default ViewRouter;
