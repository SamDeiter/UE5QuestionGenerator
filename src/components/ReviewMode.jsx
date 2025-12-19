import React, { useEffect } from "react";
import Icon from "./Icon";
import QuestionItem from "./QuestionItem";

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
  showMessage,
  onStartTutorial,
  onKickBack, // For restoring rejected questions
  userRole, // NEW
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
  // Auto-adjust index if out of bounds (e.g. after accepting an item and list shrinks)
  React.useEffect(() => {
    if (questions && questions.length > 0 && currentIndex >= questions.length) {
      setCurrentIndex(questions.length - 1);
    }
  }, [questions, currentIndex, setCurrentIndex]);

  // Create a wrapper that handles navigation after language switch
  // This finds the translated variant by uniqueId and navigates to its index
  const handleLanguageSwitchWithNavigation = React.useCallback(
    (targetLang, uniqueId) => {
      console.log("🔄 [ReviewMode] Language switch with navigation:", {
        targetLang,
        uniqueId,
      });

      // First, call the global language switch to re-filter questions
      onSwitchLanguage(targetLang, uniqueId);

      // Schedule navigation after the re-render with new language filter
      // We use setTimeout to ensure the questions array is updated
      if (uniqueId) {
        setTimeout(() => {
          // Find the question with this uniqueId in the new filtered list
          // Note: questions prop will be updated after re-render, so we need to query the DOM or use a ref
          // For now, we'll trust the filter and just stay at the same position
          // The parent needs to handle the navigation after filter update
          console.log(
            "🔄 [ReviewMode] Navigation scheduled - parent should handle index update via pendingNavigationUniqueId"
          );
        }, 100);
      }
    },
    [onSwitchLanguage]
  );

  if (!questions || questions.length === 0) return null;

  const currentQuestion = questions[currentIndex];

  if (!currentQuestion) {
    return (
      <div className="text-center p-10 text-slate-500">
        No question selected.
      </div>
    );
  }
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < questions.length - 1;

  return (
    <div className="flex flex-col items-center justify-start h-full max-w-4xl mx-auto w-full pt-4">
      <div
        className="w-full mb-6 flex justify-between items-center text-slate-400 text-xs font-mono bg-slate-900/50 p-2 rounded-lg border border-slate-800"
        data-tour="review-nav"
      >
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
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
            <span className="text-slate-400 font-bold">{questions.length}</span>
          </span>
        </div>
        <button
          onClick={() =>
            setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))
          }
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
          onSwitchLanguage={handleLanguageSwitchWithNavigation}
          onDelete={onDelete}
          onUpdateQuestion={onUpdateQuestion}
          availableLanguages={translationMap.get(currentQuestion.uniqueId)}
          isProcessing={isProcessing}
          appMode="review"
          showMessage={showMessage}
          onKickBack={onKickBack}
          userRole={userRole} // NEW
        />
      </div>
    </div>
  );
};

export default ReviewMode;
