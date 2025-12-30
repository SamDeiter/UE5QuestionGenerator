// ============================================================================
// IMPORTS
// ============================================================================

// React core hooks
import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { runLocalStorageMigration } from "./utils/migrateScores";

// Critical components - keep eager loading (needed immediately)
import Header from "./components/Header";
import ToastContainer from "./components/ToastContainer";
import Footer from "./components/Footer";
import SignIn from "./components/SignIn";
import InviteSignUp from "./components/InviteSignUp";
import ApiKeyModal from "./components/ApiKeyModal";
import ConflictModal from "./components/ConflictModal";
import { getInviteFromUrl } from "./services/inviteService";

// Lazy load heavy components (loaded on-demand)
const LandingPage = lazy(() => import("./components/LandingPage"));
const MainLayout = lazy(() => import("./components/MainLayout"));
const GlobalModals = lazy(() => import("./components/GlobalModals"));
const CrashRecoveryPrompt = lazy(() =>
  import("./components/CrashRecoveryPrompt")
);

// Custom Hooks
import { useAppConfig } from "./hooks/useAppConfig";
import { useQuestionManager } from "./hooks/useQuestionManager";
import { useFileHandler } from "./hooks/useFileHandler";
import { useGeneration } from "./hooks/useGeneration";
import { useExport } from "./hooks/useExport";
import { useCrashRecovery } from "./hooks/useCrashRecovery";
import { useTutorial } from "./hooks/useTutorial";
import { useReviewActions } from "./hooks/useReviewActions";
import { useDatabaseActions } from "./hooks/useDatabaseActions";
import { useNavigation } from "./hooks/useNavigation";
import { useFiltering } from "./hooks/useFiltering";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useToast } from "./hooks/useToast";
// useBulkSelection removed - bulk selection feature no longer used
import { useAuth } from "./hooks/useAuth";
import { useModalState } from "./hooks/useModalState";
import { useAppHandlers } from "./hooks/useAppHandlers";

// Concurrent Editing Agents
import { initializeAgents } from "./agents";
// Utilities

