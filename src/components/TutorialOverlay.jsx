import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';

const TutorialOverlay = ({ steps, currentStepIndex, onNext, onPrev, onSkip, onComplete }) => {
    const [targetRect, setTargetRect] = useState(null);
    const step = steps[currentStepIndex];

    useEffect(() => {
        const updatePosition = () => {
            if (!step.target) {
                setTargetRect(null);
                return;
            }

            const element = document.querySelector(step.target);
            if (element) {
                const rect = element.getBoundingClientRect();
                // Add some padding and account for scroll position
                setTargetRect({
                    top: rect.top + window.scrollY - 10,
                    left: rect.left + window.scrollX - 10,
                    width: rect.width + 20,
                    height: rect.height + 20,
                    viewportTop: rect.top - 10,
                    viewportLeft: rect.left - 10
                });

                // Scroll into view if needed
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                // If target not found, just center it (fallback)
                setTargetRect(null);
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);

        // Small delay to allow DOM to settle
        const timer = setTimeout(updatePosition, 100);

        return () => {
            window.removeEventListener('resize', updatePosition);
            clearTimeout(timer);
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

        if (!targetRect) {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            };
        }

        // Use viewport coordinates for positioning
        let top = targetRect.viewportTop || targetRect.top;
        let left = targetRect.viewportLeft || targetRect.left;

        // Calculate available space in each direction using viewport coordinates
        const viewportLeft = targetRect.viewportLeft || targetRect.left;
        const viewportTop = targetRect.viewportTop || targetRect.top;
        const spaceRight = viewportWidth - (viewportLeft + targetRect.width);
        const spaceLeft = viewportLeft;
        const spaceBottom = viewportHeight - (viewportTop + targetRect.height);
        const spaceTop = viewportTop;

        // Choose position based on preferred direction and available space
        let finalPosition = step.position;

        // Override position if there's not enough space
        if (step.position === 'right' && spaceRight < tooltipWidth + padding) {
            if (spaceLeft >= tooltipWidth + padding) {
                finalPosition = 'left';
            } else if (spaceBottom >= tooltipHeight + padding) {
                finalPosition = 'bottom';
            } else if (spaceTop >= tooltipHeight + padding) {
                finalPosition = 'top';
            } else {
                finalPosition = 'center';
            }
        } else if (step.position === 'left' && spaceLeft < tooltipWidth + padding) {
            if (spaceRight >= tooltipWidth + padding) {
                finalPosition = 'right';
            } else {
                finalPosition = 'center';
            }
        } else if (step.position === 'top' && spaceTop < tooltipHeight + padding) {
            finalPosition = 'bottom';
        } else if (step.position === 'bottom' && spaceBottom < tooltipHeight + padding) {
            finalPosition = 'top';
        }

        // Apply positioning based on final decision (using viewport coordinates)
        const vLeft = targetRect.viewportLeft || targetRect.left;
        const vTop = targetRect.viewportTop || targetRect.top;

        switch (finalPosition) {
            case 'right':
                left = vLeft + targetRect.width + padding;
                top = vTop;
                break;
            case 'left':
                left = vLeft - tooltipWidth - padding;
                top = vTop;
                break;
            case 'bottom':
                top = vTop + targetRect.height + padding;
                left = vLeft;
                break;
            case 'top':
                top = vTop - tooltipHeight - padding;
                left = vLeft;
                break;
            case 'center':
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
            left
        };
    };

    return (
        <div className="fixed inset-0 z-[9999] overflow-hidden">
            {/* Dimmed Background with Cutout */}
            {targetRect ? (
                <div className="absolute inset-0 bg-black/70 transition-all duration-300 ease-in-out" style={{
                    clipPath: `polygon(
                        0% 0%, 
                        0% 100%, 
                        100% 100%, 
                        100% 0%, 
                        0% 0%, 
                        ${targetRect.viewportLeft || targetRect.left}px ${targetRect.viewportTop || targetRect.top}px, 
                        ${(targetRect.viewportLeft || targetRect.left) + targetRect.width}px ${targetRect.viewportTop || targetRect.top}px, 
                        ${(targetRect.viewportLeft || targetRect.left) + targetRect.width}px ${(targetRect.viewportTop || targetRect.top) + targetRect.height}px, 
                        ${targetRect.viewportLeft || targetRect.left}px ${(targetRect.viewportTop || targetRect.top) + targetRect.height}px, 
                        ${targetRect.viewportLeft || targetRect.left}px ${targetRect.viewportTop || targetRect.top}px
                    )`
                }}></div>
            ) : (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
            )}

            {/* Highlight Border */}
            {targetRect && (
                <div
                    className="absolute border-2 border-indigo-500 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-300 ease-in-out pointer-events-none"
                    style={{
                        top: targetRect.viewportTop || targetRect.top,
                        left: targetRect.viewportLeft || targetRect.left,
                        width: targetRect.width,
                        height: targetRect.height
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
                    <button onClick={onSkip} className="text-slate-500 hover:text-slate-300">
                        <Icon name="x" size={20} />
                    </button>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed">
                    {step.content}
                </p>

                <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-800">
                    <div className="flex gap-1">
                        {steps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-2 h-2 rounded-full ${idx === currentStepIndex ? 'bg-indigo-500' : 'bg-slate-700'}`}
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
                            {isLastStep ? 'Finish' : 'Next'} <Icon name="arrow-right" size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TutorialOverlay;
