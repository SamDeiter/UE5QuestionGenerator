import React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  APP_MODES,
  QUESTION_STATUS,
  QUESTION_DIFFICULTY,
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
import ImprovementModal from "./ImprovementModal";

import QuestionNotesField from "./QuestionItem/QuestionNotesField";
import QuestionHeader from "./QuestionItem/QuestionHeader";

import { useEditLock } from "../hooks/useEditLock";
import { useAuth } from "../hooks/useAuth";
import { useAccessibility } from "../contexts/AccessibilityContext";

import { saveTrainingPair } from "../services/trainingDataService";
import { logger } from "../utils/logger";
import { logAuditEvent, AUDIT_ACTIONS } from "../services/auditService";

// Helper functions (updated to use constants where appropriate, though display text might differ)
// ...

const QuestionItem = ({
  q,
  appMode,
  onUpdateStatus,
  onExplain,
  onVariate,
  onCritique,
  onApplyRewrite,
  onTranslateSingle,
  onSwitchLanguage,
  onDelete,
  onUpdateQuestion,
  onKickBack, // NEW: Handler for kicking question back to review
  availableVariants,
  isProcessing,
  showMessage,
  userRole,
  isAdmin,
}) => {
  const { user } = useAuth();
  const { colorblindMode } = useAccessibility();
  const cb = colorblindMode;
  const userId = user?.uid;
  const userEmail = user?.email;

  const handleLockExpired = useCallback(() => {
    if (showMessage) showMessage("⚠️ Edit lock expired - refreshing...", 3000);
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
  const lastProcessedCritiqueRef = useRef(null);

  // Display question (supports language variants)
  const displayQuestion = q;

  // Helper function for language switching
  const handleLocalLanguageSwitch = useCallback(
    (langCode) => {
      if (onSwitchLanguage) {
        onSwitchLanguage(q.id, langCode);
      }
    },
    [onSwitchLanguage, q.id]
  );

  // Helper function for modal dismissal
  const handleModalDismiss = useCallback(() => {
    lastProcessedCritiqueRef.current = `dismissed-${q.id}-${Date.now()}`;
    setShowImprovementModal(false);
  }, [q.id]);

  // Lock status color helper - refactored to avoid nested ternaries
  const lockColor = (hasLockArg, isLockedArg, type) => {
    if (hasLockArg) {
      if (type === "container") {
        return cb
          ? "bg-blue-900/30 border border-blue-500/50"
          : "bg-green-900/30 border border-green-500/50";
      }
      return cb ? "text-blue-400" : "text-green-400";
    }
    if (isLockedArg) {
      if (type === "container") {
        return cb
          ? "bg-rose-900/30 border border-rose-500/50"
          : "bg-red-900/30 border border-red-500/50";
      }
      return cb ? "text-rose-400" : "text-red-400";
    }
    if (type === "container") {
      return "bg-slate-800/50 border border-slate-600/50";
    }
    return "text-slate-400";
  };

  // Lock tooltip helper
  const getLockTooltip = (hasLockVal, isLockedVal, lockedByEmail) => {
    if (hasLockVal) return "You have the edit lock";
    if (isLockedVal) return `Locked by ${lockedByEmail || "another user"}`;
    return "Available for editing";
  };

  // Lock icon name helper (avoids nested ternary)
  const getLockIcon = (hasLockVal, isLockedVal) => {
    if (hasLockVal) return "edit-3";
    if (isLockedVal) return "lock";
    return "unlock";
  };

  // Lock label text helper (avoids nested ternary)
  const getLockLabel = (hasLockVal, isLockedVal) => {
    if (hasLockVal) return "Editing";
    if (isLockedVal) return "Locked";
    return "Available";
  };

  // Auto-open improvement modal when critique arrives
  useEffect(() => {
    if (
      q.critique &&
      q.suggestedRewrite &&
      !q.improvementsApplied &&
      lastProcessedCritiqueRef.current !== `dismissed-${q.id}` &&
      !lastProcessedCritiqueRef.current?.startsWith(`applied-${q.id}`)
    ) {
      setShowImprovementModal(true);
    }
  }, [q.critique, q.suggestedRewrite, q.id, q.improvementsApplied]);

  const getStatusStyle = (status) => {
    switch (status) {
      case QUESTION_STATUS.ACCEPTED:
        return "ring-1 ring-green-500/50";
      case QUESTION_STATUS.REJECTED:
        return "border-red-900/50 bg-slate-950/80 opacity-50 grayscale";
      default:
        return "";
    }
  };

  const getGradient = (d) => {
    // Normalize to handle "Easy" vs "Beginner" legacy data
    const difficulty = d?.toLowerCase();
    // We can't strictly switch on keys if data is messy, but let's try to align
    if (
      difficulty === "easy" ||
      difficulty === QUESTION_DIFFICULTY.BEGINNER.toLowerCase()
    ) {
      return "bg-gradient-to-br from-slate-900/50 to-green-950 border-green-700 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]";
    }
    if (
      difficulty === "medium" ||
      difficulty === QUESTION_DIFFICULTY.INTERMEDIATE.toLowerCase()
    ) {
      return "bg-gradient-to-br from-slate-900/50 to-yellow-950 border-yellow-700 shadow-[0_0_15px_-5px_rgba(234,179,8,0.3)]";
    }
    if (
      difficulty === "hard" ||
      difficulty === QUESTION_DIFFICULTY.EXPERT.toLowerCase()
    ) {
      return "bg-gradient-to-br from-slate-900/50 to-red-950 border-red-700 shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]";
    }
    return "bg-slate-900 border-slate-800";
  };

  return (
    <div
      className={`group rounded-lg border shadow-sm transition-all p-4 relative ${getGradient(
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
          className={`ml-6 mb-2 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all duration-500 ${lockColor(
            hasLock,
            isLocked,
            "container"
          )}`}
          title={getLockTooltip(hasLock, isLocked, lockedBy?.email)}
        >
          <Icon
            name={getLockIcon(hasLock, isLocked)}
            size={12}
            className={lockColor(hasLock, isLocked, "icon")}
          />
          <span className={lockColor(hasLock, isLocked, "icon")}>
            {getLockLabel(hasLock, isLocked)}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2 mb-3 pl-6">
        <QuestionHeader
          q={displayQuestion}
          originalQ={q}
          getDiffBadgeColor={(d) => {
            const diff = d?.toLowerCase();
            if (diff === "beginner" || diff === "easy")
              return cb
                ? "bg-blue-950 text-blue-400 border-blue-800"
                : "bg-green-950 text-green-400 border-green-800";
            if (diff === "intermediate" || diff === "medium")
              return "bg-yellow-950 text-yellow-400 border-yellow-800";
            if (diff === "expert" || diff === "hard")
              return cb
                ? "bg-rose-950 text-rose-400 border-rose-800"
                : "bg-red-950 text-red-400 border-red-800";
            return "bg-slate-800 text-slate-400 border-slate-700";
          }}
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
            onFix={() => onApplyRewrite && onApplyRewrite(q)}
            onVerify={async () => {
              if (!onUpdateQuestion) return;
              await onUpdateQuestion(q.id, {
                humanVerified: true,
                humanVerifiedBy: userEmail || "Unknown",
                humanVerifiedAt: new Date().toISOString(),
              });
              // Log to audit trail
              logAuditEvent(
                q.uniqueId || q.id,
                AUDIT_ACTIONS.QUESTION_VERIFIED,
                {
                  oldValue: q.humanVerified,
                  newValue: true,
                  verifiedBy: userEmail,
                }
              );
              if (showMessage) showMessage("✅ Question verified!", 2000);
            }}
            onAccept={() => {
              // PIPELINE ENFORCEMENT: Critique is required before accept
              if (q.critiqueScore === null || q.critiqueScore === undefined) {
                if (showMessage) showMessage("⚠️ Run AI Critique first", 3000);
                return;
              }
              if (!q.humanVerified) {
                if (showMessage) showMessage("⚠️ Please verify first", 3000);
                return;
              }
              onUpdateStatus(q.id, QUESTION_STATUS.ACCEPTED);
            }}
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
              showMessage={showMessage}
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
          showMessage={showMessage}
          appMode={appMode}
          isAdmin={isAdmin}
        />

        <SourceContextCard
          sourceUrl={q.sourceUrl}
          sourceExcerpt={q.sourceExcerpt}
          question={q.question}
        />

        <CritiqueSection
          q={q}
          appMode={appMode}
          isProcessing={isProcessing}
          onApplyRewrite={onApplyRewrite}
          onUpdateQuestion={onUpdateQuestion}
          onUpdateStatus={onUpdateStatus}
          onExplain={onExplain}
          onVariate={onVariate}
          showMessage={showMessage}
        />

        <ExplanationDisplay explanation={displayQuestion.explanation} />

        <QuestionMetadata q={q} />

        {/* Internal Notes Field */}
        <QuestionNotesField
          question={q}
          onUpdateQuestion={onUpdateQuestion}
          showMessage={showMessage}
        />

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
            improvedScore={q.improvedScore || 0} // Score AFTER applying improvements
            onApply={async (improved) => {
              // FIRST: Mark as processed to prevent useEffect from re-opening
              lastProcessedCritiqueRef.current = `applied-${
                q.id
              }-${Date.now()}`;

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
                  3000
                );
              }
            }}
            onDismiss={handleModalDismiss}
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
