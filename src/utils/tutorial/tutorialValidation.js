/**
 * Validation for tutorial scenarios and steps
 */

const VALID_POSITIONS = ["top", "bottom", "left", "right", "center"];

/**
 * Validate a single tutorial step
 * @param {Object} step - Step to validate
 * @param {string} scenarioId - Parent scenario ID
 * @param {number} stepIndex - Step index in array
 * @returns {string[]} Array of error messages
 */
export const validateStep = (step, scenarioId, stepIndex) => {
  const errors = [];

  if (!step.id || typeof step.id !== "string") {
    errors.push(`Step ${stepIndex} in ${scenarioId}: missing or invalid 'id'`);
  }
  if (!step.title || typeof step.title !== "string") {
    errors.push(
      `Step ${stepIndex} in ${scenarioId}: missing or invalid 'title'`
    );
  }
  if (!step.content || typeof step.content !== "string") {
    errors.push(
      `Step ${stepIndex} in ${scenarioId}: missing or invalid 'content'`
    );
  }
  if (step.target !== null && typeof step.target !== "string") {
    errors.push(
      `Step ${stepIndex} in ${scenarioId}: 'target' must be string or null`
    );
  }
  if (!VALID_POSITIONS.includes(step.position)) {
    errors.push(
      `Step ${stepIndex} in ${scenarioId}: invalid 'position' (${step.position})`
    );
  }

  return errors;
};

/**
 * Validate a tutorial scenario
 * @param {Object} scenario - Scenario to validate
 * @param {string} scenarioId - Scenario ID
 * @returns {string[]} Array of error messages
 */
export const validateScenario = (scenario, scenarioId) => {
  const errors = [];

  if (!scenario) {
    errors.push(`Scenario ${scenarioId}: scenario is null or undefined`);
    return errors;
  }

  if (!Array.isArray(scenario.steps)) {
    errors.push(`Scenario ${scenarioId}: 'steps' must be an array`);
    return errors;
  }

  if (scenario.steps.length === 0) {
    errors.push(`Scenario ${scenarioId}: 'steps' array is empty`);
  }

  scenario.steps.forEach((step, index) => {
    errors.push(...validateStep(step, scenarioId, index));
  });

  return errors;
};

/**
 * Validate all scenarios in the TUTORIAL_SCENARIOS object
 * @param {Object} scenarios - TUTORIAL_SCENARIOS object
 * @returns {Object} Validation results by scenario ID
 */
export const validateAllScenarios = (scenarios) => {
  const results = {};

  Object.entries(scenarios).forEach(([id, scenario]) => {
    results[id] = validateScenario(scenario, id);
  });

  return results;
};
