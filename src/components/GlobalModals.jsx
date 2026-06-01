import React, { Suspense, lazy } from "react";
import NameEntryModal from "./NameEntryModal";
import ClearConfirmationModal from "./ClearConfirmationModal";
import BlockingProcessModal from "./BlockingProcessModal";
import ApiKeyModal from "./ApiKeyModal";
import TermsOfUseModal from "./TermsOfUseModal";
import CookieConsentBanner from "./CookieConsentBanner";
import AgeGateModal from "./AgeGateModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { useModals } from "../contexts/ModalContext";

// Lazy-loaded modals. These previously contributed ~132 KB gzip to the
// initial authenticated bundle even though their render is gated on an
// `isOpen` flag — `AnalyticsModal` pulls in the entire `view-analytics`
// chunk (recharts + d3, ~106 KB gzip), and `BulkExportModal` transitively
// pulls in jszip via the SCORM exporter (~26 KB gzip). Splitting them
// behind React.lazy + Suspense delays the fetch until the user actually
// triggers the relevant flow. `DangerZoneModal` and `TutorialOverlay`
// follow the same pattern for consistency, even though their individual
// savings are smaller.
const BulkExportModal = lazy(() => import("./BulkExportModal"));
const AnalyticsModal = lazy(() => import("./AnalyticsModal"));
const DangerZoneModal = lazy(() => import("./DangerZoneModal"));
const TutorialOverlay = lazy(() => import("./TutorialOverlay"));

const GlobalModals = ({ visibility, state, handlers }) => {
  // Modal visibility comes from ModalContext now; `visibility` covers the
  // few flags still owned elsewhere (showClearModal lives in
  // useQuestionManager, tutorialActive lives in useTutorial,
  // deleteConfirmId lives in useQuestionManager).
  const { showClearModal, tutorialActive, deleteConfirmId } = visibility;

  const {
    showNameModal,
    showBulkExportModal,
    showAnalytics,
    showDangerZone,
    showApiKeyModal,
    showTerms,
    showAgeGate,
    setShowTerms,
    setShowAgeGate,
    setTermsAccepted,
  } = useModals();

  const {
    config,
    isProcessing,
    status,
    translationProgress,
    allQuestionsMap,
    currentStep,
    tutorialSteps,
    activeScenario,

    isAdmin, // passed for SettingsModal
  } = state;

  const {
    handleNameSave,
    handleDeleteAllQuestions,
    handleBulkExport,
    confirmDelete,
    setDeleteConfirmId,
    onCloseBulkExport,
    onCloseAnalytics,
    onCloseDangerZone,
    onCloseApiKey,
    handleSaveApiKey,
    handleTutorialNext,
    handleTutorialPrev,
    handleTutorialSkip,
    handleTutorialComplete,
    onHardReset,
    window, // needed for reloads/redirects?
  } = handlers;

  return (
    <>
      {/* Blocking Process - Highest Priority */}
      {isProcessing && (
        <BlockingProcessModal
          isProcessing={isProcessing}
          status={status}
          translationProgress={translationProgress}
        />
      )}

      {/* Critical Entry/Exit Modals */}
      {config.creatorName === "" && showNameModal && (
        <NameEntryModal onSave={handleNameSave} />
      )}

      {showClearModal && (
        <ClearConfirmationModal
          onConfirm={handleDeleteAllQuestions}
          onCancel={() => handlers.setShowClearModal(false)}
        />
      )}

      <DeleteConfirmationModal
        deleteConfirmId={deleteConfirmId}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={onCloseApiKey}
        onSave={handleSaveApiKey}
        currentKey={config.apiKey}
      />

      <AgeGateModal
        isOpen={showAgeGate}
        onConfirm={() => {
          setShowAgeGate(false);
          setShowTerms(true);
        }}
        onExit={() => {
          window.location.href = "about:blank";
        }}
      />

      <TermsOfUseModal
        isOpen={showTerms}
        onAccept={() => {
          localStorage.setItem("ue5_terms_accepted", "true");
          setShowTerms(false);
          setTermsAccepted(true);
        }}
        onDecline={() => {
          window.location.href = "about:blank";
        }}
      />

      <CookieConsentBanner />

      {/* Lazy Loaded Modals.
          Each is gated on its open flag so React doesn't even mount the
          lazy component — and therefore doesn't fetch its chunk — until
          the user actually triggers the modal. Previously
          AnalyticsModal was rendered unconditionally with isOpen
          controlling visibility, which defeated lazy-loading because the
          chunk was still fetched on first render. */}
      <Suspense fallback={null}>
        {showBulkExportModal && isAdmin && (
          <BulkExportModal
            onClose={onCloseBulkExport}
            onExport={handleBulkExport}
            questionCount={allQuestionsMap?.size || 0}
          />
        )}

        {showAnalytics && (
          <AnalyticsModal isOpen={showAnalytics} onClose={onCloseAnalytics} />
        )}

        {showDangerZone && (
          <DangerZoneModal
            isOpen={showDangerZone}
            onClose={onCloseDangerZone}
            onClearData={handleDeleteAllQuestions}
            onHardReset={onHardReset}
            config={config}
            isAdmin={isAdmin}
          />
        )}

        {/* Tutorial Overlay — inside the same Suspense so its chunk also
            stays out of the initial bundle until first tutorial open. */}
        {tutorialActive && (
          <TutorialOverlay
            steps={tutorialSteps}
            currentStepIndex={currentStep}
            onNext={handleTutorialNext}
            onPrev={handleTutorialPrev}
            onSkip={handleTutorialSkip}
            onComplete={handleTutorialComplete}
            activeScenario={activeScenario}
          />
        )}
      </Suspense>
    </>
  );
};

export default GlobalModals;
