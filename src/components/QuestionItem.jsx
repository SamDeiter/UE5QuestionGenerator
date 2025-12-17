import React from "react";
import { useState, useEffect, useRef } from "react";
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
import { getSecureItem } from "../utils/secureStorage";

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
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(q.question);
  const [showImprovementModal, setShowImprovementModal] = useState(false);
  const shownCritiqueRef = useRef(null); // Track which critique we've shown

  // Auto-open modal when critique data arrives (score, feedback, or improvements)
  useEffect(() => {
    console.log("[QuestionItem DEBUG] useEffect triggered:", {
      critiqueScore: q.critiqueScore,
      suggestedRewrite: !!q.suggestedRewrite,
      questionId: q.id,
    });
    if (q.critiqueScore !== undefined && q.critiqueScore !== null) {
      // Only open if we haven't shown this critique yet
      const critiqueKey = `${q.id}-${q.critiqueScore}`;
      if (shownCritiqueRef.current !== critiqueKey) {
        console.log(
          "[QuestionItem DEBUG] Opening modal for score:",
          q.critiqueScore
        );
        shownCritiqueRef.current = critiqueKey;
        setShowImprovementModal(true);
      }
    }
  }, [q.critiqueScore, q.suggestedRewrite, q.id]);

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
    switch (d?.toLowerCase()) {
      case "easy":
        return "bg-gradient-to-br from-slate-900/50 to-green-950 border-green-700 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]";
      case "medium":
        return "bg-gradient-to-br from-slate-900/50 to-yellow-950 border-yellow-700 shadow-[0_0_15px_-5px_rgba(234,179,8,0.3)]";
      case "hard":
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
          onSwitchLanguage={onSwitchLanguage}
          onTranslateSingle={onTranslateSingle}
          isProcessing={isProcessing}
          appMode={appMode}
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
              // Apply improvements to question - use improved score or fall back to original
              const newScore =
                q.improvedScore || improved?.critiqueScore || q.critiqueScore;
              await onUpdateQuestion(q.id, {
                question: improved?.question || q.question,
                options: improved?.options || q.options,
                optionA: improved?.optionA || q.optionA,
                optionB: improved?.optionB || q.optionB,
                optionC: improved?.optionC || q.optionC,
                optionD: improved?.optionD || q.optionD,
                tags: improved?.tags || q.tags,
                critiqueScore: newScore,
                suggestedRewrite: null, // Clear suggestion after apply
                improvedScore: null, // Clear after applying
              });
              setShowImprovementModal(false);
              if (showMessage) {
                showMessage(
                  "✅ Improvement applied! Now verify and accept.",
                  3000
                );
              }
            }}
            onDismiss={() => setShowImprovementModal(false)}
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
