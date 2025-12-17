/**
 * Type definitions for tutorial system
 *
 * @typedef {Object} TutorialStepAction
 * @property {'OPEN_PANEL'|'OPEN_MODAL'|'SWITCH_TAB'|'EXPAND_ELEMENT'|'CLOSE_PANEL'|'CLOSE_MODAL'} type - Action type
 * @property {string} [payload] - Action-specific data (e.g., panel ID, tab name)
 */

/**
 * @typedef {Object} TutorialStep
 * @property {string} id - Unique step identifier
 * @property {string} title - Step title
 * @property {string} content - Step description (supports **bold** markdown)
 * @property {string|null} target - CSS selector for element to highlight
 * @property {'top'|'bottom'|'left'|'right'|'center'} position - Tooltip position
 * @property {string} [scenarioId] - Parent scenario ID
 * @property {number} [order] - Explicit ordering
 * @property {TutorialStepAction} [action] - Optional action to execute when entering this step
 */

/**
 * @typedef {Object} TutorialScenario
 * @property {string} id - Scenario identifier
 * @property {string} label - Human-readable name
 * @property {string} description - Brief description
 * @property {string[]} [tags] - Optional tags for filtering
 * @property {TutorialStep[]} steps - Scenario steps
 */

export {};
