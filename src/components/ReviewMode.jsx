import React, { useEffect, useMemo } from "react";
import Icon from "./Icon";
import QuestionItem from "./QuestionItem";
import { useQuestionDetailHydration } from "../hooks/useQuestionDetailHydration";

const ReviewMode = ({
  questions,
  currentIndex,
  setCurrentIndex,
  onUpdateStatus,
  onExplain,
  onVariate,
  onCritique,
  onApplyRewrite,
  onTranslateSingle,
  onSwitchLanguage,
  onDelete,
  onUpdateQuestion,
  translationMap,
  isProcessing,
  onStartTutorial,
  onKickBack, // For restoring rejected questions
  userRole, // NEW
  allQuestionsMap,
  onRequestMore, // Tier 2: pull the next paginated page (cold-load first paint)
  hasMore = false, // Tier 2: whether more paginated pages exist
}) => {
  // Auto-start tutorial if not completed (and compliance modals are done)
  useEffect(() => {
    const isCompleted = localStorage.getItem("ue5_tutorial_review_completed");
    const ageVerified = localStorage.getItem("ue5_age_verified");
    const termsAccepted = localStorage.getItem("ue5_terms_accepted");

    // Only start tutorial if compliance modals are complete
    if (
      !isCompleted &&
      onStartTutorial &&
      questions.length > 0 &&
      ageVerified &&
      termsAccepted
    ) {
      // Small delay to ensure view is rendered
      setTimeout(() => onStartTutorial("review"), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create effective questions list - just use the passed questions
  // The pin is just for preventing auto-advance, not for modifying the list
  const effectiveQuestions = questions;

  // Simple bounds check - only adjust if we're out of bounds
  useEffect(() => {
    if (
      effectiveQuestions &&
      effectiveQuestions.length > 0 &&
      currentIndex >= effectiveQuestions.length
    ) {
      setCurrentIndex(effectiveQuestions.length - 1);
    }
  }, [effectiveQuestions, currentIndex, setCurrentIndex]);

  // Tier 2: when navigating near the end of a paginated first-paint slice,
  // pull the next page so the user never hits a premature wall before the
  // full in-memory list takes over.
  useEffect(() => {
    if (
      hasMore &&
      onRequestMore &&
      effectiveQuestions.length > 0 &&
      currentIndex >= effectiveQuestions.length - 3
    ) {
      onRequestMore();
    }
  }, [hasMore, onRequestMore, currentIndex, effectiveQuestions.length]);

  // Compute the current question + its language variants up here (before any
  // early return) so the detail-hydration hook below obeys the rules of hooks.
  const currentQuestion = effectiveQuestions?.[currentIndex];
  const variants = useMemo(
    () => Array.from(allQuestionsMap.get(currentQuestion?.uniqueId) || []),
    [allQuestionsMap, currentQuestion?.uniqueId]
  );

  // Tier 3b: when reading from the compact index, lazily fill the 5 detail-only
  // fields for the focused card AND its variant tabs (so a translation tab gets
  // its own per-language source text). No-op when USE_INDEX is false.
  const hydrationTargets = useMemo(
    () => (currentQuestion ? [currentQuestion, ...variants] : variants),
    [currentQuestion, variants]
  );
  useQuestionDetailHydration(hydrationTargets, onUpdateQuestion);

  if (!effectiveQuestions || effectiveQuestions.length === 0) return null;

  if (!currentQuestion) {
    return (
      <div className="text-center p-10 text-slate-500">
        No question selected.
      </div>
    );
  }
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < effectiveQuestions.length - 1;

  // Handle navigation
  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      Math.min(prev + 1, effectiveQuestions.length - 1)
    );
  };

  return (
    <div className="flex flex-col items-center justify-start h-full max-w-4xl mx-auto w-full pt-4">
      <div
        className="w-full mb-6 flex justify-between items-center text-slate-400 text-xs font-mono bg-slate-900/50 p-2 rounded-lg border border-slate-800"
        data-tour="review-nav"
      >
        <button
          onClick={handlePrev}
          disabled={!canGoPrev}
          className="flex items-center gap-2 px-4 py-2 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-bold"
          data-tour="prev-button"
        >
          <Icon name="arrow-left" size={16} /> PREV
        </button>
        <div className="flex flex-col items-center">
          <span className="text-slate-500 uppercase text-[10px] tracking-widest">
            Review Progress
          </span>
          <span className="text-lg">
            <span className="text-white font-bold">{currentIndex + 1}</span>{" "}
            <span className="text-slate-600">/</span>{" "}
            <span className="text-slate-400 font-bold">
              {effectiveQuestions.length}
            </span>
          </span>
        </div>
        <button
          onClick={handleNext}
          disabled={!canGoNext}
          className="flex items-center gap-2 px-4 py-2 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-bold"
          data-tour="next-button"
        >
          NEXT <Icon name="arrow-right" size={16} />
        </button>
      </div>

      <div
        className="w-full transform transition-all duration-300"
        data-tour="review-card"
      >
        <QuestionItem
          key={currentQuestion.uniqueId}
          q={currentQuestion}
          onUpdateStatus={onUpdateStatus}
          onExplain={onExplain}
          onVariate={onVariate}
          onCritique={onCritique}
          onApplyRewrite={onApplyRewrite}
          onTranslateSingle={onTranslateSingle}
          onSwitchLanguage={onSwitchLanguage}
          onDelete={onDelete}
          onUpdateQuestion={onUpdateQuestion}
          availableVariants={variants}
          isProcessing={isProcessing}
          appMode="review"
          onKickBack={onKickBack}
          userRole={userRole}
          isAdmin={userRole === "admin"}
        />
      </div>
    </div>
  );
};

export default ReviewMode;
