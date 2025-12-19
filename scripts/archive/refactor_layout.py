"""
Refactor App.jsx to use the new MainLayout component.

This script:
1. Adds import for MainLayout
2. Removes inline sidebar/main content JSX
3. Replaces with MainLayout component
4. Removes redundant imports
"""

def refactor_app_jsx():
    """Refactor App.jsx to use MainLayout component."""
    
    with open('src/App.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add import for MainLayout, remove redundant imports
    old_imports = """import ToastContainer from './components/ToastContainer';
import EmptyState from './components/EmptyState';
import ReviewModeBanner from './components/ReviewModeBanner';
import Sidebar from './components/Sidebar';
import GlobalModals from './components/GlobalModals';
import ViewRouter from './components/ViewRouter';
import AppNavigation from './components/AppNavigation';
import ContextToolbar from './components/ContextToolbar';"""
    
    new_imports = """import ToastContainer from './components/ToastContainer';
import GlobalModals from './components/GlobalModals';
import MainLayout from './components/MainLayout';"""
    
    content = content.replace(old_imports, new_imports)
    
    # 2. Remove the inline main layout JSX and replace with MainLayout component
    old_layout = """            <div className="flex flex-1 overflow-hidden">
                {appMode === 'create' && (
                    <Sidebar
                        showGenSettings={showGenSettings}
                        setShowGenSettings={setShowGenSettings}
                        config={config}
                        handleChange={handleChange}
                        allQuestionsMap={allQuestionsMap}
                        approvedCounts={approvedCounts}
                        overallPercentage={overallPercentage}
                        totalApproved={totalApproved}
                        TARGET_TOTAL={TARGET_TOTAL}
                        TARGET_PER_CATEGORY={TARGET_PER_CATEGORY}
                        isTargetMet={isTargetMet}
                        maxBatchSize={maxBatchSize}
                        batchSizeWarning={batchSizeWarning}
                        handleGenerate={handleGenerate}
                        isGenerating={isGenerating}
                        isApiReady={isApiReady}
                        handleBulkTranslateMissing={handleBulkTranslateMissing}
                        isProcessing={isProcessing}
                        setShowSettings={setShowSettings}
                        handleSelectCategory={handleSelectCategory}
                        customTags={customTags}
                        status={status}
                    />
                )}
                <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
                    <div className="flex flex-col border-b border-slate-800 bg-slate-900 z-10">
                        <AppNavigation
                            activeMode={appMode}
                            onNavigate={(mode) => {
                                if (mode === 'analytics') setAppMode('analytics');
                                else if (mode === 'database') handleViewDatabase();
                                else handleModeSelect(mode);
                            }}
                            counts={{ pending: pendingCount }}
                        />
                        <ContextToolbar
                            mode={appMode}
                            counts={contextCounts}
                            filterMode={filterMode}
                            setFilterMode={setFilterMode}
                            filterByCreator={filterByCreator}
                            setFilterByCreator={setFilterByCreator}
                            filterTags={filterTags}
                            setFilterTags={setFilterTags}
                            customTags={customTags} // Pass customTags for the selector
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            sortBy={sortBy}
                            setSortBy={setSortBy}
                            isProcessing={isProcessing}
                            status={status}
                            isAuthReady={isAuthReady}
                            config={config}
                            onLoadSheets={handleLoadFromSheets}
                            onLoadFirestore={handleLoadFromFirestore}
                            onBulkExport={() => setShowBulkExportModal(true)}
                            onClearPending={handleClearPending}
                            onBulkAcceptHighScores={appMode === 'review' ? handleBulkAcceptHighScores : undefined}
                            onBulkCritiqueAll={appMode === 'review' ? handleBulkCritiqueAll : undefined}
                        />
                    </div>

                    <div className="flex-1 overflow-auto p-6 bg-black/20 space-y-4" data-tour="review-area">
                        {!showHistory && uniqueFilteredQuestions.length === 0 && questions.length === 0 && !status && appMode === 'create' && <EmptyState />}

                        {/* CREATE MODE: Call-to-Action Banner */}
                        {appMode === 'create' && questions.length > 0 && (
                            <ReviewModeBanner onNavigateToReview={() => handleModeSelect('review')} />
                        )}

                        <Suspense fallback={<LoadingSpinner />}>
                            <ViewRouter
                                appMode={appMode}
                                uniqueFilteredQuestions={uniqueFilteredQuestions}
                                databaseQuestions={databaseQuestions}
                                config={config}
                                isProcessing={isProcessing}
                                handlers={{
                                    handleLoadFromSheets, handleLoadFromFirestore, handleUpdateDatabaseQuestion, handleKickBackToReview,
                                    handleUpdateStatus, handleExplain, handleVariate, handleCritique, handleApplyRewrite, handleTranslateSingle, handleLanguageSwitch, handleDelete, handleManualUpdate,
                                    selectAll, clearSelection, bulkUpdateStatus, toggleSelection
                                }}
                                state={{
                                    currentReviewIndex, selectedIds, translationMap, filterByCreator, filteredQuestions, questions, status, filterMode, sortBy, showHistory
                                }}
                                setters={{
                                    setDatabaseQuestions, setCurrentReviewIndex, setFilterByCreator, showMessage
                                }}
                                onNavigateToCreate={() => handleModeSelect('create')}
                                onNavigateHome={handleGoHome}
                            />
                        </Suspense>
                    </div>
                </main>
            </div>"""
    
    new_layout = """            <MainLayout
                appMode={appMode}
                setAppMode={setAppMode}
                sidebarProps={{
                    showGenSettings, setShowGenSettings, config, handleChange,
                    allQuestionsMap, approvedCounts, overallPercentage, totalApproved,
                    isTargetMet, maxBatchSize, batchSizeWarning, handleGenerate,
                    isGenerating, isApiReady, handleBulkTranslateMissing, isProcessing,
                    setShowSettings, handleSelectCategory, customTags, status
                }}
                handleModeSelect={handleModeSelect}
                handleViewDatabase={handleViewDatabase}
                pendingCount={pendingCount}
                toolbarProps={{
                    mode: appMode, counts: contextCounts, filterMode, setFilterMode,
                    filterByCreator, setFilterByCreator, filterTags, setFilterTags,
                    customTags, searchTerm, setSearchTerm, sortBy, setSortBy,
                    isProcessing, status, isAuthReady, config,
                    onLoadSheets: handleLoadFromSheets, onLoadFirestore: handleLoadFromFirestore,
                    onBulkExport: () => setShowBulkExportModal(true), onClearPending: handleClearPending,
                    onBulkAcceptHighScores: appMode === 'review' ? handleBulkAcceptHighScores : undefined,
                    onBulkCritiqueAll: appMode === 'review' ? handleBulkCritiqueAll : undefined
                }}
                showHistory={showHistory}
                uniqueFilteredQuestions={uniqueFilteredQuestions}
                questions={questions}
                status={status}
                databaseQuestions={databaseQuestions}
                config={config}
                isProcessing={isProcessing}
                viewRouterHandlers={{
                    handleLoadFromSheets, handleLoadFromFirestore, handleUpdateDatabaseQuestion, handleKickBackToReview,
                    handleUpdateStatus, handleExplain, handleVariate, handleCritique, handleApplyRewrite, handleTranslateSingle, handleLanguageSwitch, handleDelete, handleManualUpdate,
                    selectAll, clearSelection, bulkUpdateStatus, toggleSelection
                }}
                viewRouterState={{
                    currentReviewIndex, selectedIds, translationMap, filterByCreator, filteredQuestions, questions, status, filterMode, sortBy, showHistory
                }}
                viewRouterSetters={{
                    setDatabaseQuestions, setCurrentReviewIndex, setFilterByCreator, showMessage
                }}
                handleGoHome={handleGoHome}
            />"""
    
    content = content.replace(old_layout, new_layout)
    
    # 3. Remove unused imports
    content = content.replace("import { Suspense } from 'react';", "")
    content = content.replace("import { useState, Suspense } from 'react';", "import { useState } from 'react';")
    
    # 4. Remove unused constants import if no longer needed
    content = content.replace("import { TARGET_TOTAL, TARGET_PER_CATEGORY } from './utils/constants';", "")
    
    # 5. Remove LoadingSpinner since it's now in MainLayout
    old_spinner = """
// Loading Fallback
const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-10 text-slate-500">
        <Icon name="loader" className="animate-spin mr-2" /> Loading...
    </div>
);

// Lazy Loaded Components

"""
    new_spinner = """
"""
    content = content.replace(old_spinner, new_spinner)
    
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Refactored App.jsx to use MainLayout component")
    print("   - Added import for MainLayout")
    print("   - Replaced inline sidebar/main content with MainLayout")
    print("   - Removed redundant component imports")
    print("   - Removed LoadingSpinner (now in MainLayout)")

if __name__ == '__main__':
    refactor_app_jsx()
