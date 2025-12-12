import { useState, useEffect } from "react";
import Icon from "./Icon";

const TutorialOverlay = ({
  steps,
  currentStepIndex,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}) => {
  const [targetRect, setTargetRect] = useState(null);
  const [elementNotFound, setElementNotFound] = useState(false);
  const [_searchAttempts, setSearchAttempts] = useState(0);
  const step = steps[currentStepIndex];

  useEffect(() => {
    let pollInterval;
    let resizeObserver;
    let attemptCount = 0;
    const MAX_ATTEMPTS = 20; // Stop polling after 2 seconds (20 * 100ms)

    setElementNotFound(false);
    setSearchAttempts(0);

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
          setSearchAttempts(attemptCount);
          if (attemptCount >= MAX_ATTEMPTS) {
            setElementNotFound(true);
            if (pollInterval) clearInterval(pollInterval);
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

        // Observe element for resize/movement
        if (!resizeObserver) {
          resizeObserver = new ResizeObserver(updatePosition);
          resizeObserver.observe(element);
        }
      } else {
        attemptCount++;
        setSearchAttempts(attemptCount);

        if (attemptCount >= MAX_ATTEMPTS) {
          setElementNotFound(true);
          setTargetRect(null);
          if (pollInterval) clearInterval(pollInterval);
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
      element.scrollIntoView({ behavior: "auto", block: "center" });
    } else if (step.target) {
      // Poll for element existence (handles conditionally rendered elements)
      pollInterval = setInterval(updatePosition, 100);

      // Try scrolling again after a delay if found
      setTimeout(() => {
        const el = document.querySelector(step.target);
        if (el) el.scrollIntoView({ behavior: "auto", block: "center" });
      }, 500);
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [currentStepIndex, step.target]);

  const isLastStep = currentStepIndex === steps.length - 1;

  // Calculate tooltip position with boundary checking
  const getTooltipStyle = () => {
    const tooltipWidth = 320;
    const tooltipHeight = 300; // Approximate
    const padding = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Always center if position is "center" or no target
    if (!targetRect || step.position === "center") {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    // Account for the 10px padding added to targetRect for highlight
    // Get actual element position by removing the padding offset
    const actualTop = targetRect.top + 10;
    const actualLeft = targetRect.left + 10;
    const actualWidth = targetRect.width - 20;
    const actualHeight = targetRect.height - 20;

    // Calculate available space in each direction
    const spaceRight = viewportWidth - (actualLeft + actualWidth);
    const spaceLeft = actualLeft;
    const spaceBottom = viewportHeight - (actualTop + actualHeight);
    const spaceTop = actualTop;

    // Choose position based on preferred direction and available space
    let finalPosition = step.position;

    // Override position if there's not enough space
    if (step.position === "right" && spaceRight < tooltipWidth + padding) {
      if (spaceLeft >= tooltipWidth + padding) {
        finalPosition = "left";
      } else if (spaceBottom >= tooltipHeight + padding) {
        finalPosition = "bottom";
      } else if (spaceTop >= tooltipHeight + padding) {
        finalPosition = "top";
      } else {
        finalPosition = "center";
      }
    } else if (step.position === "left" && spaceLeft < tooltipWidth + padding) {
      if (spaceRight >= tooltipWidth + padding) {
        finalPosition = "right";
      } else {
        finalPosition = "center";
      }
    } else if (step.position === "top" && spaceTop < tooltipHeight + padding) {
      finalPosition = "bottom";
    } else if (
      step.position === "bottom" &&
      spaceBottom < tooltipHeight + padding
    ) {
      finalPosition = "top";
    }

    // Calculate final position
    let top, left;

    switch (finalPosition) {
      case "right":
        left = actualLeft + actualWidth + padding;
        // Center vertically relative to element
        top = actualTop + actualHeight / 2 - tooltipHeight / 2;
        break;
      case "left":
        left = actualLeft - tooltipWidth - padding;
        // Center vertically relative to element
        top = actualTop + actualHeight / 2 - tooltipHeight / 2;
        break;
      case "bottom":
        top = actualTop + actualHeight + padding;
        // Center horizontally relative to element
        left = actualLeft + actualWidth / 2 - tooltipWidth / 2;
        break;
      case "top":
        top = actualTop - tooltipHeight - padding;
        // Center horizontally relative to element
        left = actualLeft + actualWidth / 2 - tooltipWidth / 2;
        break;
      case "center":
      default:
        left = (viewportWidth - tooltipWidth) / 2;
        top = (viewportHeight - tooltipHeight) / 2;
        break;
    }

    // Final boundary constraints - ensure tooltip stays on screen
    if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }
    if (top + tooltipHeight > viewportHeight - padding) {
      top = viewportHeight - tooltipHeight - padding;
    }
    if (top < padding) {
      top = padding;
    }

    return {
      top,
      left,
    };
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

      {/* Tooltip Card */}
      <div
        className="absolute w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col gap-4 transition-all duration-300 ease-in-out animate-in zoom-in-95"
        style={getTooltipStyle()}
      >
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold text-white">{step.title}</h3>
          <button
            onClick={onSkip}
            className="text-slate-500 hover:text-slate-300"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Parse content for **highlighted** keywords */}
        <p className="text-slate-300 text-sm leading-relaxed">
          {step.content.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <span key={i} className="text-orange-400 font-semibold">
                  {part.slice(2, -2)}
                </span>
              );
            }
            return part;
          })}
        </p>

        {/* Warning when element cannot be found */}
        {elementNotFound && step.target && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-900/30 border border-amber-700/50 rounded-lg text-amber-300 text-xs">
            <Icon name="alert-triangle" size={14} />
            <span>
              Element not visible in current view. Try scrolling or skip to
              continue.
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-800">
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  idx === currentStepIndex ? "bg-indigo-500" : "bg-slate-700"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={onPrev}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={isLastStep ? onComplete : onNext}
              className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-900/50 transition-all flex items-center gap-2"
            >
              {isLastStep ? "Finish" : "Next"}{" "}
              <Icon name="arrow-right" size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
