/**
 * Tutorial scenarios with metadata
 * @typedef {import('./tutorial/tutorialTypes').TutorialScenario} TutorialScenario
 * @typedef {import('./tutorial/tutorialTypes').TutorialStep} TutorialStep
 */

export const TUTORIAL_SCENARIOS = {
  // 1. Welcome Tour (Landing Page) - Enhanced to 5 steps
  welcome: {
    id: "welcome",
    label: "Welcome Tour",
    description: "Complete onboarding guide to the main layout and features",
    tags: ["beginner", "overview"],
    steps: [
      {
        id: "welcome",
        title: "Welcome to UE5 Question Generator",
        content:
          "This AI-powered tool helps you create, review, and manage high-quality Unreal Engine 5 assessment questions. Features include **multi-language translation**, **AI quality scoring**, and **Google Sheets integration**. Let's explore!",
        target: null,
        position: "center",
        scenarioId: "welcome",
        order: 0,
      },
      {
        id: "modes",
        title: "Step 1: Choose Your Workflow Mode",
        content:
          "The sidebar shows four main modes: **Creation** (generate new questions with AI), **Review** (verify and improve questions), **Database** (manage your question bank), and **Analytics** (track metrics and costs).",
        target: '[data-tour="create-mode"]',
        position: "right",
        scenarioId: "welcome",
        order: 1,
      },
      {
        id: "sidebar-nav",
        title: "Step 2: Navigation & Settings",
        content:
          "Use the sidebar to switch between modes. Access **Settings** for API configuration and **Admin Panel** (if you have admin rights) for user management and invite codes.",
        target: '[data-tour="sidebar"]',
        position: "right",
        scenarioId: "welcome",
        order: 2,
      },
      {
        id: "tutorial-system",
        title: "Step 3: Tutorial System",
        content:
          "Click the **Tutorial** button (📚) in the header anytime to access guided tours for each mode. Press **Esc** to exit any tutorial. Your progress is automatically saved.",
        target: '[data-tour="tutorial-button"]',
        position: "bottom",
        scenarioId: "welcome",
        order: 3,
      },
      {
        id: "get-started",
        title: "Step 4: Ready to Start!",
        content:
          "Click **Creation Mode** in the sidebar to start generating questions. The Creation Mode tutorial will guide you through your first question batch. Good luck!",
        target: '[data-tour="create-mode"]',
        position: "right",
        scenarioId: "welcome",
        order: 4,
      },
    ],
  },

  // 2. Creation Mode Tour - Simplified to 5 steps
  create: {
    id: "create",
    label: "Creation Mode",
    description: "Learn how to generate questions with AI",
    tags: ["beginner", "create-flow"],
    steps: [
      {
        id: "settings",
        title: "Step 1: Configure Your Questions",
        content:
          "Choose **Discipline** (e.g., Blueprints, C++), **Difficulty** (Beginner/Expert), and **Type** (Multiple Choice or True/False).",
        target: '[data-tour="discipline-selector"]',
        position: "right",
        scenarioId: "create",
        order: 0,
      },
      {
        id: "inventory",
        title: "Step 2: Check Your Inventory",
        content:
          "This chart shows your current question bank by difficulty and type. Use it to identify gaps.",
        target: '[data-tour="inventory-chart"]',
        position: "right",
        scenarioId: "create",
        order: 1,
      },
      {
        id: "advanced",
        title: "Step 3: Advanced Options (Optional)",
        content:
          "Expand **Focus & Model** to narrow topics with tags or select different AI models.",
        target: '[data-tour="advanced-settings"]',
        position: "right",
        scenarioId: "create",
        order: 2,
      },
      {
        id: "generate",
        title: "Step 4: Generate Questions",
        content:
          "Click **Generate Questions** to start. The AI will create questions based on your settings.",
        target: '[data-tour="generate-button"]',
        position: "top",
        scenarioId: "create",
        order: 3,
      },
      {
        id: "results",
        title: "Step 5: Review Results",
        content:
          "Generated questions appear here. Click any question to see details. Move to **Review Mode** to verify them.",
        target: '[data-tour="review-area"]',
        position: "left",
        scenarioId: "create",
        order: 4,
      },
    ],
  },

  // 3. Review Mode Tour - Enhanced to 6 steps
  review: {
    id: "review",
    label: "Review Mode",
    description: "Master the question verification and improvement process",
    tags: ["beginner", "review-flow"],
    steps: [
      {
        id: "discipline-filter",
        title: "Step 1: Select Discipline to Review",
        content:
          "Use the **Discipline** dropdown to filter questions by topic (e.g., Blueprints, C++, Lighting, Materials). This focuses your review session on one subject area at a time.",
        target: '[data-tour="discipline-selector"]',
        position: "right",
        scenarioId: "review",
        order: 0,
      },
      {
        id: "review-card",
        title: "Step 2: Question Card Details",
        content:
          "The card displays the question text, all answer options (with the correct one marked), difficulty level, question type, and source URL. Review each element carefully for accuracy.",
        target: '[data-tour="review-card"]',
        position: "right",
        scenarioId: "review",
        order: 1,
      },
      {
        id: "navigation",
        title: "Step 3: Navigate Questions",
        content:
          "Use **Prev/Next** buttons or keyboard arrows (**←** **→**) to move between questions. Press **Space** to expand details. Press **Esc** to exit the tutorial anytime.",
        target: '[data-tour="next-button"]',
        position: "bottom",
        scenarioId: "review",
        order: 2,
      },
      {
        id: "critique",
        title: "Step 4: AI Quality Check",
        content:
          "Click **Critique** to analyze question quality. AI provides a score (0-100): **75+** = Excellent, **50-74** = Good, **Below 50** = Needs improvement. Review suggestions for enhancements.",
        target: '[data-tour="critique-button"]',
        position: "bottom",
        scenarioId: "review",
        order: 3,
      },
      {
        id: "edit-improve",
        title: "Step 5: Edit or Apply AI Improvements",
        content:
          "Click **Edit** to manually modify the question, or **Apply Improvements** to accept AI suggestions. You can also translate, explain, or create variations using the action buttons.",
        target: '[data-tour="edit-button"]',
        position: "bottom",
        scenarioId: "review",
        order: 4,
      },
      {
        id: "accept-reject",
        title: "Step 6: Accept or Reject",
        content:
          "Click **ACCEPT** to approve quality questions or **REJECT** for poor ones. When rejecting, choose a reason (e.g., Inaccurate, Too Easy, Ambiguous) to help improve future AI generation.",
        target: '[data-tour="review-actions"]',
        position: "top",
        scenarioId: "review",
        order: 5,
      },
    ],
  },

  // 4. Database Mode Tour - Simplified to match actual features (4 steps)
  database: {
    id: "database",
    label: "Database Mode",
    description: "View and manage your question bank",
    tags: ["intermediate", "database"],
    steps: [
      {
        id: "db-overview",
        title: "Step 1: Database Overview",
        content:
          "This view displays all questions from Firestore. You'll see question text, type (Multiple Choice/True-False), difficulty, discipline, and AI score for each question.",
        target: '[data-tour="database-grid"]',
        position: "center",
        scenarioId: "database",
        order: 0,
      },
      {
        id: "metrics",
        title: "Step 2: Metrics Dashboard",
        content:
          "The **Metrics Dashboard** shows statistics about your question bank: total questions, breakdown by discipline, difficulty distribution, and average AI scores.",
        target: null,
        position: "center",
        scenarioId: "database",
        order: 1,
      },
      {
        id: "view-details",
        title: "Step 3: View Question Details",
        content:
          "Click any question card to expand and see full details including all answer options, explanation, tags, source URL, and creation date.",
        target: '[data-tour="database-grid"]',
        position: "center",
        scenarioId: "database",
        order: 2,
      },
      {
        id: "edit-kickback",
        title: "Step 4: Edit or Kick Back to Review",
        content:
          "Use **Edit** to modify question details, or **Kick Back to Review** to send a question back to pending status for re-evaluation.",
        target: '[data-tour="database-grid"]',
        position: "center",
        scenarioId: "database",
        order: 3,
      },
    ],
  },

  // 5. Analytics Mode Tour - Enhanced to 6 steps
  analytics: {
    id: "analytics",
    label: "Analytics Mode",
    description: "Track metrics, analyze quality, and optimize your workflow",
    tags: ["intermediate", "analytics"],
    steps: [
      {
        id: "analytics-dashboard",
        title: "Step 1: Dashboard Overview",
        content:
          "The dashboard shows key metrics: **Total Questions** (accepted/rejected), **Average AI Score**, **Token Usage**, and **Estimated Costs**. Use these to track your progress.",
        target: '[data-tour="analytics-overview"]',
        position: "center",
        scenarioId: "analytics",
        order: 0,
      },
      {
        id: "disciplines-tab",
        title: "Step 2: Discipline Breakdown",
        content:
          "See question counts by discipline (e.g., Blueprints: 45, C++: 32, Lighting: 18). Click any card to drill down into detailed statistics for that topic.",
        target: '[data-tour="disciplines-tab"]',
        position: "bottom",
        scenarioId: "analytics",
        order: 1,
      },
      {
        id: "quality-metrics",
        title: "Step 3: Quality Score Analysis",
        content:
          "View AI score distributions: **Excellent (75-100)**, **Good (50-74)**, **Needs Work (<50)**. High scores indicate quality questions ready for export.",
        target: '[data-tour="quality-chart"]',
        position: "bottom",
        scenarioId: "analytics",
        order: 2,
      },
      {
        id: "cost-tracking",
        title: "Step 4: API Cost Monitoring",
        content:
          "Track token usage and costs by operation (Generation, Critique, Translation). Monitor daily/weekly spending to stay within budget.",
        target: '[data-tour="cost-chart"]',
        position: "bottom",
        scenarioId: "analytics",
        order: 3,
      },
      {
        id: "optimization-tips",
        title: "Step 5: Cost Optimization Strategies",
        content:
          "**Reduce costs** by: Using Flash models for simple tasks, batching translations, limiting critique runs, and trimming source context. Check the **Settings** for model selection.",
        target: '[data-tour="optimization-panel"]',
        position: "bottom",
        scenarioId: "analytics",
        order: 4,
      },
      {
        id: "trends",
        title: "Step 6: Generation Trends & Insights",
        content:
          "Charts show generation activity over time (daily/weekly/monthly). Identify peak productivity periods and adjust your workflow for maximum efficiency.",
        target: '[data-tour="trends-chart"]',
        position: "center",
        scenarioId: "analytics",
        order: 5,
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
