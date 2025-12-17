"""
AGENT T3 - Transform tutorialSteps.js to add metadata and normalize schema
"""
import json
import re

# Read the current file
with open(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\utils\tutorialSteps.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Define scenario metadata
scenarios_metadata = {
    'welcome': {
        'id': 'welcome',
        'label': 'Welcome Tour',
        'description': 'Quick overview of the main layout and features',
        'tags': ['beginner', 'overview']
    },
    'create': {
        'id': 'create',
        'label': 'Creation Mode',
        'description': 'Learn how to generate questions with AI',
        'tags': ['beginner', 'create-flow']
    },
    'review': {
        'id': 'review',
        'label': 'Review Mode',
        'description': 'Master the question verification process',
        'tags': ['beginner', 'review-flow']
    },
    'database': {
        'id': 'database',
        'label': 'Database Mode',
        'description': 'Manage your question bank effectively',
        'tags': ['intermediate', 'database']
    },
    'analytics': {
        'id': 'analytics',
        'label': 'Analytics Mode',
        'description': 'Track metrics and optimize your workflow',
        'tags': ['intermediate', 'analytics']
    }
}

# New file content with metadata structure
new_content = '''/**
 * Tutorial scenarios with metadata
 * @typedef {import('./tutorial/tutorialTypes').TutorialScenario} TutorialScenario
 * @typedef {import('./tutorial/tutorialTypes').TutorialStep} TutorialStep
 */

export const TUTORIAL_SCENARIOS = {
  // 1. Welcome Tour (Landing Page) - Simplified to 3 steps
  welcome: {
    id: 'welcome',
    label: 'Welcome Tour',
    description: 'Quick overview of the main layout and features',
    tags: ['beginner', 'overview'],
    steps: [
      {
        id: "welcome",
        title: "Welcome to UE5 Question Generator",
        content:
          "This tool helps you generate high-quality Unreal Engine 5 assessment questions using AI. Let's take a quick tour!",
        target: null,
        position: "center",
        scenarioId: 'welcome',
        order: 0
      },
      {
        id: "modes",
        title: "Choose Your Mode",
        content:
          'Select **Creation** to generate new questions with AI, **Review** to verify and improve questions, or **Database** to view your question bank.',
        target: '[data-tour="create-mode"]',
        position: "bottom",
        scenarioId: 'welcome',
        order: 1
      },
      {
        id: "get-started",
        title: "Ready to Start!",
        content:
          'Click **Creation** to start generating questions. Use the **Tutorial** button in the header anytime you need help.',
        target: null,
        position: "center",
        scenarioId: 'welcome',
        order: 2
      },
    ]
  },

  // 2. Creation Mode Tour - Simplified to 5 steps
  create: {
    id: 'create',
    label: 'Creation Mode',
    description: 'Learn how to generate questions with AI',
    tags: ['beginner', 'create-flow'],
    steps: [
      {
        id: "settings",
        title: "Step 1: Configure Your Questions",
        content:
          "Choose **Discipline** (e.g., Blueprints, C++), **Difficulty** (Beginner/Expert), and **Type** (Multiple Choice or True/False).",
        target: '[data-tour="discipline-selector"]',
        position: "right",
        scenarioId: 'create',
        order: 0
      },
      {
        id: "inventory",
        title: "Step 2: Check Your Inventory",
        content:
          "This chart shows your current question bank by difficulty and type. Use it to identify gaps.",
        target: '[data-tour="inventory-chart"]',
        position: "right",
        scenarioId: 'create',
        order: 1
      },
      {
        id: "advanced",
        title: "Step 3: Advanced Options (Optional)",
        content:
          'Expand **Focus & Model** to narrow topics with tags or select different AI models.',
        target: '[data-tour="advanced-settings"]',
        position: "right",
        scenarioId: 'create',
        order: 2
      },
      {
        id: "generate",
        title: "Step 4: Generate Questions",
        content:
          'Click **Generate Questions** to start. The AI will create questions based on your settings.',
        target: '[data-tour="generate-button"]',
        position: "top",
        scenarioId: 'create',
        order: 3
      },
      {
        id: "results",
        title: "Step 5: Review Results",
        content:
          "Generated questions appear here. Click any question to see details. Move to **Review Mode** to verify them.",
        target: '[data-tour="review-area"]',
        position: "left",
        scenarioId: 'create',
        order: 4
      },
    ]
  },

  // 3. Review Mode Tour - Simplified to 5 steps
  review: {
    id: 'review',
    label: 'Review Mode',
    description: 'Master the question verification process',
    tags: ['beginner', 'review-flow'],
    steps: [
      {
        id: "review-card",
        title: "Step 1: Question Card",
        content:
          "This shows the current question with all details: text, options, correct answer, difficulty, and source URL.",
        target: '[data-tour="review-card"]',
        position: "right",
        scenarioId: 'review',
        order: 0
      },
      {
        id: "navigation",
        title: "Step 2: Navigate Questions",
        content:
          "Use **Prev/Next** buttons or keyboard arrows (← →) to move between questions. Press **Esc** to close this tutorial.",
        target: '[data-tour="next-button"]',
        position: "bottom",
        scenarioId: 'review',
        order: 1
      },
      {
        id: "critique",
        title: "Step 3: AI Quality Check",
        content:
          'Click **Critique** to have AI analyze the question. It provides a score (0-100) and improvement suggestions.',
        target: '[data-tour="critique-button"]',
        position: "bottom",
        scenarioId: 'review',
        order: 2
      },
      {
        id: "reject",
        title: "Step 4: Reject Poor Questions",
        content:
          "Click **REJECT** for low-quality questions. Choose a reason (Too Easy, Incorrect, etc.) to improve future AI generation.",
        target: '[data-tour="review-actions"]',
        position: "top",
        scenarioId: 'review',
        order: 3
      },
      {
        id: "accept",
        title: "Step 5: Accept Verified Questions",
        content:
          "Click **ACCEPT** for questions that pass verification. Accepted questions move to your Database.",
        target: '[data-tour="review-actions"]',
        position: "top",
        scenarioId: 'review',
        order: 4
      },
    ]
  },

  // 4. Database Mode Tour - Simplified to 4 steps
  database: {
    id: 'database',
    label: 'Database Mode',
    description: 'Manage your question bank effectively',
    tags: ['intermediate', 'database'],
    steps: [
      {
        id: "db-grid",
        title: "Step 1: Your Question Bank",
        content:
          "This grid shows all approved questions. Each row displays question text, type, difficulty, and status.",
        target: '[data-tour="database-grid"]',
        position: "center",
        scenarioId: 'database',
        order: 0
      },
      {
        id: "search",
        title: "Step 2: Search & Filter",
        content:
          "Use the search box to find specific questions. Filter by discipline, difficulty, or status.",
        target: '[data-tour="database-search"]',
        position: "bottom",
        scenarioId: 'database',
        order: 1
      },
      {
        id: "details",
        title: "Step 3: View Details",
        content:
          "Click any row to expand and see full details including all options and metadata.",
        target: '[data-tour="database-grid"]',
        position: "center",
        scenarioId: 'database',
        order: 2
      },
      {
        id: "export",
        title: "Step 4: Export Your Questions",
        content:
          'Click **Export** to download as CSV, sync to Google Sheets, or export for your LMS.',
        target: '[data-tour="export-menu"]',
        position: "bottom",
        scenarioId: 'database',
        order: 3
      },
    ]
  },

  // 5. Analytics Mode Tour - Simplified to 4 steps
  analytics: {
    id: 'analytics',
    label: 'Analytics Mode',
    description: 'Track metrics and optimize your workflow',
    tags: ['intermediate', 'analytics'],
    steps: [
      {
        id: "analytics-dashboard",
        title: "Step 1: Dashboard Overview",
        content:
          "View insights into your generation activity, quality metrics, and cost tracking.",
        target: null,
        position: "center",
        scenarioId: 'analytics',
        order: 0
      },
      {
        id: "disciplines-tab",
        title: "Step 2: Discipline Breakdown",
        content:
          "See question counts by discipline. Click any card to drill down into detailed statistics.",
        target: '[data-tour="disciplines-tab"]',
        position: "bottom",
        scenarioId: 'analytics',
        order: 1
      },
      {
        id: "quality-tab",
        title: "Step 3: Quality & Cost Tracking",
        content:
          "View score distributions from AI critiques and monitor API costs. Use this to optimize your workflow.",
        target: '[data-tour="quality-tab"]',
        position: "bottom",
        scenarioId: 'analytics',
        order: 2
      },
      {
        id: "trends",
        title: "Step 4: Generation Trends",
        content:
          "Charts show your generation activity over time. Identify patterns and optimize your strategy.",
        target: null,
        position: "center",
        scenarioId: 'analytics',
        order: 3
      },
    ]
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
'''

# Write the new file
with open(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\utils\tutorialSteps.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✅ AGENT T3 Complete: tutorialSteps.js transformed with metadata and normalized schema")
