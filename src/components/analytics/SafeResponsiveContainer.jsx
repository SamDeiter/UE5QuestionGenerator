import { useState, useRef, useLayoutEffect, useCallback } from "react";
import { ResponsiveContainer } from "recharts";

/**
 * SafeResponsiveContainer - Wrapper that prevents recharts dimension warnings
 * Measures container dimensions first, then passes explicit pixel values to ResponsiveContainer
 * This eliminates the width(-1)/height(-1) warnings by ensuring valid dimensions always exist
 */
const SafeResponsiveContainer = ({ children, minDimension = 10, ...props }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const timeoutsRef = useRef([]);

  const checkDimensions = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth >= minDimension && clientHeight >= minDimension) {
        // Only update if dimensions actually changed to prevent re-renders
        setDimensions((prev) => {
          if (prev.width !== clientWidth || prev.height !== clientHeight) {
            return { width: clientWidth, height: clientHeight };
          }
          return prev;
        });
      }
    }
  }, [minDimension]);

  useLayoutEffect(() => {
    // Clear any existing timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    // Check immediately
    checkDimensions();

    // Multiple delayed checks to handle various layout settling scenarios
    const delays = [50, 150, 300];
    delays.forEach((delay) => {
      const timeoutId = setTimeout(checkDimensions, delay);
      timeoutsRef.current.push(timeoutId);
    });

    // Use ResizeObserver for dynamic updates
    const observer = new ResizeObserver(() => {
      // Debounced check after resize
      const resizeTimeout = setTimeout(checkDimensions, 50);
      timeoutsRef.current.push(resizeTimeout);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      observer.disconnect();
    };
  }, [checkDimensions]);

  const isReady =
    dimensions.width >= minDimension && dimensions.height >= minDimension;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {isReady ? (
        <ResponsiveContainer
          {...props}
          width={dimensions.width}
          height={dimensions.height}
        >
          {children}
        </ResponsiveContainer>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-pulse text-slate-600 text-xs">
            Loading chart...
          </div>
        </div>
      )}
    </div>
  );
};

export default SafeResponsiveContainer;
