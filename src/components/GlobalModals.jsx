import React from 'react';
import NameEntryModal from './NameEntryModal';
import ClearConfirmationModal from './ClearConfirmationModal';
import BlockingProcessModal from './BlockingProcessModal';
import ApiKeyModal from './ApiKeyModal';
import TermsOfUseModal from './TermsOfUseModal';
import CookieConsentBanner from './CookieConsentBanner';
import AgeGateModal from './AgeGateModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import TutorialOverlay from './TutorialOverlay';
import SettingsModal from './SettingsModal';
import BulkExportModal from './BulkExportModal';
import AnalyticsDashboard from './AnalyticsDashboard';
import DangerZoneModal from './DangerZoneModal';
import { Suspense } from 'react';



// Standard Modals
// Lazy Modals
// Standard Modals
// Lazy Modals

const GlobalModals = ({
    visibility,
    state,
    handlers
}) => {
    const {
        showNameModal, showClearModal, showBulkExportModal,
        showSettings, showAnalytics, showDangerZone,
        showApiKeyModal, showTerms, showAgeGate,
        tutorialActive, deleteConfirmId
    } = visibility;

    const {
        config, isProcessing, status, translationProgress,
        allQuestionsMap, currentStep, tutorialSteps,
        metrics, // passed for Analytics/DangerZone
        isAdmin // passed for SettingsModal
    } = state;

    const {
        handleNameSave, handleDeleteAllQuestions, handleBulkExport,
        confirmDelete, setDeleteConfirmId, onCloseBulkExport,
        onCloseSettings, onCloseAnalytics, onCloseDangerZone, onCloseApiKey,
        handleChange, handleSaveApiKey, setShowTerms, setTermsAccepted, setShowAgeGate,
        handleTutorialNext, handleTutorialPrev, handleTutorialSkip, handleTutorialComplete,
        onHardReset, window // needed for reloads/redirects?
    } = handlers;

    return (
        <>
            {/* Blocking Process - Highest Priority */}
            {isProcessing && <BlockingProcessModal isProcessing={isProcessing} status={status} translationProgress={translationProgress} />}

            {/* Critical Entry/Exit Modals */}
            {config.creatorName === '' && showNameModal && <NameEntryModal onSave={handleNameSave} />}

            {showClearModal && <ClearConfirmationModal onConfirm={handleDeleteAllQuestions} onCancel={() => handlers.setShowClearModal(false)} />}

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
                    window.location.href = 'about:blank';
                }}
            />

            <TermsOfUseModal
                isOpen={showTerms}
                onAccept={() => {
                    localStorage.setItem('ue5_terms_accepted', 'true');
                    setShowTerms(false);
                    setTermsAccepted(true);
                }}
                onDecline={() => {
                    window.location.href = 'about:blank';
                }}
            />

            <CookieConsentBanner />

            {/* Lazy Loaded Modals */}
            <Suspense fallback={null}>
                {showBulkExportModal && (
                    <BulkExportModal
                        onClose={onCloseBulkExport}
                        onExport={handleBulkExport}
                        questionCount={allQuestionsMap?.size || 0}
                    />
                )}

                {showSettings && (
                    <SettingsModal
                        showSettings={showSettings}
                        setShowSettings={onCloseSettings}
                        config={config}
                        handleChange={handleChange}
                        showApiKey={visibility.showApiKey || false}
                        setShowApiKey={handlers.setShowApiKey || (() => { })}
                        files={handlers.files}
                        handleDetectTopics={handlers.handleDetectTopics}
                        isDetecting={handlers.isDetecting}
                        fileInputRef={handlers.fileInputRef}
                        handleFileChange={handlers.handleFileChange}
                        removeFile={handlers.removeFile}
                        isApiReady={state.isApiReady}
                        customTags={state.customTags}
                        onSaveCustomTags={handlers.onSaveCustomTags}
                        isAdmin={isAdmin}
                    />
                )}

                <AnalyticsDashboard
                    isOpen={showAnalytics}
                    onClose={onCloseAnalytics}
                />

                {showDangerZone && (
                    <DangerZoneModal
                        isOpen={showDangerZone}
                        onClose={onCloseDangerZone}
                        onDeleteAll={handleDeleteAllQuestions}
                        onHardReset={onHardReset}
                        metrics={metrics}
                    />
                )}
            </Suspense>

            {/* Tutorial Overlay */}
            {tutorialActive && (
                <TutorialOverlay
                    steps={tutorialSteps}
                    currentStepIndex={currentStep}
                    onNext={handleTutorialNext}
                    onPrev={handleTutorialPrev}
                    onSkip={handleTutorialSkip}
                    onComplete={handleTutorialComplete}
                />
            )}
        </>
    );
};

export default GlobalModals;
