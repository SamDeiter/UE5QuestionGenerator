import { useState, useRef, useLayoutEffect, useCallback } from "react";
import { ResponsiveContainer } from "recharts";

/**
 * SafeResponsiveContainer - Wrapper that prevents recharts dimension warnings
 * Only renders the chart once the container has valid dimensions (>= 10px)
 * Uses multiple delayed checks to handle layout settling
 */
const SafeResponsiveContainer = ({ children, minDimension = 10, ...props }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const timeoutsRef = useRef([]);

  const checkDimensions = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth >= minDimension && clientHeight >= minDimension) {
        setDimensions({ width: clientWidth, height: clientHeight });
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
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={0}
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
