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
    console.log("[Tutorial Analytics]", event);
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
    console.warn("Failed to log tutorial event:", error);
  }
};

/**
 * Get all logged tutorial events
 * @returns {Array<Object>} Array of tutorial events
 */
export const getTutorialEvents = () => {
  try {
    const key = "ue5_tutorial_events";
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

/**
 * Clear all tutorial events
 */
export const clearTutorialEvents = () => {
  try {
    localStorage.removeItem("ue5_tutorial_events");
  } catch (error) {
    console.warn("Failed to clear tutorial events:", error);
  }
};

/**
 * Get tutorial completion statistics
 * @returns {Object} Statistics object
 */
export const getTutorialStats = () => {
  const events = getTutorialEvents();

  const stats = {
    totalStarts: events.filter((e) => e.event === TUTORIAL_EVENTS.STARTED)
      .length,
    totalCompletions: events.filter(
      (e) => e.event === TUTORIAL_EVENTS.COMPLETED
    ).length,
    totalSkips: events.filter((e) => e.event === TUTORIAL_EVENTS.SKIPPED)
      .length,
    elementNotFoundCount: events.filter(
      (e) => e.event === TUTORIAL_EVENTS.ELEMENT_NOT_FOUND
    ).length,
    byScenario: {},
  };

  // Group by scenario
  events.forEach((event) => {
    if (event.scenarioId) {
      if (!stats.byScenario[event.scenarioId]) {
        stats.byScenario[event.scenarioId] = {
          starts: 0,
          completions: 0,
          skips: 0,
        };
      }

      if (event.event === TUTORIAL_EVENTS.STARTED) {
        stats.byScenario[event.scenarioId].starts++;
      } else if (event.event === TUTORIAL_EVENTS.COMPLETED) {
        stats.byScenario[event.scenarioId].completions++;
      } else if (event.event === TUTORIAL_EVENTS.SKIPPED) {
        stats.byScenario[event.scenarioId].skips++;
      }
    }
  });

  return stats;
};

export { TUTORIAL_EVENTS };