// Simple loading spinner component for auth loading state
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-slate-950">
    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => {
  // ========================================================================
  // HOOKS - Toast Notifications
  // ========================================================================
  const { toasts, removeToast, showMessage } = useToast();

  // ========================================================================
  // HOOKS - Auth, Custom Tags, and Compliance (extracted to useAuth)
  // ========================================================================
  const {
    user,
    authLoading,
    isAdmin,
    userRole,
    isRegistered: _isRegistered,
    registrationLoading,
    markAsRegistered,
    customTags,
    handleSaveCustomTags,
    tokenUsage,
    showTerms,
    setShowTerms,
    showAgeGate,
    setShowAgeGate,
    setTermsAccepted,
  } = useAuth(showMessage);

  // ... (rest of the file)

  // 0. Tutorial System
  const {
    tutorialActive,
    currentStep,
    tutorialSteps,
    activeScenario,
    handleTutorialNext,
    handleTutorialPrev,
    handleTutorialSkip,
    handleTutorialComplete,
    handleRestartTutorial,
    handleStartTutorial,
  } = useTutorial(showMessage, undefined, {
    // TODO: Wire up actual panel/modal setters when implementing tutorial actions
    // setShowAdvancedConfig: (open) => { /* implement */ },
    // setShowCritiqueModal: (open) => { /* implement */ },
    // setActiveAnalyticsTab: (tab) => { /* implement */ },
  });

  // ========================================================================
  // CONCURRENT EDITING AGENTS - Initialize once when user is authenticated
  // ========================================================================
  useEffect(() => {
    if (user && !authLoading) {
      // Initialize agents with Firestore instance
      const initAgents = async () => {
        try {
          const { db } = await import("./services/firebase");
          initializeAgents(db);
          console.log("✅ Concurrent editing agents initialized");
        } catch (error) {
          console.error("❌ Failed to initialize agents:", error);
        }
      };
      initAgents();
    }
  }, [user, authLoading]);

  // ========================================================================
  // HOOKS - State Management
  // ========================================================================

  // 1. App Configuration & UI State
  const {
    appMode,
    setAppMode,
    config,
    setConfig,
    isAuthReady,
    isApiReady,
    effectiveApiKey,
    apiKeyStatus,
    showNameModal,
    setShowNameModal,
    showGenSettings,
    setShowGenSettings,
    setShowApiError,
    batchSizeWarning,
    showSettings,
    setShowSettings,
    showApiKey,
    setShowApiKey,
    handleChange,
    handleNameSave,
    handleLanguageSwitch,
    pendingNavigationUniqueId,
    setPendingNavigationUniqueId,
  } = useAppConfig();

  // One-time migration: Force language to English and clear any cached preferences
  useEffect(() => {
    const migrationKey = "language_reset_v1";
    const hasReset = localStorage.getItem(migrationKey);

    if (!hasReset) {
      console.log("🔄 Running language reset migration...");
      // Force config to English
      setConfig((prev) => ({ ...prev, language: "English" }));
      // Mark migration as complete
      localStorage.setItem(migrationKey, "true");
      console.log("✅ Language reset to English");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // 2. Question Data Management
  const {
    questions,
    setQuestions,
    historicalQuestions,
    setHistoricalQuestions,
    databaseQuestions,
    setDatabaseQuestions,
    allQuestionsMap,
    translationMap,
    addQuestionsToState,
    updateQuestionInState,
    updateAllVariantsInState,
    handleUpdateStatus,
    approvedCounts,
    approvedCount,

    pendingCount: totalApproved,
    overallPercentage,
    isTargetMet,
    maxBatchSize,
    deleteConfirmId,
    setDeleteConfirmId,
    showClearModal,
    setShowClearModal,
    handleDelete,
    confirmDelete,
    handleDeleteAllQuestions,
    checkAndStoreQuestions,
    unifiedQuestions,
    handleUpdateQuestion, // Persistent update handler
    // Concurrent editing conflict resolution
    conflictData,
    showConflictModal,
    setShowConflictModal,
  } = useQuestionManager(config, showMessage);

  // 2.5. Crash Recovery - detect and restore from cloud backup
  const {
    showRecoveryPrompt,
    recoveryData,
    isRecovering,
    handleRecover,
    dismissRecovery,
  } = useCrashRecovery(questions, addQuestionsToState, showMessage);

  // 3. Status State (Shared)
  const [status, setStatus] = useState("");

  // 4. File Handling
  const { fileInputRef, handleFileChange, getFileContext, handleDetectTopics } =
    useFileHandler(
      config,
      setConfig,
      addQuestionsToState,
      showMessage,
      setStatus,
      isApiReady,
      effectiveApiKey
    );

  // 5. Filtering & Search (extracted to useFiltering hook)
  const {
    searchTerm,
    setSearchTerm,
    filterMode,
    setFilterMode,
    showHistory,
    setShowHistory,
    filterByCreator,
    setFilterByCreator,
    filterTags,
    setFilterTags,
    filterScoreTier,
    setFilterScoreTier,
    currentReviewIndex,
    setCurrentReviewIndex,
    sortBy,
    setSortBy,
    contextFilteredQuestions: contextCounts,
    filteredQuestions,
    uniqueFilteredQuestions,
  } = useFiltering({
    questions: unifiedQuestions,
    historicalQuestions: [], // We are using the unified list as source of truth
    config,
    appMode,
    allQuestionsMap,
  });

  // Language switch navigation: navigate to the correct question after language filter changes
  useEffect(() => {
    if (pendingNavigationUniqueId && uniqueFilteredQuestions.length > 0) {
      // Find the index of the question with this uniqueId
      const targetIndex = uniqueFilteredQuestions.findIndex(
        (q) => q.uniqueId === pendingNavigationUniqueId
      );

      console.log("🔄 [App] Navigating after language switch:", {
        pendingNavigationUniqueId,
        targetIndex,
        totalQuestions: uniqueFilteredQuestions.length,
      });

      if (targetIndex >= 0) {
        setCurrentReviewIndex(targetIndex);
      }

      // Clear the pending navigation
      setPendingNavigationUniqueId(null);
    }
  }, [
    pendingNavigationUniqueId,
    uniqueFilteredQuestions,
    setCurrentReviewIndex,
    setPendingNavigationUniqueId,
  ]);

  // Calculate total PENDING questions for the Review badge
  // This count increases when questions are kicked back to review
  const totalPendingQuestions = useMemo(() => {
    let pending = 0;
    allQuestionsMap.forEach((variants) => {
      // Use the English version or first variant to determine status
      const canonical =
        variants.find((v) => (v.language || "English") === "English") ||
        variants[0];
      if (canonical && (!canonical.status || canonical.status === "pending")) {
        pending++;
      }
    });
    console.log("🔍 [DEBUG] Review Badge Count:", {
      allQuestionsMapSize: allQuestionsMap.size,
      pendingCount: pending,
    });
    return pending;
  }, [allQuestionsMap]);

  // 6. Generation & Translation Logic
  const {
    isGenerating,
    isProcessing,
    translationProgress,
    handleGenerate,
    handleTranslateSingle,
    handleExplain,
    handleVariate,
    handleCritique,
    handleApplyRewrite,
    handleBulkTranslateMissing,
  } = useGeneration(
    config,
    setConfig,
    effectiveApiKey,
    isApiReady,
    isTargetMet,
    maxBatchSize,
    getFileContext,
    checkAndStoreQuestions,
    addQuestionsToState,
    updateQuestionInState,
    updateAllVariantsInState,
    handleLanguageSwitch,
    showMessage,
    setStatus,
    setShowNameModal,
    setShowApiError,
    setShowHistory,
    translationMap,
    allQuestionsMap
  );

  // 7. Modal State (extracted to useModalState hook)
  const {
    showExportMenu: setShowExportMenu,
    showBulkExportModal,
    setShowBulkExportModal,
    showAnalytics,
    setShowAnalytics,
    showAdvancedConfig,
    setShowAdvancedConfig,
    showDangerZone,
    setShowDangerZone,
    showApiKeyModal,
    setShowApiKeyModal,
  } = useModalState();

  // 8. Export Logic (must come before Navigation since Navigation depends on handleLoadFromFirestore)
  const {
    handleExportToSheets,
    handleLoadFromSheets,
    handleLoadFromFirestore,
    handleBulkExport,
  } = useExport(
    config,
    questions,
    historicalQuestions,
    uniqueFilteredQuestions,
    allQuestionsMap,
    showHistory,
    showMessage,
    setStatus,
    () => {},
    setDatabaseQuestions,
    setAppMode,
    setShowExportMenu,
    setShowBulkExportModal,
    setHistoricalQuestions
  );

  // Auto-load database questions on startup for difficulty distribution chart
  const hasAutoLoadedRef = useRef(false);
  useEffect(() => {
    if (user && !authLoading && !hasAutoLoadedRef.current) {
      // One-time migration: Add improvedScore to existing critiques
      const migrated = runLocalStorageMigration();
      if (migrated.updated > 0) {
        console.log(
          `🔄 Migrated ${migrated.updated} questions with estimated improved scores`
        );
      }

      hasAutoLoadedRef.current = true;
      console.log("📊 Auto-loading database for difficulty chart...");
      handleLoadFromFirestore(true); // Silent auto-recovery
    }
  }, [user, authLoading, handleLoadFromFirestore]);

  // ONE-TIME MIGRATION: Fix auto-accepted questions in Firestore (inlined)
  const hasMigratedRef = useRef(false);
  useEffect(() => {
    const runMigration = async () => {
      const migrationKey = "ue5_migration_auto_accept_fix";
      if (localStorage.getItem(migrationKey) === "completed") return;

      if (user && !authLoading && isAdmin && !hasMigratedRef.current) {
        hasMigratedRef.current = true;
        try {
          console.log(
            "🔄 Running migration: fixing auto-accepted questions..."
          );

          // Inline migration code (can't use dynamic import - not bundled by Vite)
          const { db } = await import("./services/firebase");
          const { collection, getDocs, doc, updateDoc } = await import(
            "firebase/firestore"
          );

          const questionsRef = collection(db, "questions");
          const snapshot = await getDocs(questionsRef);

          let fixedCount = 0;
          const batch = [];

          snapshot.forEach((docSnap) => {
            const question = docSnap.data();
            if (question.status === "accepted" && !question.reviewCompletedAt) {
              batch.push(
                updateDoc(doc(db, "questions", docSnap.id), {
                  status: "pending",
                  migratedAt: new Date().toISOString(),
                  migrationReason: "auto-accept-bug-fix",
                })
              );
              fixedCount++;
            }
          });

          if (batch.length > 0) {
            await Promise.all(batch);
            console.log(
              `✅ Migration: Fixed ${fixedCount} of ${snapshot.size} questions`
            );
            showMessage(
              `✅ Fixed ${fixedCount} auto-accepted questions - now pending`,
              5000
            );
            setTimeout(() => handleLoadFromFirestore(true), 1000);
          } else {
            console.log(
              `✅ No questions needed fixing (checked ${snapshot.size} questions)`
            );
          }

          localStorage.setItem(migrationKey, "completed");
        } catch (error) {
          console.error("❌ Migration error:", error);
        }
      }
    };
    runMigration();
  }, [user, authLoading, isAdmin, showMessage, handleLoadFromFirestore]);

  // ONE-TIME MIGRATION: Add firestoreUpdatedAt to questions missing it
  const hasFirestoreMigratedRef = useRef(false);
  useEffect(() => {
    const runFirestoreMigration = async () => {
      const migrationKey = "ue5_migration_firestore_updated_at";
      if (localStorage.getItem(migrationKey) === "completed") return;

      if (user && !authLoading && isAdmin && !hasFirestoreMigratedRef.current) {
        hasFirestoreMigratedRef.current = true;
        try {
          console.log(
            "🔄 Running migration: adding firestoreUpdatedAt to questions..."
          );

          const { db } = await import("./services/firebase");
          const { collection, getDocs, doc, updateDoc, Timestamp } =
            await import("firebase/firestore");

          const questionsRef = collection(db, "questions");
          const snapshot = await getDocs(questionsRef);

          let updatedCount = 0;
          const batch = [];

          snapshot.forEach((docSnap) => {
            const question = docSnap.data();

            // Check if firestoreUpdatedAt is missing or null
            if (!question.firestoreUpdatedAt) {
              // Use dateAdded as fallback, or current time if that's also missing
              const fallbackDate = question.dateAdded
                ? new Date(question.dateAdded)
                : new Date();

              batch.push(
                updateDoc(doc(db, "questions", docSnap.id), {
                  firestoreUpdatedAt: Timestamp.fromDate(fallbackDate),
                })
              );
              updatedCount++;
            }
          });

          if (batch.length > 0) {
            await Promise.all(batch);
            console.log(
              `✅ Migration: Added firestoreUpdatedAt to ${updatedCount} of ${snapshot.size} questions`
            );
            showMessage(
              `✅ Fixed ${updatedCount} questions - reloading database...`,
              5000
            );
            setTimeout(() => handleLoadFromFirestore(true), 1000);
          } else {
            console.log(
              `✅ No migration needed: All ${snapshot.size} questions have firestoreUpdatedAt`
            );
          }

          localStorage.setItem(migrationKey, "completed");
        } catch (error) {
          console.error("❌ Firestore migration error:", error);
        }
      }
    };
    runFirestoreMigration();
  }, [user, authLoading, isAdmin, showMessage, handleLoadFromFirestore]);

  // 9. Review Actions (bulk operations)
  const {
    handleClearPending,
    handleBulkAcceptHighScores,
    handleBulkCritiqueAll,
    handleTrimExcess,
    handleAutoTagAll,
  } = useReviewActions({
    uniqueFilteredQuestions,
    allQuestions: unifiedQuestions, // Pass complete dataset for Trim accuracy
    setQuestions,
    handleUpdateStatus,
    handleUpdateQuestion, // Pass persistent handler
    handleCritique,
    showMessage,
  });

  // 10. Database Actions
  const { handleUpdateDatabaseQuestion, handleKickBackToReview } =
    useDatabaseActions({
      setDatabaseQuestions,
      setHistoricalQuestions,
      showMessage,
      handleLoadFromFirestore,
    });

  // 11. Navigation (depends on handleLoadFromFirestore from useExport)
  const { handleModeSelect, handleViewDatabase, handleGoHome } = useNavigation({
    setAppMode,
    setShowExportMenu,
    setShowHistory,
    setFilterMode,
    setCurrentReviewIndex,
    handleLoadFromFirestore,
  });

  // Bulk selection feature removed

  // Keyboard Shortcuts (extracted to useKeyboardShortcuts hook)
  useKeyboardShortcuts({
    appMode,
    isGenerating,
    isTargetMet,
    isApiReady,
    maxBatchSize,
    handleGenerate,
    config,
    handleExportToSheets,
    handleBulkExport,
    setShowBulkExportModal,
    uniqueFilteredQuestionsLength: uniqueFilteredQuestions.length,
    setCurrentReviewIndex,
    isAdmin, // Only admins can use export shortcuts (Ctrl+S, Ctrl+E)
  });

  // App Handlers (extracted to useAppHandlers hook)
  const { handleManualUpdate, handleSelectCategory, handleSaveApiKey } =
    useAppHandlers({
      updateQuestionInState,
      setConfig,
      handleChange,
      setShowApiKeyModal,
    });

  // Memoize viewRouterHandlers to prevent unnecessary re-renders
  const viewRouterHandlers = useMemo(
    () => ({
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
      handleTrimExcess,
      handleUpdateQuestion,
      userRole,
    }),
    [
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
      handleTrimExcess,
      handleUpdateQuestion,
      userRole,
    ]
  );

  // Render - Loading state
  if (authLoading || registrationLoading) {
    return <LoadingSpinner />;
  }

  // Render - Not authenticated
  if (!user) {
    // Check if there's an invite code in URL - show invite signup
    const inviteCode = getInviteFromUrl();
    if (inviteCode) {
      return (
        <InviteSignUp
          onSuccess={(role) => {
            markAsRegistered(role);
          }}
        />
      );
    }
    return <SignIn />;
  }

  // User is authenticated - enforce registration check
  if (!_isRegistered) {
    // If not registered and not on an invite URL, show invite-only message or redirect to sign in
    return (
      <InviteSignUp
        onSuccess={(role) => {
          markAsRegistered(role);
        }}
      />
    );
  }

  if (appMode === "landing") {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <LandingPage
          onSelectMode={handleModeSelect}
          apiKeyStatus={apiKeyStatus}
          isCloudReady={isAuthReady}
          onOpenSettings={() => {
            console.log("🚀 Configure Now clicked!");
            setShowApiKeyModal(true);
          }}
          isAdmin={isAdmin} // Pass admin status
          onStartTutorial={() => handleStartTutorial("welcome")} // Start welcome tour
        />
        {/* API Key Modal for Configure Now button */}
        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={() => setShowApiKeyModal(false)}
          onSave={handleSaveApiKey}
          currentKey={config.apiKey}
        />
      </Suspense>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 font-sans text-slate-200">
      <Suspense fallback={null}>
        {/* Crash Recovery Prompt - highest priority */}
        <CrashRecoveryPrompt
          isOpen={showRecoveryPrompt}
          recoveryData={recoveryData}
          isRecovering={isRecovering}
          onRecover={handleRecover}
          onDismiss={dismissRecovery}
        />
        <GlobalModals
          visibility={{
            showNameModal,
            showClearModal,
            showBulkExportModal,
            showSettings,
            showAnalytics,
            showDangerZone,
            showApiKeyModal,
            showTerms,
            showAgeGate,
            tutorialActive,
            deleteConfirmId,
            showAdvancedConfig,
            showApiKey,
          }}
          state={{
            config,
            isProcessing,
            status,
            translationProgress,
            allQuestionsMap,
            appMode,
            currentStep,
            tutorialSteps,
            activeScenario,
            metrics: {
              totalApproved: approvedCount,
              totalQuestions: questions.length,
            },
            isApiReady,
            customTags,
            isAdmin,
          }}
          handlers={{
            handleNameSave,
            handleDeleteAllQuestions,
            handleBulkExport,
            confirmDelete,
            setDeleteConfirmId,
            onCloseBulkExport: () => setShowBulkExportModal(false),
            onCloseSettings: () => setShowSettings(false),
            onCloseAnalytics: () => setShowAnalytics(false),
            onCloseDangerZone: () => setShowDangerZone(false),
            onCloseApiKey: () => setShowApiKeyModal(false),
            handleChange,
            handleSaveApiKey,
            setShowTerms,
            setTermsAccepted,
            setShowAgeGate,
            setShowClearModal,
            handleTutorialNext,
            handleTutorialPrev,
            handleTutorialSkip,
            handleTutorialComplete,
            onResetSettings: () =>
              setConfig({ ...config, ...useAppConfig.defaultConfig }),
            onHardReset: () => {
              localStorage.clear();
              window.location.reload();
            },
            fileInputRef,
            handleFileChange,
            setShowAdvancedConfig,
            setShowApiKey,
            handleDetectTopics,
            onSaveCustomTags: handleSaveCustomTags,
            window: window,
          }}
        />
      </Suspense>

      <Header
        apiKeyStatus={apiKeyStatus}
        isCloudReady={isAuthReady}
        onHome={handleGoHome}
        creatorName={config.creatorName}
        appMode={appMode}
        tokenUsage={tokenUsage}
        onRestartTutorial={handleRestartTutorial}
        onStartTutorial={handleStartTutorial}
        isAdmin={isAdmin}
        user={user}
      />

      <Suspense fallback={<LoadingSpinner />}>
        <MainLayout
          appMode={appMode}
          setAppMode={setAppMode}
          effectiveApiKey={effectiveApiKey}
          isAdmin={isAdmin}
          sidebarProps={{
            showGenSettings,
            setShowGenSettings,
            config,
            handleChange,
            allQuestionsMap,
            approvedCounts,
            overallPercentage,
            totalApproved,
            isTargetMet,
            maxBatchSize,
            batchSizeWarning,
            handleGenerate,
            isGenerating,
            isApiReady,
            handleBulkTranslateMissing,
            isProcessing,
            setShowSettings,
            handleSelectCategory,
            customTags,
            status,
            showMessage,
            isAdmin,
          }}
          handleModeSelect={handleModeSelect}
          handleViewDatabase={handleViewDatabase}
          pendingCount={totalPendingQuestions} // Show pending questions needing review
          toolbarProps={{
            mode: appMode,
            counts: contextCounts,
            filterMode,
            setFilterMode,
            filterByCreator,
            setFilterByCreator,
            filterTags,
            setFilterTags,
            filterScoreTier,
            setFilterScoreTier,
            customTags,
            searchTerm,
            setSearchTerm,
            sortBy,
            setSortBy,
            isProcessing,
            status,
            isAuthReady,
            config,
            onLoadSheets: handleLoadFromSheets,
            onLoadFirestore: handleLoadFromFirestore,
            onBulkExport: () => setShowBulkExportModal(true),
            onClearPending: handleClearPending,
            onBulkAcceptHighScores:
              appMode === "review" ? handleBulkAcceptHighScores : undefined,
            onBulkCritiqueAll:
              appMode === "review" ? handleBulkCritiqueAll : undefined,
            onTrimExcess: handleTrimExcess,
            onAutoTagAll: handleAutoTagAll, // Added
            effectiveApiKey: effectiveApiKey,
            handleChange, // Pass config handler for Discipline selector
          }}
          showHistory={showHistory}
          uniqueFilteredQuestions={uniqueFilteredQuestions}
          questions={questions}
          status={status}
          databaseQuestions={databaseQuestions}
          config={config}
          isProcessing={isProcessing}
          allQuestionsMap={allQuestionsMap}
          viewRouterHandlers={viewRouterHandlers}
          viewRouterState={{
            currentReviewIndex,
            translationMap,
            filterByCreator,
            filteredQuestions,
            questions,
            status,
            filterMode,
            sortBy,
            searchTerm,
            showHistory,
            currentUser: user,
            userRole, // Add role for component restrictions
          }}
          viewRouterSetters={{
            setDatabaseQuestions,
            setCurrentReviewIndex,
            setFilterByCreator,
            showMessage,
          }}
          handleGoHome={handleGoHome}
          onStartTutorial={handleStartTutorial}
        />
      </Suspense>

      {/* API Key Modal - Simple popup for Configure Now button */}

      {/* Footer */}
      <Footer />

      {/* TOAST NOTIFICATIONS */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* CONCURRENT EDITING CONFLICT MODAL */}
      {showConflictModal && conflictData && (
        <ConflictModal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
          conflictData={conflictData}
          onResolve={async (action) => {
            if (action === "DISCARD") {
              // Reload the latest version from server
              const { loadAgent } = await import("./agents").then((m) =>
                m.getAgents()
              );
              if (loadAgent) {
                const result = await loadAgent.loadQuestion(
                  conflictData.serverQuestion.id
                );
                if (result.success) {
                  handleUpdateQuestion(result.question.id, result.question);
                  showMessage("✓ Reloaded latest version", 2000);
                }
              }
            } else if (action === "OVERWRITE") {
              // Force save local changes
              const { saveGuardAgent } = await import("./agents").then((m) =>
                m.getAgents()
              );
              if (saveGuardAgent) {
                await saveGuardAgent.saveQuestion(
                  conflictData.serverQuestion.id,
                  conflictData.localChanges,
                  conflictData.serverVersion, // Use server version to force overwrite
                  user?.uid || "unknown",
                  user?.email || "unknown@example.com"
                );
                showMessage("✓ Overwrote server changes", 2000);
              }
            }
            setShowConflictModal(false);
          }}
        />
      )}

      {/* TUTORIAL OVERLAY */}

      {/* COMPLIANCE MODALS */}
    </div>
  );
};

export default App;
// Force rebuild
