/**
 * AuditLogs - View system activity and audit trail
 *
 * Displays recent activity from:
 * - apiUsage collection (API calls)
 * - inviteAttempts collection (invite validations)
 */

import React, { useState } from "react";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { logger } from "../../utils/logger";
import { useThemeColors } from "../../hooks/useThemeColors";

// Constants for query limits
const LOGS_PER_COLLECTION = 25;
const MAX_TOTAL_LOGS = 50;

const AuditLogs = ({ isCollapsed, onToggle }) => {
  const [logs, setLogs] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { eventColor } = useThemeColors();

  const loadAuditLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const combinedLogs = [];

      // Fetch apiUsage logs
      try {
        const apiUsageQuery = query(
          collection(db, "apiUsage"),
          orderBy("timestamp", "desc"),
          limit(LOGS_PER_COLLECTION)
        );
        const apiUsageSnapshot = await getDocs(apiUsageQuery);
        apiUsageSnapshot.forEach((doc) => {
          const data = doc.data();
          combinedLogs.push({
            id: doc.id,
            type: "api",
            action: data.type || "api_call",
            userId: data.userId,
            model: data.model,
            timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
            details: `Model: ${data.model || "unknown"}`,
          });
        });
      } catch (err) {
        logger.warn("Could not fetch apiUsage:", err.message);
      }

      // Fetch inviteAttempts logs
      try {
        const inviteAttemptsQuery = query(
          collection(db, "inviteAttempts"),
          orderBy("lastAttempt", "desc"),
          limit(LOGS_PER_COLLECTION)
        );
        const inviteAttemptsSnapshot = await getDocs(inviteAttemptsQuery);
        inviteAttemptsSnapshot.forEach((doc) => {
          const data = doc.data();
          combinedLogs.push({
            id: doc.id,
            type: "invite",
            action: data.lockedUntil ? "invite_lockout" : "invite_attempt",
            clientId: doc.id,
            attempts: data.attempts,
            timestamp: data.lastAttempt?.toDate?.() || new Date(),
            details: `${data.attempts} attempts${
              data.lockedUntil ? " (locked)" : ""
            }`,
          });
        });
      } catch (err) {
        logger.warn("Could not fetch inviteAttempts:", err.message);
      }

      // Sort by timestamp (newest first)
      combinedLogs.sort((a, b) => b.timestamp - a.timestamp);

      setLogs(combinedLogs.slice(0, MAX_TOTAL_LOGS)); // Limit to max total
    } catch (err) {
      logger.error("Failed to load audit logs:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (type) => {
    switch (type) {
      case "api":
        return <Icon name="zap" size={14} className="text-yellow-400" />;
      case "invite":
        return <Icon name="mail" size={14} className="text-blue-400" />;
      default:
        return <Icon name="activity" size={14} className="text-slate-400" />;
    }
  };

  // Event badge colors are now centralized in themeColors.js
  const getActionBadge = (action) => eventColor(action);

  const formatTimestamp = (date) => {
    if (!date) return "Unknown";
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return "Invalid date";
    }
  };

  return (
    <CollapsibleSection
      title="Audit Logs"
      icon="file-text"
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      variant="orange"
    >
      <div className="space-y-4">
        {/* Load Button */}
        {!logs && (
          <button
            onClick={loadAuditLogs}
            disabled={isLoading}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-600 text-white px-4 py-2 rounded font-bold transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Icon name="loader" className="animate-spin" size={16} />
                Loading Logs...
              </>
            ) : (
              <>
                <Icon name="file-text" size={16} />
                Load Audit Logs
              </>
            )}
          </button>
        )}

        {/* Error State */}
        {error && (
          <div className="p-3 rounded bg-red-900/30 border border-red-500/30 text-red-300 text-sm">
            <Icon name="alert-circle" size={14} className="inline mr-2" />
            {error}
          </div>
        )}

        {/* Logs List */}
        {logs && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">
                Showing {logs.length} recent events
              </span>
              <button
                onClick={loadAuditLogs}
                disabled={isLoading}
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                <Icon name="refresh-cw" size={12} className="inline mr-1" />
                Refresh
              </button>
            </div>

            {logs.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">
                No audit logs found
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-slate-700/50 p-2 rounded flex items-center gap-3 text-sm"
                  >
                    {getActionIcon(log.type)}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${getActionBadge(
                        log.action
                      )}`}
                    >
                      {log.action.replace("_", " ")}
                    </span>
                    <span className="text-slate-300 flex-1 truncate">
                      {log.details}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500 text-center">
          Displays recent API usage and invite validation attempts
        </p>
      </div>
    </CollapsibleSection>
  );
};

export default AuditLogs;
