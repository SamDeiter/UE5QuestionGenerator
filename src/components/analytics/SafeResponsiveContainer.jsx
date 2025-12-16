import { useState, useRef, useLayoutEffect } from "react";
import { ResponsiveContainer } from "recharts";

/**
 * SafeResponsiveContainer - Wrapper that prevents recharts dimension warnings
 * Only renders the chart once the container has valid dimensions
 */
const SafeResponsiveContainer = ({ children, ...props }) => {
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    const checkDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setIsReady(true);
        }
      }
    };

    // Check immediately
    checkDimensions();

    // Also check after a short delay for layout settling
    const timeoutId = setTimeout(checkDimensions, 100);

    // Use ResizeObserver for dynamic updates
    const observer = new ResizeObserver(checkDimensions);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      {isReady ? (
        <ResponsiveContainer {...props} minWidth={0} minHeight={0}>
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
