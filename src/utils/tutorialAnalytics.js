import { logger } from "../utils/logger";
/**
 * Tutorial analytics and telemetry
 *
 * Tracks tutorial usage, completion, and user behavior to help improve
 * the tutorial experience and identify where users need help.
 */

const TUTORIAL_EVENTS = {
  STARTED: "tutorial_started",
  STEP_CHANGED: "tutorial_step_changed",
  COMPLETED: "tutorial_completed",
  SKIPPED: "tutorial_skipped",
  ELEMENT_NOT_FOUND: "tutorial_element_not_found",
  STEP_SKIPPED: "tutorial_step_skipped",
  ERROR: "tutorial_error",
};

/**
 * Log a tutorial event
 * @param {string} eventName - Event name from TUTORIAL_EVENTS
 * @param {Object} payload - Event data
 * @param {string} payload.scenarioId - Tutorial scenario ID
 * @param {string} [payload.stepId] - Current step ID
 * @param {number} [payload.stepIndex] - Current step index
 * @param {string} [payload.reason] - Reason for event (e.g., 'element_not_found')
 */
export const logTutorialEvent = (eventName, payload) => {
  const event = {
    event: eventName,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  // Console logging for development
  if (import.meta.env.DEV) {
    logger.log("[Tutorial Analytics]", event);
  }

  // NOTE: Analytics service integration - currently using localStorage for debugging
  // When ready: analytics.logEvent(eventName, payload);

  try {
    const key = "ue5_tutorial_events";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push(event);

    // Keep only last 100 events to avoid localStorage bloat
    if (existing.length > 100) {
      existing.shift();
    }

    localStorage.setItem(key, JSON.stringify(existing));
  } catch (error) {
    // Silently fail if localStorage is unavailable
    logger.warn("Failed to log tutorial event:", error);
  }
};

export { TUTORIAL_EVENTS };
