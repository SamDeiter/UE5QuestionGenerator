import React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import ReviewProgressBar from "./ReviewProgressBar";
import QuestionHeader from "./QuestionItem/QuestionHeader";
import QuestionContent from "./QuestionItem/QuestionContent";
import QuestionMetadata from "./QuestionItem/QuestionMetadata";
import LanguageControls from "./QuestionItem/LanguageControls";
import QuestionActions from "./QuestionItem/QuestionActions";
import CritiqueSection from "./QuestionItem/CritiqueSection";
import ValidationWarnings from "./QuestionItem/ValidationWarnings";
import ExplanationDisplay from "./QuestionItem/ExplanationDisplay";
import SourceContextCard from "./QuestionItem/SourceContextCard";
import ImprovementModal from "./ImprovementModal";
import Icon from "./Icon";
import QuestionNotesField from "./QuestionItem/QuestionNotesField";
import { getSecureItem } from "../utils/secureStorage";
import { useEditLock } from "../hooks/useEditLock";
import { useAuth } from "../hooks/useAuth";

const QuestionItem = ({
  q,
  onUpdateStatus,
  onExplain,
  onVariate,
  onCritique,
  onApplyRewrite,
  onTranslateSingle,
  onSwitchLanguage,
  onDelete,
  onUpdateQuestion,
  onKickBack,
  availableLanguages,
  isProcessing,
  appMode,
  showMessage,
  isAdmin = false,
  userRole, // NEW
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(q.question);
  const [showImprovementModal, setShowImprovementModal] = useState(false);
  const lastProcessedCritiqueRef = useRef(null);

  // Get current user info for lock management
  const { user } = useAuth();
  const userId = user?.uid;
  const userEmail = user?.email;

  // Memoize lock expired callback to prevent heartbeat effect restarts
  const handleLockExpired = useCallback(() => {
    showMessage?.("⚠️ Your review lock expired.", 5000);
  }, [showMessage]);

  // Auto-lock on view (review mode) - prevents concurrent reviews
  const {
    lockStatus: _lockStatus,
    lockedBy,
    isLocked,
    hasLock,
    isAcquiring: _isAcquiring, // Unused but kept for potential future use
  } = useEditLock(
    q.id,
    userId,
    userEmail,
    appMode === "review", // Auto-acquire locks to prevent concurrent reviews
    handleLockExpired,
    isProcessing // Ensure no lock release during active save
  );

  // Auto-open modal when NEW critique data arrives
  useEffect(() => {
    console.log("[QuestionItem DEBUG] useEffect triggered:", {
      critiqueScore: q.critiqueScore,
      suggestedRewrite: !!q.suggestedRewrite,
      improvementsApplied: q.improvementsApplied,
      questionId: q.id,
      alreadyShowing: showImprovementModal,
    });

    // Skip if improvements were already applied (prevents re-opening after apply)
    if (q.improvementsApplied) {
      console.log(
        "[QuestionItem DEBUG] Skipping - improvements already applied"
      );
      return;
    }

    // Only open if we have a new critique score that we haven't processed
    if (q.critiqueScore !== undefined && q.critiqueScore !== null) {
      const critiqueKey = `${q.id}-${q.critiqueScore}`;
      const dismissedKey = `dismissed-${critiqueKey}`;

      // Skip if we've already processed this exact critique
      if (lastProcessedCritiqueRef.current === critiqueKey) {
        console.log(
          "[QuestionItem DEBUG] Skipping - already processed this critique"
        );
        return;
      }

      // Skip if user dismissed this specific critique
      if (lastProcessedCritiqueRef.current === dismissedKey) {
        console.log(
          "[QuestionItem DEBUG] Skipping - user dismissed this critique"
        );
        return;
      }

      console.log(
        "[QuestionItem DEBUG] Opening modal for score:",
        q.critiqueScore
      );
      lastProcessedCritiqueRef.current = critiqueKey;
      setShowImprovementModal(true);
    }
  }, [
    q.critiqueScore,
    q.critique, // ADDED: Trigger on new critique text
    q.suggestedRewrite,
    q.id,
    q.improvementsApplied,
    // showImprovementModal intentionally omitted - we only open on NEW data
  ]);

  // Reset ref when modal is closed so we can show the same critique again if needed
  const handleModalDismiss = useCallback(() => {
    // Mark as dismissed - use a simple unique marker
    const critiqueKey = `${q.id}-${q.critiqueScore}`;
    lastProcessedCritiqueRef.current = `dismissed-${critiqueKey}`;
    setShowImprovementModal(false);
  }, [q.id, q.critiqueScore]);

  const getStatusStyle = (status) => {
    switch (status) {
      case "accepted":
        return "ring-1 ring-green-500/50";
      case "rejected":
        return "border-red-900/50 bg-slate-950/80 opacity-50 grayscale";
      default:
        return "";
    }
  };

  const getGradient = (d) => {
    const difficulty = d?.toLowerCase();
    switch (difficulty) {
      case "easy":
      case "beginner":
        return "bg-gradient-to-br from-slate-900/50 to-green-950 border-green-700 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]";
      case "medium":
      case "intermediate":
        return "bg-gradient-to-br from-slate-900/50 to-yellow-950 border-yellow-700 shadow-[0_0_15px_-5px_rgba(234,179,8,0.3)]";
      case "hard":
      case "expert":
        return "bg-gradient-to-br from-slate-900/50 to-red-950 border-red-700 shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]";
      default:
        return "bg-slate-900 border-slate-800";
    }
  };

  const getDiffBadgeColor = (d) => {
    switch (d?.toLowerCase()) {
      case "easy":
        return "bg-green-950 text-green-400 border-green-900";
      case "medium":
        return "bg-yellow-950 text-amber-300 border-yellow-900";
      case "hard":
        return "bg-red-950 text-red-400 border-red-900";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div
      className={`group rounded-lg border shadow-sm transition-all p-4 relative ${getGradient(
        q.difficulty
      )} ${getStatusStyle(q.status)}`}
    >
      {/* Lock Status Banner - Only show if locked by ANOTHER user */}
      {isLocked && appMode === "review" && (
        <div className="mb-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 flex items-center gap-3">
          <Icon name="lock" size={20} className="text-yellow-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-300">
              Currently being reviewed by{" "}
              {lockedBy?.userEmail || "another user"}
            </p>
            <p className="text-xs text-yellow-400/80">
              You can view this question but cannot take action until they
              finish.
            </p>
          </div>
        </div>
      )}

      {/* Active Lock Indicator - Always visible in review mode, color shows status */}
      {appMode === "review" && (
        <div
          className={`ml-6 mb-2 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all duration-500 ${
            hasLock && !isLocked
              ? "bg-green-900/30 border border-green-500/50 text-green-400"
              : isLocked
              ? "bg-red-900/30 border border-red-500/50 text-red-400"
              : "bg-amber-900/30 border border-amber-500/50 text-amber-400"
          }`}
          title={
            hasLock
              ? "You have the review lock - others cannot modify this question"
              : isLocked
              ? `Locked by ${lockedBy?.email || "another user"}`
              : "Acquiring lock..."
          }
        >
          <Icon
            name={hasLock ? "lock" : isLocked ? "lock" : "loader"}
            size={14}
            className={
              hasLock
                ? "text-green-400"
                : isLocked
                ? "text-red-400"
                : "text-amber-400 animate-spin"
            }
          />
          <span>
            {hasLock ? "Reviewing" : isLocked ? "Locked" : "Connecting..."}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2 mb-3 pl-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <QuestionHeader
              q={q}
              getDiffBadgeColor={getDiffBadgeColor}
              onKickBack={onKickBack}
              appMode={appMode}
              onOpenCritiqueModal={() => setShowImprovementModal(true)}
            />
          </div>

          <div className="flex items-center gap-2">
            <QuestionActions
              q={q}
              isLocked={isLocked}
              lockedBy={lockedBy}
              onUpdateStatus={onUpdateStatus}
              onCritique={onCritique}
              onExplain={onExplain}
              onVariate={onVariate}
              onDelete={onDelete}
              onUpdateQuestion={onUpdateQuestion}
              isProcessing={isProcessing}
              appMode={appMode}
              showMessage={showMessage}
            />
          </div>
        </div>

        {/* Review Progress Bar - Only in Review Mode */}
        {appMode === "review" && (
          <ReviewProgressBar
            question={q}
            isLocked={isLocked}
            lockedBy={lockedBy}
            onCritique={() => onCritique?.(q)}
            onFix={() => onApplyRewrite && onApplyRewrite(q)}
            onVerify={() => {
              const config = getSecureItem("ue5_gen_config");
              const reviewerName = config?.creatorName || "Unknown";

              onUpdateQuestion(q.id, {
                ...q,
                humanVerified: true,
                humanVerifiedAt: new Date().toISOString(),
                humanVerifiedBy: reviewerName,
              });

              if (showMessage)
                showMessage(
                  "✓ Source verified! Click Accept to approve.",
                  2000
                );
            }}
            onAccept={() => {
              if (!q.humanVerified) {
                if (showMessage) showMessage("⚠️ Please verify first", 3000);
                return;
              }
              onUpdateStatus(q.id, "accepted");
            }}
            isProcessing={isProcessing}
          />
        )}

        <LanguageControls
          q={q}
          availableLanguages={availableLanguages}
          isLocked={isLocked}
          lockedBy={lockedBy}
          onSwitchLanguage={onSwitchLanguage}
          onTranslateSingle={onTranslateSingle}
          isProcessing={isProcessing}
          userRole={userRole} // NEW
        />
      </div>

      <ValidationWarnings q={q} />

      <div className="pl-6">
        <QuestionContent
          q={q}
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

        <ExplanationDisplay explanation={q.explanation} />

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
    return prevProps[key] === nextProps[key];
  });
};

export default React.memo(QuestionItem, arePropsEqual);
