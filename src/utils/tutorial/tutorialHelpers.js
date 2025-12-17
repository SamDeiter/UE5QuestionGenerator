/**
 * Helper functions for tutorial completion tracking
 */

export const TUTORIAL_STORAGE_PREFIX = "ue5_tutorial_";

/**
 * Check if a scenario has been completed
 * @param {string} scenarioId - Scenario identifier
 * @returns {boolean} True if completed
 */
export const isScenarioCompleted = (scenarioId) => {
  const key = `${TUTORIAL_STORAGE_PREFIX}${scenarioId}_completed`;
  const data = localStorage.getItem(key);
  if (!data) return false;

  try {
    const parsed = JSON.parse(data);
    return parsed.completed === true;
  } catch {
    // Backward compatibility with old boolean string format
    return data === "true";
  }
};

/**
 * Get completion information for a scenario
 * @param {string} scenarioId - Scenario identifier
 * @returns {Object} Completion info with completed flag and timestamp
 */
export const getScenarioCompletionInfo = (scenarioId) => {
  const key = `${TUTORIAL_STORAGE_PREFIX}${scenarioId}_completed`;
  const data = localStorage.getItem(key);
  if (!data) return { completed: false };

  try {
    return JSON.parse(data);
  } catch {
    // Backward compatibility
    return { completed: data === "true" };
  }
};

/**
 * Mark a scenario as completed
 * @param {string} scenarioId - Scenario identifier
 */
export const setScenarioCompleted = (scenarioId) => {
  const key = `${TUTORIAL_STORAGE_PREFIX}${scenarioId}_completed`;
  const data = {
    completed: true,
    completedAt: new Date().toISOString(),
  };
  localStorage.setItem(key, JSON.stringify(data));
};

/**
 * Clear completion status for a scenario
 * @param {string} scenarioId - Scenario identifier
 */
export const clearScenarioCompletion = (scenarioId) => {
  const key = `${TUTORIAL_STORAGE_PREFIX}${scenarioId}_completed`;
  localStorage.removeItem(key);
};

/**
 * Get all completed scenario IDs
 * @returns {string[]} Array of completed scenario IDs
 */
export const getCompletedScenarios = () => {
  const completed = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      key.startsWith(TUTORIAL_STORAGE_PREFIX) &&
      key.endsWith("_completed")
    ) {
      const scenarioId = key
        .replace(TUTORIAL_STORAGE_PREFIX, "")
        .replace("_completed", "");
      if (isScenarioCompleted(scenarioId)) {
        completed.push(scenarioId);
      }
    }
  }
  return completed;
};
