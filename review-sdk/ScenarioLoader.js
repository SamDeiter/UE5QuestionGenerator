/**
 * ScenarioLoader.js
 * Loads scenarios from various sources for Reviewport integration.
 * Can load from local JSON files or remote APIs.
 */
/* global fetch */

export class ScenarioLoader {
  /**
   * Load scenarios from the Scenario Tracker's raw_data.json
   * @param {string} url - URL to raw_data.json (can be relative or absolute)
   * @returns {Promise<Array>} - Array of review items
   */
  static async loadFromRawData(url = "/raw_data.json") {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load scenarios: ${response.status}`);
      }

      const rawData = await response.json();
      return this.mapRawDataToReviewItems(rawData);
    } catch (error) {
      console.error("ScenarioLoader: Failed to load raw_data.json", error);
      return [];
    }
  }

  /**
   * Map raw_data.json format to ReviewCore item format
   * @param {Array} rawData - Array of scenario objects from raw_data.json
   * @returns {Array} - Array of review items
   */
  static mapRawDataToReviewItems(rawData) {
    return rawData.map((entry, index) => {
      const scenario = entry.scenario;
      const key = entry.key;

      // Parse difficulty from key (e.g., "LightingRendering_Beginner" -> "Beginner")
      const difficultyMatch = key.match(/_([A-Za-z]+)$/);
      const difficulty = difficultyMatch ? difficultyMatch[1] : "Unknown";

      // Extract expected issues from common_wrong_steps
      const expectedIssues = (scenario.common_wrong_steps || [])
        .slice(0, 3)
        .map((step) => {
          // Extract a short summary from the step description
          const words = step.step_description.split(" ").slice(0, 5).join(" ");
          return words + "...";
        });

      return {
        id: scenario.scenario_id || `scenario-${index}`,
        title: scenario.title,
        description: scenario.problem_description,
        metadata: {
          key: key,
          difficulty: difficulty,
          focusArea: scenario.focus_area,
          estimatedHours: scenario.estimated_hours,
          expectedIssues: expectedIssues,
          correctStepsCount: (scenario.correct_solution_steps || []).length,
          wrongStepsCount: (scenario.common_wrong_steps || []).length,
        },
        // Full data for detailed view
        fullData: scenario,
      };
    });
  }

  /**
   * Group scenarios by focus area
   * @param {Array} items - Array of review items
   * @returns {Object} - Object with focus areas as keys
   */
  static groupByFocusArea(items) {
    return items.reduce((groups, item) => {
      const area = item.metadata.focusArea || "Other";
      if (!groups[area]) {
        groups[area] = [];
      }
      groups[area].push(item);
      return groups;
    }, {});
  }

  /**
   * Filter scenarios by difficulty
   * @param {Array} items - Array of review items
   * @param {string} difficulty - 'Beginner', 'Intermediate', or 'Advanced'
   * @returns {Array} - Filtered array
   */
  static filterByDifficulty(items, difficulty) {
    return items.filter(
      (item) =>
        item.metadata.difficulty.toLowerCase() === difficulty.toLowerCase(),
    );
  }
}

// Make available globally for non-module contexts
if (typeof window !== "undefined") {
  window.ScenarioLoader = ScenarioLoader;
}
