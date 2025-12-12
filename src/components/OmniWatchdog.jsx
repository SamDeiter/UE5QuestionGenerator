import { useEffect, useState } from "react";
import { auth } from "./services/firebase";

/**
 * OmniWatchdog - Development-only HUD for runtime compliance monitoring
 *
 * Features:
 * - 🛡️ Security Scanner: Detects exposed API keys in DOM
 * - ⚡ Waterfall Detector: Monitors for sequential fetch calls
 * - 👤 Auth State: Shows current user role
 *
 * @returns {null|JSX.Element} HUD component (dev only)
 */
const OmniWatchdog = () => {
  const [alerts, setAlerts] = useState([]);
  const [waterfallWarnings, setWaterfallWarnings] = useState(0);
  const [userRole, setUserRole] = useState("Anonymous");
  const [lastFetchTime, setLastFetchTime] = useState(null);

  // 🛑 Production Safety: Only run in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  useEffect(() => {
    // 🛡️ Security Scanner: Check for exposed API keys
    const scanForLeaks = () => {
      const bodyHTML = document.body.innerHTML;
      const apiKeyPatterns = [
        /AIza[0-9A-Za-z_-]{35}/g, // Google/Gemini/Firebase
        /sk-[a-zA-Z0-9]{48}/g, // OpenAI
        /AKIA[0-9A-Z]{16}/g, // AWS
        /ghp_[a-zA-Z0-9]{36}/g, // GitHub
        /xox[baprs]-[0-9a-zA-Z-]{10,}/g, // Slack
      ];

      const foundLeaks = [];
      apiKeyPatterns.forEach((pattern, index) => {
        const matches = bodyHTML.match(pattern);
        if (matches) {
          const keyType = ["Google/Gemini", "OpenAI", "AWS", "GitHub", "Slack"][
            index
          ];
          foundLeaks.push({
            type: "SECURITY",
            severity: "CRITICAL",
            message: `🚨 EXPOSED ${keyType} API KEY DETECTED IN DOM!`,
            timestamp: Date.now(),
          });
        }
      });

      if (foundLeaks.length > 0) {
        setAlerts((prev) => [...prev, ...foundLeaks]);
      }
    };

    // Run security scan every 5 seconds
    const securityInterval = setInterval(scanForLeaks, 5000);
    scanForLeaks(); // Initial scan

    // 👤 Auth State Monitor
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // Check if user is admin (you can customize this logic)
        user
          .getIdTokenResult()
          .then((idTokenResult) => {
            const role = idTokenResult.claims.admin ? "Admin" : "User";
            setUserRole(`${role} (${user.email})`);
          })
          .catch(() => {
            setUserRole(`User (${user.email})`);
          });
      } else {
        setUserRole("Anonymous");
      }
    });

    // ⚡ Waterfall Detector: Monkey-patch fetch
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const now = Date.now();

      // Check if this fetch is happening too soon after the last one (< 50ms = likely sequential)
      if (lastFetchTime && now - lastFetchTime < 50) {
        setWaterfallWarnings((prev) => prev + 1);
        setAlerts((prev) => [
          ...prev,
          {
            type: "PERFORMANCE",
            severity: "WARNING",
            message: `🐢 WATERFALL DETECTED: Sequential fetch to ${args[0]}`,
            timestamp: now,
          },
        ]);
      }

      setLastFetchTime(now);
      return originalFetch.apply(this, args);
    };

    // Cleanup
    return () => {
      clearInterval(securityInterval);
      unsubscribe();
      window.fetch = originalFetch; // Restore original fetch
    };
  }, [lastFetchTime]);

  // Auto-dismiss alerts after 10 seconds
  useEffect(() => {
    if (alerts.length > 0) {
      const timer = setTimeout(() => {
        setAlerts((prev) => prev.slice(1));
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [alerts]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        zIndex: 9999,
        fontFamily: "monospace",
        fontSize: "12px",
        pointerEvents: "none",
      }}
    >
      {/* Auth State Badge */}
      <div
        style={{
          background: userRole.includes("Admin") ? "#10b981" : "#3b82f6",
          color: "white",
          padding: "8px 12px",
          borderRadius: "0 0 0 8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        👤 {userRole}
      </div>

      {/* Waterfall Counter */}
      {waterfallWarnings > 0 && (
        <div
          style={{
            background: "#f59e0b",
            color: "white",
            padding: "8px 12px",
            marginTop: "4px",
            borderRadius: "0 0 0 8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          🐢 Waterfalls: {waterfallWarnings}
        </div>
      )}

      {/* Alert Stack */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          right: "20px",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxWidth: "400px",
          pointerEvents: "auto",
        }}
      >
        {alerts.slice(-3).map((alert, index) => (
          <div
            key={alert.timestamp}
            style={{
              background: alert.severity === "CRITICAL" ? "#ef4444" : "#f59e0b",
              color: "white",
              padding: "12px 16px",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              animation: "slideIn 0.3s ease-out",
              cursor: "pointer",
            }}
            onClick={() =>
              setAlerts((prev) =>
                prev.filter((a) => a.timestamp !== alert.timestamp)
              )
            }
          >
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
              {alert.type}
            </div>
            <div>{alert.message}</div>
            <div style={{ fontSize: "10px", opacity: 0.8, marginTop: "4px" }}>
              Click to dismiss
            </div>
          </div>
        ))}
      </div>

      {/* Inline CSS for animations */}
      <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
    </div>
  );
};

export default OmniWatchdog;
