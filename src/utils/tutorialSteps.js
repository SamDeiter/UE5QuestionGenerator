/**
 * Tutorial scenarios with metadata - STREAMLINED VERSION
 * @typedef {import('./tutorial/tutorialTypes').TutorialScenario} TutorialScenario
 * @typedef {import('./tutorial/tutorialTypes').TutorialStep} TutorialStep
 */

export const TUTORIAL_SCENARIOS = {
  // 1. Welcome Tour - 3 steps
  welcome: {
    id: "welcome",
    label: "Welcome Tour",
    description: "Quick intro to the main features",
    tags: ["beginner", "overview"],
    steps: [
      {
        id: "welcome",
        title: "Welcome to UE5 Question Generator",
        content:
          "AI-powered tool for creating Unreal Engine 5 assessment questions with multi-language translation and quality scoring.",
        target: null,
        position: "center",
        scenarioId: "welcome",
        order: 0,
      },
      {
        id: "modes",
        title: "Four Workflow Modes",
        content:
          "**Create** → generate questions • **Review** → verify quality • **Database** → manage questions • **Analytics** → track metrics",
        target: '[data-tour="create-mode"]',
        position: "right",
        scenarioId: "welcome",
        order: 1,
      },
      {
        id: "get-started",
        title: "Ready to Start!",
        content:
          "Click **Creation Mode** to generate your first questions. Press **Esc** anytime to exit tutorials.",
        target: '[data-tour="create-mode"]',
        position: "right",
        scenarioId: "welcome",
        order: 2,
      },
    ],
  },

  // 2. Creation Mode - 3 steps
  create: {
    id: "create",
    label: "Creation Mode",
    description: "Generate questions with AI",
    tags: ["beginner", "create-flow"],
    steps: [
      {
        id: "settings",
        title: "Configure Your Questions",
        content:
          "Choose **Discipline** (Blueprints, C++, etc.), **Difficulty**, and **Type** (Multiple Choice or True/False).",
        target: '[data-tour="discipline-selector"]',
        position: "right",
        scenarioId: "create",
        order: 0,
      },
      {
        id: "generate",
        title: "Generate Questions",
        content:
          "Click **Generate Questions** to create a batch. The AI uses official UE5 documentation as source material.",
        target: '[data-tour="generate-button"]',
        position: "top",
        scenarioId: "create",
        order: 1,
      },
      {
        id: "results",
        title: "Review Your Results",
        content:
          "Generated questions appear below. Switch to **Review Mode** to verify quality and accept/reject them.",
        target: '[data-tour="review-area"]',
        position: "left",
        scenarioId: "create",
        order: 2,
      },
    ],
  },

  // 3. Review Mode - 3 steps
  review: {
    id: "review",
    label: "Review Mode",
    description: "Verify and approve questions",
    tags: ["beginner", "review-flow"],
    steps: [
      {
        id: "review-card",
        title: "Question Card",
        content:
          "Each card shows the question, answers, difficulty, and source. Use **arrow keys** or buttons to navigate.",
        target: '[data-tour="review-card"]',
        position: "right",
        scenarioId: "review",
        order: 0,
      },
      {
        id: "critique",
        title: "AI Quality Check",
        content:
          "Click **Critique** for AI scoring (75+ = Excellent). Then **Verify** the source is accurate.",
        target: '[data-tour="critique-button"]',
        position: "bottom",
        scenarioId: "review",
        order: 1,
      },
      {
        id: "accept-reject",
        title: "Accept or Reject",
        content:
          "**Accept** quality questions or **Reject** with a reason (Inaccurate, Too Easy, etc.) to improve future AI output.",
        target: '[data-tour="review-actions"]',
        position: "left",
        scenarioId: "review",
        order: 2,
      },
    ],
  },

  // 4. Database Mode - 3 steps
  database: {
    id: "database",
    label: "Database Mode",
    description: "View and manage your question bank",
    tags: ["intermediate", "database"],
    steps: [
      {
        id: "db-overview",
        title: "Your Question Bank",
        content:
          "Browse all accepted questions from Firestore. See question text, type, difficulty, and AI score.",
        target: null,
        position: "center",
        scenarioId: "database",
        order: 0,
      },
      {
        id: "metrics",
        title: "Metrics Dashboard",
        content:
          "View stats: total questions, breakdown by discipline, difficulty distribution, and average scores.",
        target: null,
        position: "center",
        scenarioId: "database",
        order: 1,
      },
      {
        id: "actions",
        title: "Edit or Kick Back",
        content:
          "Use **Edit** to modify questions or **Kick Back to Review** to send them back for re-evaluation.",
        target: null,
        position: "center",
        scenarioId: "database",
        order: 2,
      },
    ],
  },

  // 5. Analytics Mode - 3 steps
  analytics: {
    id: "analytics",
    label: "Analytics Mode",
    description: "Track metrics and costs",
    tags: ["intermediate", "analytics"],
    steps: [
      {
        id: "analytics-dashboard",
        title: "Dashboard Overview",
        content:
          "See **Total Questions**, **Average AI Score**, **Token Usage**, and **Estimated Costs** at a glance.",
        target: '[data-tour="analytics-overview"]',
        position: "center",
        scenarioId: "analytics",
        order: 0,
      },
      {
        id: "cost-tracking",
        title: "API Cost Monitoring",
        content:
          "Track token usage by operation (Generation, Critique, Translation). Monitor spending to stay on budget.",
        target: '[data-tour="cost-chart"]',
        position: "bottom",
        scenarioId: "analytics",
        order: 1,
      },
      {
        id: "optimization",
        title: "Optimize Your Workflow",
        content:
          "Use **Flash models** for speed, batch translations, and limit critiques to reduce costs.",
        target: '[data-tour="optimization-panel"]',
        position: "bottom",
        scenarioId: "analytics",
        order: 2,
      },
    ],
  },
};

/**
 * Get steps for a specific scenario
 * @param {string} scenarioId - Scenario identifier
 * @returns {TutorialStep[]} Array of steps
 */
export const getScenarioSteps = (scenarioId) => {
  return TUTORIAL_SCENARIOS[scenarioId]?.steps || [];
};

/**
 * Get all scenario IDs
 * @returns {string[]} Array of scenario IDs
 */
export const getScenarioIds = () => {
  return Object.keys(TUTORIAL_SCENARIOS);
};

// Legacy export for backward compatibility
export const TUTORIAL_STEPS = TUTORIAL_SCENARIOS.welcome.steps;
