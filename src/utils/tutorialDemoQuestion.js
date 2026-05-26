/**
 * Demo Question for Tutorial Mode
 * A realistic UE5 Blueprint question with actual Epic documentation source
 * Used when the Review Mode tutorial runs with no real questions available
 */

const TUTORIAL_DEMO_QUESTION = {
  id: "tutorial-demo-question",
  uniqueId: "tutorial-demo-question",
  isTutorialDemo: true, // Flag to identify this as demo data

  // Question content - real UE5 Blueprint content
  question:
    "What is the primary purpose of the Event Graph in Unreal Engine 5 Blueprints?",
  type: "Multiple Choice",
  difficulty: "Intermediate",
  discipline: "Blueprints",

  // Answer options
  options: [
    "To define the visual appearance of actors in the level",
    "To handle events and execute gameplay logic in response to triggers",
    "To manage texture and material assets for the project",
    "To configure project build settings and packaging options",
  ],
  correct: 1, // Second option (0-indexed)

  // Source - Real Epic Games documentation link
  sourceUrl:
    "https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprints-visual-scripting-in-unreal-engine",
  sourceExcerpt:
    "The Event Graph contains a node graph that uses events and function calls to perform actions in response to gameplay events associated with the Blueprint.",

  // Initial state - not yet reviewed
  humanVerified: false,
  humanVerifiedBy: null,
  humanVerifiedAt: null,
  verificationSource: null,

  // Critique fields - start uncritiqued
  critiqueScore: null,
  critiqueAttempts: 0,
  critiqueFeedback: null,

  // Status
  status: "pending",
  createdAt: new Date().toISOString(),
  language: "en",

  // Metadata
  generatedBy: "Tutorial Demo",
  topics: ["Blueprints", "Event Graph", "Visual Scripting"],
};

/**
 * Generate a fresh demo question with current timestamp
 * @returns {Object} Demo question object
 */
export const createTutorialDemoQuestion = () => ({
  ...TUTORIAL_DEMO_QUESTION,
  createdAt: new Date().toISOString(),
});
