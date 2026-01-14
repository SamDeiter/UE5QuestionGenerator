import { useState, useEffect, useRef } from "react";
import Icon from "./Icon";
import { throttle, trapFocus } from "../utils/tutorial/domHelpers";
import { logTutorialEvent, TUTORIAL_EVENTS } from "../utils/tutorialAnalytics";
import { TUTORIAL } from "../utils/constants";

const TutorialOverlay = ({
  steps,
  currentStepIndex,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  activeScenario,
}) => {
  const [targetRect, setTargetRect] = useState(null);
  const [elementNotFound, setElementNotFound] = useState(false);
  const overlayRef = useRef(null);
  const step = steps[currentStepIndex];

  // Element detection and positioning
  useEffect(() => {
    let pollInterval;
    let resizeObserver;
    let attemptCount = 0;
    const MAX_ATTEMPTS = TUTORIAL.MAX_ATTEMPT_COUNT || 20;

    setElementNotFound(false);

    const updatePosition = () => {
      // If no target specified, center the tooltip (this is intentional)
      if (!step.target) {
        setTargetRect(null);
        setElementNotFound(false);
        return;
      }

      const element = document.querySelector(step.target);
      if (element) {
        // Verify element has dimensions (is visible)
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          attemptCount++;
          if (attemptCount >= MAX_ATTEMPTS) {
            setElementNotFound(true);
            if (pollInterval) clearInterval(pollInterval);

            // Log element not found
            logTutorialEvent(TUTORIAL_EVENTS.ELEMENT_NOT_FOUND, {
              scenarioId: activeScenario,
              stepId: step.id,
              target: step.target,
            });
          }
          return;
        }

        // Element found and visible - stop polling, clear error state
        setElementNotFound(false);
        if (pollInterval) clearInterval(pollInterval);

        // Calculate position with padding for highlight
        setTargetRect({
          top: rect.top - 10,
          left: rect.left - 10,
          width: rect.width + 20,
          height: rect.height + 20,
        });

        // Observe element for resize/movement (throttled)
        if (!resizeObserver) {
          const throttledUpdate = throttle(updatePosition, 100);
          resizeObserver = new ResizeObserver(throttledUpdate);
          resizeObserver.observe(element);
        }
      } else {
        attemptCount++;

        if (attemptCount >= MAX_ATTEMPTS) {
          setElementNotFound(true);
          setTargetRect(null);
          if (pollInterval) clearInterval(pollInterval);

          // Log element not found
          logTutorialEvent(TUTORIAL_EVENTS.ELEMENT_NOT_FOUND, {
            scenarioId: activeScenario,
            stepId: step.id,
            target: step.target,
          });
        } else {
          setTargetRect(null);
        }
      }
    };

    // Initial check
    updatePosition();

    // Scroll into view ONCE when step changes
    const element = document.querySelector(step.target);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (step.target) {
      // Poll for element existence (handles conditionally rendered elements)
      pollInterval = setInterval(updatePosition, 100);

      // Try scrolling again after a delay if found
      setTimeout(() => {
        const el = document.querySelector(step.target);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    }

    // Throttled event listeners
    const throttledUpdate = throttle(
      updatePosition,
      TUTORIAL.RESIZE_THROTTLE || 100
    );
    window.addEventListener("resize", throttledUpdate);
    window.addEventListener("scroll", throttledUpdate, true);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", throttledUpdate);
      window.removeEventListener("scroll", throttledUpdate, true);
    };
  }, [currentStepIndex, step.target, step.id, activeScenario]);

  const isLastStep = currentStepIndex === steps.length - 1;

  // Focus trapping
  useEffect(() => {
    if (!overlayRef.current) return;

    const cleanup = trapFocus(overlayRef.current);
    return cleanup;
  }, [currentStepIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Escape") onSkip();
      if (e.key === "ArrowRight" && !isLastStep) onNext();
      if (e.key === "ArrowLeft" && currentStepIndex > 0) onPrev();
    };
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [onSkip, onNext, onPrev, currentStepIndex, isLastStep]);

  const handleSkipStep = () => {
    logTutorialEvent(TUTORIAL_EVENTS.STEP_SKIPPED, {
      scenarioId: activeScenario,
      stepId: step.id,
      reason: "element_not_found",
    });
    onNext();
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Dimmed Background with Cutout */}
      {targetRect ? (
        <div
          className="absolute inset-0 bg-black/70"
          style={{
            clipPath: `polygon(
                        0% 0%, 
                        0% 100%, 
                        100% 100%, 
                        100% 0%, 
                        0% 0%, 
                        ${targetRect.left}px ${targetRect.top}px, 
                        ${targetRect.left + targetRect.width}px ${
              targetRect.top
            }px, 
                        ${targetRect.left + targetRect.width}px ${
              targetRect.top + targetRect.height
            }px, 
                        ${targetRect.left}px ${
              targetRect.top + targetRect.height
            }px, 
                        ${targetRect.left}px ${targetRect.top}px
                    )`,
          }}
        ></div>
      ) : (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      )}

      {/* Highlight Border */}
      {targetRect && (
        <div
          className="absolute border-2 border-indigo-500 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.5)] pointer-events-none"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      {/* Tooltip Card - always centered using flex wrapper */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[10000]">
        <div
          ref={overlayRef}
          role="dialog"
          aria-labelledby="tutorial-title"
          aria-describedby="tutorial-content"
          aria-live="polite"
          aria-modal="true"
          className="w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col gap-4 transition-all duration-300 ease-in-out animate-in zoom-in-95 pointer-events-auto"
        >
          <div className="flex justify-between items-start">
            <h3 id="tutorial-title" className="text-lg font-bold text-white">
              {step.title}
            </h3>
            <button
              onClick={onSkip}
              className="text-slate-500 hover:text-slate-300"
              aria-label="Close tutorial"
            >
              <Icon name="x" size={20} />
            </button>
          </div>

          {/* Parse content for **highlighted** keywords and ![images](url) */}
          <div
            id="tutorial-content"
            className="text-slate-300 text-sm leading-relaxed space-y-2"
          >
            {step.content.split("\n").map((line, lineIdx) => {
              if (!line.trim()) return <div key={lineIdx} className="h-2" />;

              // Robust Image Parsing
              const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
              const lineParts = [];
              let lastIndex = 0;
              let match;

              while ((match = imgRegex.exec(line)) !== null) {
                // Push text before image
                if (match.index > lastIndex) {
                  lineParts.push({
                    type: "text",
                    content: line.substring(lastIndex, match.index),
                  });
                }

                // Push image
                const src = match[2];
                // Ensure BASE_URL ends with / and src doesn't start with / to avoid //
                const base = import.meta.env.BASE_URL || "/";
                const cleanBase = base.endsWith("/") ? base : `${base}/`;
                const cleanSrc = src.startsWith("/") ? src.substring(1) : src;
                const processedSrc = src.startsWith("http")
                  ? src
                  : `${cleanBase}${cleanSrc}`;

                lineParts.push({
                  type: "image",
                  alt: match[1],
                  src: processedSrc,
                });
                lastIndex = match.index + match[0].length;
              }

              // Push remaining text
              if (lastIndex < line.length) {
                lineParts.push({
                  type: "text",
                  content: line.substring(lastIndex),
                });
              }

              return (
                <div key={lineIdx} className="flex flex-col gap-2">
                  {lineParts.map((part, partIdx) => {
                    if (part.type === "image") {
                      return (
                        <img
                          key={partIdx}
                          src={part.src}
                          alt={part.alt}
                          className="w-full rounded-lg border border-slate-700 mt-1 shadow-md"
                        />
                      );
                    }

                    // Parse text for bold markers
                    return (
                      <p key={partIdx}>
                        {part.content
                          .split(/(\*\*[^*]+\*\*)/)
                          .map((subPart, subIdx) => {
                            if (
                              subPart.startsWith("**") &&
                              subPart.endsWith("**")
                            ) {
                              return (
                                <span
                                  key={subIdx}
                                  className="text-orange-400 font-semibold"
                                >
                                  {subPart.slice(2, -2)}
                                </span>
                              );
                            }
                            return subPart;
                          })}
                      </p>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Warning when element cannot be found */}
          {elementNotFound && step.target && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-900/30 border border-amber-700/50 rounded-lg text-amber-300 text-xs">
                <Icon name="alert-triangle" size={14} />
                <span>
                  Element not visible in current view. Try scrolling or skip to
                  continue.
                </span>
              </div>
              <button
                onClick={handleSkipStep}
                className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
                aria-label="Skip this step"
              >
                Skip This Step
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <div
                className="flex gap-1"
                role="progressbar"
                aria-valuenow={currentStepIndex + 1}
                aria-valuemin="1"
                aria-valuemax={steps.length}
              >
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full ${
                      idx === currentStepIndex
                        ? "bg-indigo-500"
                        : "bg-slate-700"
                    }`}
                    aria-label={`Step ${idx + 1}${
                      idx === currentStepIndex ? " (current)" : ""
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-500 ml-1" aria-live="polite">
                {currentStepIndex + 1} / {steps.length}
              </span>
            </div>

            <div className="flex gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={onPrev}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                  aria-label="Previous step"
                >
                  Back
                </button>
              )}
              <button
                onClick={onSkip}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-colors"
                aria-label="Skip all tutorial steps"
              >
                Skip All
              </button>
              <button
                onClick={isLastStep ? onComplete : onNext}
                className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-900/50 transition-all flex items-center gap-2"
                aria-label={isLastStep ? "Finish tutorial" : "Next step"}
              >
                {isLastStep ? "Finish" : "Next"}{" "}
                <Icon name="arrow-right" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
