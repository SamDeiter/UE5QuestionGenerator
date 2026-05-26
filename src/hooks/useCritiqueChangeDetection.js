import { useCallback, useEffect, useRef } from "react";
import { APP_MODES } from "../utils/constants";

/**
 * useCritiqueChangeDetection — detects when a question's critique
 * arrives or gets re-run during a session and triggers the auto-open
 * of the improvement modal. Owns three refs that previously lived in
 * QuestionItem:
 *
 *   - lastProcessedRef: marks the most recent action (dismissed/applied)
 *     so we don't re-open the modal for the same critique
 *   - lastSeenCritiqueScoreRef + lastSeenAttemptsRef: tracks the values
 *     seen on the previous render so we can detect a real change rather
 *     than just the initial mount
 *   - hasInitializedRef: skips the first render entirely
 *
 * The effect fires the supplied `onShouldOpenModal` callback only when
 * a critique CHANGE is observed mid-session AND no dismissed/applied
 * marker is set for the current question.
 */
export const useCritiqueChangeDetection = ({
  q,
  appMode,
  onShouldOpenModal,
}) => {
  const lastProcessedRef = useRef(null);
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

    // Detect if critique was just updated.
    // Check score change OR attempts count increase (for re-critiques with same score)
    const currentAttempts = q.critiqueAttempts || 0;
    const attemptsChanged = currentAttempts > lastSeenAttemptsRef.current;

    const critiqueJustUpdated =
      attemptsChanged ||
      (q.critiqueScore !== undefined &&
        q.critiqueScore !== lastSeenCritiqueScoreRef.current);

    if (critiqueJustUpdated) {
      // Reset the "dismissed" flag to allow modal to show again
      lastProcessedRef.current = null;
      lastSeenAttemptsRef.current = currentAttempts;
      lastSeenCritiqueScoreRef.current = q.critiqueScore;

      // TRIGGER: Only auto-open if critique actually arrived/updated AND
      // we have a suggestion that hasn't been dismissed/applied yet.
      if (
        appMode === APP_MODES.REVIEW &&
        q.critique &&
        !q.improvementsApplied &&
        !lastProcessedRef.current?.startsWith(`dismissed-${q.id}`) &&
        !lastProcessedRef.current?.startsWith(`applied-${q.id}`)
      ) {
        onShouldOpenModal?.();
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
    onShouldOpenModal,
  ]);

  // Lets the parent suppress the next score-change re-open by pre-emptively
  // syncing the "last seen" cursor to a value it's about to flush through
  // an onUpdateQuestion call. Used when applying an AI rewrite so the
  // improvement modal doesn't re-open against the just-applied score.
  const markSeen = useCallback(({ critiqueScore, critiqueAttempts }) => {
    if (critiqueScore !== undefined) {
      lastSeenCritiqueScoreRef.current = critiqueScore;
    }
    if (critiqueAttempts !== undefined) {
      lastSeenAttemptsRef.current = critiqueAttempts;
    }
  }, []);

  return { lastProcessedRef, markSeen };
};
