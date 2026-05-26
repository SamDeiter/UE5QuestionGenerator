import React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  APP_MODES,
  QUESTION_STATUS,
  TOAST_DURATION,
  QUALITY_THRESHOLDS,
} from "../utils/constants";
import Icon from "./Icon";
import ReviewProgressBar from "./ReviewProgressBar";

import QuestionContent from "./QuestionItem/QuestionContent";
import QuestionMetadata from "./QuestionItem/QuestionMetadata";
import LanguageControls from "./QuestionItem/LanguageControls";

import CritiqueSection from "./QuestionItem/CritiqueSection";
import QuestionActions from "./QuestionItem/QuestionActions";
import ValidationWarnings from "./QuestionItem/ValidationWarnings";
import ExplanationDisplay from "./QuestionItem/ExplanationDisplay";
import SourceContextCard from "./QuestionItem/SourceContextCard";
import NeedsResearchBadge, {
  NeedsResearchButton,
} from "./QuestionItem/NeedsResearchBadge";
import ImprovementModal from "./ImprovementModal";
import VerifyConfirmModal from "./VerifyConfirmModal";
import VersionComparisonModal from "./VersionComparisonModal";

import QuestionNotesField from "./QuestionItem/QuestionNotesField";
import QuestionHeader from "./QuestionItem/QuestionHeader";

import { logger } from "../utils/logger";
import { useAuth } from "../hooks/useAuth";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { useMessage } from "../contexts/MessageContext";
import { useEditLock } from "../hooks/useEditLock";
import {
  getLockColor,
  getLockTooltip,
  getLockIcon,
  getLockLabel,
  getStatusStyle,
  getDifficultyGradient,
  buildVerifyDocsData,
  buildVerifySearchData,
  buildRejectVerificationData,
  buildFlagUnverifiedData,
} from "../utils/questionItemHelpers";

import { saveTrainingPair } from "../services/trainingDataService";

