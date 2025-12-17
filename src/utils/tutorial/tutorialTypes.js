/**
 * Type definitions for tutorial system
 *
 * @typedef {Object} TutorialStep
 * @property {string} id - Unique step identifier
 * @property {string} title - Step title
 * @property {string} content - Step description (supports **bold** markdown)
 * @property {string|null} target - CSS selector for element to highlight
 * @property {'top'|'bottom'|'left'|'right'|'center'} position - Tooltip position
 * @property {string} [scenarioId] - Parent scenario ID
 * @property {number} [order] - Explicit ordering
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