// Stage 2.1: Using extracted helpers from questionItemHelpers.js
const QuestionItem = ({
  q,
  appMode,
  onUpdateStatus,
  onExplain,
  _onVariate,
  onCritique,
  onApplyRewrite,
  onTranslateSingle,
  onSwitchLanguage,
  onDelete,
  onUpdateQuestion,
  onKickBack, // NEW: Handler for kicking question back to review
  onRevertToOriginal, // NEW: Handler for reverting to original version
  onUseAIRewrite, // NEW: Handler for re-applying AI rewrite
  availableVariants,
  isProcessing,
  userRole,
  isAdmin,
}) => {
  const { showMessage } = useMessage();
  const { user } = useAuth();
  const { colorblindMode } = useAccessibility();
  const cb = colorblindMode;
  const userId = user?.uid;
  const userEmail = user?.email;

  const handleLockExpired = useCallback(() => {
    showMessage("⚠️ Edit lock expired - refreshing...", TOAST_DURATION.LONG);
  }, [showMessage]);

  // Auto-lock on view (review mode)
  const { lockedBy, isLocked, hasLock } = useEditLock(
    q.id,
    userId,
    userEmail,
    appMode === APP_MODES.REVIEW,
    handleLockExpired,
    isProcessing
  );

  // Local state for editing and UI
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [showImprovementModal, setShowImprovementModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(null); // null or "docs" or "search"
  const [showVersionModal, setShowVersionModal] = useState(false); // Version comparison modal
  const lastProcessedCritiqueRef = useRef(null);

  // Display question (supports language variants)
  const displayQuestion = q;

  // Helper function for language switching
  const handleLocalLanguageSwitch = useCallback(
    (langCode, force, newVariant) => {
      if (onSwitchLanguage) {
        // Pass all arguments up. If force is missing, we pass q.uniqueId for legacy global handlers
        onSwitchLanguage(langCode, force === true, newVariant);
      }
    },
    [onSwitchLanguage]
  );

  // Helper function for modal dismissal
  const handleModalDismiss = useCallback(() => {
    lastProcessedCritiqueRef.current = `dismissed-${q.id}-${Date.now()}`;
    setShowImprovementModal(false);
  }, [q.id]);

  // Lock helpers: Using imported functions from questionItemHelpers.js
  // - getLockColor, getLockTooltip, getLockIcon, getLockLabel

  // Auto-open improvement modal when critique arrives or updates
  // Track the last seen critiqueScore/attempts to detect re-critiques DURING THIS SESSION
  const lastSeenCritiqueScoreRef = useRef(q.critiqueScore);
  const lastSeenAttemptsRef = useRef(q.critiqueAttempts || 0);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Skip the initial render - we only want to detect CHANGES during the session
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      lastSeenCritiqueScoreRef.current = q.critiqueScore;
      lastSeenAttemptsRef.current = q.critiqueAttempts || 0;
      return;
    }

    // Detect if critique was just updated
    // Check score change OR attempts count increase (for re-critiques with same score)
    const currentAttempts = q.critiqueAttempts || 0;
    const attemptsChanged = currentAttempts > lastSeenAttemptsRef.current;

    const critiqueJustUpdated =
      attemptsChanged ||
      (q.critiqueScore !== undefined &&
        q.critiqueScore !== lastSeenCritiqueScoreRef.current);

    // If updated, reset the "dismissed" flag to allow modal to show again
    if (critiqueJustUpdated) {
      lastProcessedCritiqueRef.current = null;
      lastSeenAttemptsRef.current = currentAttempts;
      lastSeenCritiqueScoreRef.current = q.critiqueScore;

      // TRIGGER: Only auto-open if the critique actually just arrived/updated
      // OR if we have a suggestion that hasn't been handled yet
      if (
        appMode === APP_MODES.REVIEW &&
        q.critique &&
        !q.improvementsApplied &&
        !lastProcessedCritiqueRef.current?.startsWith(`dismissed-${q.id}`) &&
        !lastProcessedCritiqueRef.current?.startsWith(`applied-${q.id}`)
      ) {
        setShowImprovementModal(true);
      }
    }
  }, [
    appMode,
    q.critique,
    q.suggestedRewrite,
    q.id,
    q.improvementsApplied,
    q.critiqueScore,
    q.critiqueAttempts,
  ]);

  const handleOpenDocs = useCallback(() => {
    // Just shows the verify modal - docs will be opened inside the modal
    setShowVerifyModal(true);
  }, []);

  const handleOpenSearch = useCallback(() => {
    // Just shows the verify modal - search will be opened inside the modal
    setShowVerifyModal(true);
  }, []);

  // Verification handlers using extracted data builders
  const handleVerifyViaDocs = useCallback(
    (clickInfo = {}) => {
      if (!onUpdateQuestion) return;
      onUpdateQuestion(q.id, buildVerifyDocsData(userEmail, clickInfo));
      showMessage?.("✅ Verified via Epic Docs!", TOAST_DURATION.MEDIUM);
    },
    [q.id, onUpdateQuestion, userEmail, showMessage]
  );

  const handleVerifyViaSearch = useCallback(
    (clickInfo = {}) => {
      if (!onUpdateQuestion) return;
      onUpdateQuestion(q.id, buildVerifySearchData(userEmail, clickInfo));
      showMessage?.("✅ Verified via Google Search!", TOAST_DURATION.MEDIUM);
    },
    [q.id, onUpdateQuestion, userEmail, showMessage]
  );

  const handleRejectVerification = useCallback(
    (reasonId, clickInfo = {}) => {
      if (!onUpdateQuestion) return;
      onUpdateQuestion(
        q.id,
        buildRejectVerificationData(userEmail, reasonId, clickInfo)
      );
      onUpdateStatus?.(q.id, QUESTION_STATUS.REJECTED, reasonId);
      showMessage?.(
        "❌ Question rejected - source not verified",
        TOAST_DURATION.LONG
      );
    },
    [q.id, onUpdateQuestion, onUpdateStatus, userEmail, showMessage]
  );

  // Flag as unverified but don't reject - question advances to Accept with warning
  const handleFlagUnverified = useCallback(
    (clickInfo = {}) => {
      if (!onUpdateQuestion) return;
      onUpdateQuestion(q.id, buildFlagUnverifiedData(userEmail, clickInfo));
      showMessage?.(
        "🚩 Flagged - source unverified, ready for Accept/Reject",
        TOAST_DURATION.LONG
      );
    },
    [q.id, onUpdateQuestion, userEmail, showMessage]
  );

  // Handle doc link updates from the DocLinkEditor component (Phase 1)
  const handleDocLinkUpdate = useCallback(
    (updates) => {
      if (!onUpdateQuestion) return;
      // Include the modifiedBy field automatically
      onUpdateQuestion(q.id, {
        ...updates,
        docLinkModifiedBy: userEmail,
      });
    },
    [q.id, onUpdateQuestion, userEmail]
  );

  // Note: Answer/DocLink state now handled in ImprovementModal  // Handle marking a question for research (Phase 4)
  const handleMarkForResearch = useCallback(() => {
    if (!onUpdateQuestion) return;
    const reason = window.prompt(
      "Why does this question need research?\n(e.g., 'Unsure if this API still exists in UE5.4')"
    );
    if (reason === null) return; // User cancelled

    onUpdateQuestion(q.id, {
      needsResearch: true,
      needsResearchReason: reason || "Needs manual verification",
      needsResearchAt: new Date().toISOString(),
      needsResearchBy: userEmail,
    });
    showMessage?.("🔬 Marked for research", TOAST_DURATION.MEDIUM);
  }, [q.id, onUpdateQuestion, userEmail, showMessage]);

  // Handle clearing research flag (Phase 4)
  const handleClearResearch = useCallback(() => {
    if (!onUpdateQuestion) return;
    onUpdateQuestion(q.id, {
      needsResearch: false,
      // Keep the reason/metadata for audit trail
    });
    showMessage?.("✅ Research flag cleared", TOAST_DURATION.MEDIUM);
  }, [q.id, onUpdateQuestion, showMessage]);

  const handleFix = useCallback(() => {
    if (onApplyRewrite) {
      onApplyRewrite(q);
    }
  }, [onApplyRewrite, q]);

  const handleVerifyTranslation = useCallback(() => {
    if (!onUpdateQuestion) return;
    onUpdateQuestion(q.id, {
      translationVerified: true,
      translationVerifiedBy: userEmail,
      translationVerifiedAt: new Date().toISOString(),
    });
    showMessage?.("✅ Translation marked as verified", TOAST_DURATION.MEDIUM);
  }, [q.id, onUpdateQuestion, userEmail, showMessage]);

  const handleClearTranslationVerification = useCallback(() => {
    if (!onUpdateQuestion) return;
    onUpdateQuestion(q.id, {
      translationVerified: false,
      translationVerifiedBy: null,
      translationVerifiedAt: null,
    });
    showMessage?.("Translation verification cleared", TOAST_DURATION.MEDIUM);
  }, [q.id, onUpdateQuestion, showMessage]);

  const handleAccept = useCallback(() => {
    // PIPELINE ENFORCEMENT: Critique is required before accept
    if (q.critiqueScore === null || q.critiqueScore === undefined) {
      if (showMessage)
        showMessage("⚠️ Run AI Critique first", TOAST_DURATION.LONG);
      return;
    }
    if (!q.humanVerified) {
      if (showMessage)
        showMessage("⚠️ Please verify first", TOAST_DURATION.LONG);
      return;
    }

    // NEEDS RESEARCH BLOCK (Phase 4): Cannot accept if flagged for research
    if (q.needsResearch) {
      if (showMessage)
        showMessage(
          "🔬 This question is marked for research. Clear the flag or reject it.",
          TOAST_DURATION.LONG
        );
      return;
    }

    // LOW-SCORE WARNING: Confirm before accepting low-quality questions
    const passThreshold = QUALITY_THRESHOLDS?.PASS || 70;
    if (q.critiqueScore < passThreshold) {
      const confirmed = window.confirm(
        `⚠️ This question scored ${q.critiqueScore}/100 (below ${passThreshold}).\n\nAre you sure you want to accept it anyway?`
      );
      if (!confirmed) return;
    }

    onUpdateStatus(q.id, QUESTION_STATUS.ACCEPTED);
  }, [
    q.critiqueScore,
    q.humanVerified,
    q.needsResearch,
    q.id,
    onUpdateStatus,
    showMessage,
  ]);

  // Style helpers: Using imported functions from questionItemHelpers.js
  // - getStatusStyle, getDifficultyGradient

  return (
    <div
      className={`group rounded-lg border shadow-sm transition-all p-4 relative ${getDifficultyGradient(
        q.difficulty
      )} ${getStatusStyle(q.status)}`}
    >
      {/* Lock Status Banner */}
      {isLocked && appMode === APP_MODES.REVIEW && (
        <div className="mb-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 flex items-center gap-3">
          <Icon name="lock" size={20} className="text-yellow-400" />
          <div>
            <span className="text-yellow-200 font-medium">
              Locked by {lockedBy?.email || "another user"}
            </span>
            <p className="text-xs text-yellow-400/70">
              Wait for them to finish or move to another question.
            </p>
          </div>
        </div>
      )}

      {/* Active Lock Indicator */}
      {appMode === APP_MODES.REVIEW && (
        <div
          className={`ml-6 mb-2 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all duration-500 ${getLockColor(
            hasLock,
            isLocked,
            "container",
            cb
          )}`}
          title={getLockTooltip(hasLock, isLocked, lockedBy?.email)}
        >
          <Icon
            name={getLockIcon(hasLock, isLocked)}
            size={12}
            className={getLockColor(hasLock, isLocked, "icon", cb)}
          />
          <span className={getLockColor(hasLock, isLocked, "icon", cb)}>
            {getLockLabel(hasLock, isLocked)}
          </span>
        </div>
      )}

      {/* Version Source Badge - Shows if question was rewritten */}
      {q.versionSource && q.versionSource !== "original" && (
        <div
          className={`ml-6 mb-2 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-all hover:opacity-80 ${
            q.versionSource === "ai_rewrite"
              ? "bg-purple-900/30 border border-purple-500/50 text-purple-300"
              : "bg-blue-900/30 border border-blue-500/50 text-blue-300"
          }`}
          title={
            q.originalVersion
              ? "Click to compare versions"
              : `Version source: ${q.versionSource}`
          }
          onClick={() => {
            if (q.originalVersion) {
              setShowVersionModal(true);
            }
          }}
        >
          <Icon
            name={q.versionSource === "ai_rewrite" ? "zap" : "edit-3"}
            size={12}
          />
          <span>
            {q.versionSource === "ai_rewrite" ? "AI Rewrite" : "Edited"}
          </span>
          {q.originalVersion && (
            <Icon name="chevron-right" size={10} className="opacity-60" />
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 mb-3 pl-6">
        <QuestionHeader
          q={displayQuestion}
          originalQ={q}
          colorblindMode={cb}
          appMode={appMode}
          onOpenCritiqueModal={() => setShowImprovementModal(true)}
          onUpdateQuestion={onUpdateQuestion}
          onKickBack={onKickBack}
          onCritique={onCritique}
        />

        {/* Language Flags - All authenticated users */}
        <LanguageControls
          q={displayQuestion}
          availableVariants={availableVariants || []}
          onSwitchLanguage={handleLocalLanguageSwitch}
          onTranslateSingle={onTranslateSingle}
          isProcessing={isProcessing}
          userRole={userRole}
          isLocked={isLocked}
          lockedBy={lockedBy}
          appMode={appMode}
        />

        {/* Review Progress Bar */}
        {appMode === APP_MODES.REVIEW && (
          <ReviewProgressBar
            question={q}
            isLocked={isLocked}
            lockedBy={lockedBy}
            onCritique={() => onCritique?.(q)}
            onVerify={handleOpenDocs}
            onAccept={handleAccept}
            onFix={handleFix}
            onVerifyTranslation={handleVerifyTranslation}
            onClearTranslationVerification={handleClearTranslationVerification}
            isProcessing={isProcessing}
          />
        )}

        {/* Validation Warnings - Show before reject button */}
        <ValidationWarnings q={q} />

        {/* Reject Button - Rendered for Review Mode */}
        {appMode === APP_MODES.REVIEW && (
          <div className="mt-3">
            <QuestionActions
              q={q}
              isLocked={isLocked}
              lockedBy={lockedBy}
              onUpdateStatus={onUpdateStatus}
              onDelete={onDelete}
              appMode={appMode}
            />
          </div>
        )}
      </div>

      <div className="pl-6">
        <QuestionContent
          q={displayQuestion}
          isEditing={isEditing}
          editedText={editedText}
          setEditedText={setEditedText}
          setIsEditing={setIsEditing}
          onUpdateQuestion={onUpdateQuestion}
          appMode={appMode}
          isAdmin={isAdmin}
        />

        <SourceContextCard
          sourceUrl={q.sourceUrl || q.SourceURL || q.SourceUrl}
          sourceExcerpt={q.sourceExcerpt}
          isVerified={q.humanVerified}
          verifiedBy={q.humanVerifiedBy}
          verifiedAt={q.humanVerifiedAt}
          onVerifyDocs={handleOpenDocs}
          onVerifySearch={handleOpenSearch}
          canVerify={q.critiqueScore >= (QUALITY_THRESHOLDS?.PASS || 70)}
          // Doc link management props (Phase 1)
          docLinkSource={q.docLinkSource}
          docLinkModifiedBy={q.docLinkModifiedBy}
          docLinkModificationNote={q.docLinkModificationNote}
          originalSourceUrl={q.originalSourceUrl}
          originalSourceExcerpt={q.originalSourceExcerpt}
          onDocLinkUpdate={handleDocLinkUpdate}
          canEdit={appMode === APP_MODES.REVIEW}
        />

        {/* Needs Research Badge - Show if question is flagged (Phase 4) */}
        <NeedsResearchBadge
          needsResearch={q.needsResearch}
          needsResearchReason={q.needsResearchReason}
          needsResearchBy={q.needsResearchBy}
          needsResearchAt={q.needsResearchAt}
          onClearResearch={handleClearResearch}
          canClear={appMode === APP_MODES.REVIEW}
        />

        {/* Mark for Research button (Phase 4) - standalone quick action */}
        {appMode === APP_MODES.REVIEW && (
          <div className="mb-3">
            <NeedsResearchButton
              needsResearch={q.needsResearch}
              onMarkForResearch={handleMarkForResearch}
              disabled={isLocked}
            />
          </div>
        )}

        <CritiqueSection
          q={q}
          appMode={appMode}
          onSwitchLanguage={onSwitchLanguage}
          onApplyRewrite={onApplyRewrite}
          onExplain={onExplain}
          onVerify={handleOpenDocs}
          availableVariants={availableVariants}
          isProcessing={isProcessing}
        />

        <ExplanationDisplay explanation={displayQuestion.explanation} />

        <QuestionMetadata q={q} />

        {/* Internal Notes Field */}
        <QuestionNotesField question={q} onUpdateQuestion={onUpdateQuestion} />

        {/* AI Improvement Modal - Shows critique + improvements (if any) */}
        {showImprovementModal && q.critique && (
          <ImprovementModal
            originalQuestion={q}
            improvedQuestion={
              q.suggestedRewrite
                ? {
                    ...q,
                    question: q.suggestedRewrite.question || q.question,
                    options: q.suggestedRewrite.options || q.options,
                    optionA: q.suggestedRewrite.options?.A || q.options?.A,
                    optionB: q.suggestedRewrite.options?.B || q.options?.B,
                    optionC: q.suggestedRewrite.options?.C || q.options?.C,
                    optionD: q.suggestedRewrite.options?.D || q.options?.D,
                    correct: q.suggestedRewrite.correct || q.correct,
                    correctLetter:
                      q.suggestedRewrite.correct || q.correctLetter,
                    tags: q.suggestedRewrite.tags || q.tags,
                    critiqueScore: q.improvedScore, // AI's estimated score for the improved version
                  }
                : null
            }
            changesExplanation={
              q.suggestedRewrite?.changesExplanation ||
              q.rewriteChanges ||
              "AI improvements applied"
            }
            critiqueText={q.suggestedRewrite?.critiqueText || q.critique || ""}
            critiqueScore={q.critiqueScore || 0} // Original question's score
            improvedScore={
              q.improvedScore || q.suggestedRewrite?.critiqueScore || 0
            } // Score AFTER applying improvements
            isContentLocked={
              q.humanVerified === true &&
              (!q.critiqueScore || q.critiqueScore >= 70)
            } // Lock only high-score verified questions
            lockedByName={q.humanVerifiedBy} // Who verified this question
            onApply={async (improved) => {
              // FIRST: Mark as processed to prevent useEffect from re-opening
              lastProcessedCritiqueRef.current = `applied-${
                q.id
              }-${Date.now()}`;

              // ALSO: Update the score ref to prevent score-change detection
              lastSeenCritiqueScoreRef.current =
                q.improvedScore || q.critiqueScore;

              // IMMEDIATELY close modal to prevent re-open race
              setShowImprovementModal(false);

              // CAPTURE TRAINING DATA: Save original vs. improved for fine-tuning
              if (improved) {
                try {
                  await saveTrainingPair(q, improved, "ai_improvement");
                  logger.log("✅ Training pair saved for question:", q.id);
                } catch (err) {
                  logger.warn("Failed to save training pair:", err);
                }
              }

              // Apply improvements to question - keep critiqueScore for display
              await onUpdateQuestion(q.id, {
                question: improved?.question || q.question,
                options: improved?.options || q.options,
                optionA: improved?.optionA || q.optionA,
                optionB: improved?.optionB || q.optionB,
                optionC: improved?.optionC || q.optionC,
                optionD: improved?.optionD || q.optionD,
                tags: improved?.tags || q.tags,
                // Update score to the improved version immediately
                critiqueScore: q.improvedScore || q.critiqueScore,
                suggestedRewrite: null, // Clear suggestion after apply
                improvedScore: null, // Clear after applying
                improvementsApplied: true, // Mark that improvements were applied (enables Verify, prevents modal re-open)
              });

              // THEN: Close modal after update completes
              setShowImprovementModal(false);
              if (showMessage) {
                showMessage(
                  "✅ Improvement applied! Now verify and accept.",
                  TOAST_DURATION.LONG
                );
              }
            }}
            onDismiss={handleModalDismiss}
          />
        )}

        {/* Source Verification Modal */}
        {showVerifyModal && !q.humanVerified && (
          <VerifyConfirmModal
            sourceUrl={q.sourceUrl || q.SourceURL || q.SourceUrl}
            sourceExcerpt={q.sourceExcerpt}
            onVerifyDocs={(verifyData) => {
              // verifyData now includes { clickedDocs, clickedSearch, answerState, docLinkState }
              handleVerifyViaDocs(verifyData);
              setShowVerifyModal(null);
            }}
            onVerifySearch={(verifyData) => {
              // verifyData now includes { clickedDocs, clickedSearch, answerState, docLinkState }
              handleVerifyViaSearch(verifyData);
              setShowVerifyModal(null);
            }}
            onReject={(reasonId) => {
              handleRejectVerification(reasonId);
              setShowVerifyModal(null);
            }}
            onFlagUnverified={(clickInfo) => {
              handleFlagUnverified(clickInfo);
              setShowVerifyModal(null);
            }}
            onDocLinkUpdate={(updates) => {
              // Save the fixed URL - this allows fixing broken URLs without rejecting
              handleDocLinkUpdate(updates);
            }}
            onDismiss={() => setShowVerifyModal(null)}
          />
        )}

        {/* Version Comparison Modal - Original vs AI Rewrite */}
        {showVersionModal && (q.originalVersion || q.suggestedRewrite) && (
          <VersionComparisonModal
            isOpen={showVersionModal}
            onClose={() => setShowVersionModal(false)}
            originalVersion={q.originalVersion}
            aiRewrite={q.suggestedRewrite}
            _currentQuestion={q}
            versionSource={q.versionSource || "original"}
            onUseOriginal={() => {
              if (onRevertToOriginal) onRevertToOriginal(q);
            }}
            onUseAIRewrite={() => {
              if (onUseAIRewrite) onUseAIRewrite(q);
            }}
          />
        )}
      </div>
    </div>
  );
};

// Custom comparison for memoization that detects critique changes
const arePropsEqual = (prevProps, nextProps) => {
  // Always re-render if critique data changed
  if (prevProps.q?.critiqueScore !== nextProps.q?.critiqueScore) return false;
  if (prevProps.q?.critique !== nextProps.q?.critique) return false;
  if (prevProps.q?.suggestedRewrite !== nextProps.q?.suggestedRewrite)
    return false;
  if (prevProps.q?.status !== nextProps.q?.status) return false;
  if (prevProps.q?.humanVerified !== nextProps.q?.humanVerified) return false;
  if (prevProps.q?.improvementsApplied !== nextProps.q?.improvementsApplied)
    return false;
  if (prevProps.isProcessing !== nextProps.isProcessing) return false;

  // FIX: Always re-render if source content changed (fixes stale clipboard bug)
  if (prevProps.q?.sourceExcerpt !== nextProps.q?.sourceExcerpt) return false;
  if (prevProps.q?.sourceUrl !== nextProps.q?.sourceUrl) return false;

  // Standard shallow comparison for other props
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  if (prevKeys.length !== nextKeys.length) return false;

  return prevKeys.every((key) => {
    if (key === "q") {
      // For 'q' prop, compare by id/uniqueId only (content already checked above)
      return (
        prevProps.q?.id === nextProps.q?.id &&
        prevProps.q?.uniqueId === nextProps.q?.uniqueId
      );
    }
    if (key === "availableVariants") {
      // Compare variants array length for quick check (deep compare omitted for perf)
      return (
        prevProps.availableVariants?.length ===
        nextProps.availableVariants?.length
      );
    }
    return prevProps[key] === nextProps[key];
  });
};

export default React.memo(QuestionItem, arePropsEqual);
