export const TUTORIAL_SCENARIOS = {
  // 1. General Welcome Tour (Landing Page) - Expanded from 2 to 5 steps
  welcome: [
    {
      id: "welcome",
      title: "Welcome to UE5 Question Generator",
      content:
        "This tool helps you generate high-quality Unreal Engine 5 assessment questions using AI. Let's take a quick tour!",
      target: null,
      position: "center",
    },
    {
      id: "modes",
      title: "Application Modes",
      content:
        'Choose a mode to start: "Creation" for AI generation, "Review" for quality control, or "Database" to view your saved question bank.',
      target: '[data-tour="create-mode"]',
      position: "bottom",
    },
    {
      id: "header-info",
      title: "Status & Token Usage",
      content:
        "The header shows your API status, token usage, and cost tracking. Keep an eye on this to monitor your generation costs.",
      target: null,
      position: "center",
    },
    {
      id: "tutorial-button",
      title: "Need Help?",
      content:
        'You can restart this tutorial anytime by clicking the "Tutorial" button in the header. Each mode has its own contextual tutorial.',
      target: null,
      position: "center",
    },
    {
      id: "get-started",
      title: "Ready to Start!",
      content:
        'Click on "Creation" mode to start generating questions, or explore "Database" to view existing questions. Happy question crafting!',
      target: null,
      position: "center",
    },
  ],

  // 2. Creation Mode Tour - Expanded from 3 to 8 steps
  create: [
    {
      id: "discipline",
      title: "Step 1: Select a Discipline",
      content:
        "Start by choosing the UE5 discipline you want to generate questions for (e.g., Blueprints, C++, Lighting). This focuses the AI on relevant topics.",
      target: '[data-tour="discipline-selector"]',
      position: "right",
    },
    {
      id: "difficulty",
      title: "Step 2: Set Difficulty Level",
      content:
        "Choose Beginner, Intermediate, or Expert difficulty. This controls how challenging the generated questions will be.",
      target: '[data-tour="difficulty-selector"]',
      position: "right",
    },
    {
      id: "type",
      title: "Step 3: Question Type",
      content:
        'Select "Multiple Choice" for 4-option questions or "True/False" for binary questions. Mix both for a balanced assessment.',
      target: '[data-tour="type-selector"]',
      position: "right",
    },
    {
      id: "inventory",
      title: "Step 4: Inventory Overview",
      content:
        "This chart shows your current question inventory by difficulty and type. Use it to identify gaps in your question bank.",
      target: '[data-tour="inventory-chart"]',
      position: "right",
    },
    {
      id: "advanced",
      title: "Step 5: Advanced Settings",
      content:
        'Expand "Focus & Model" for advanced options: Focus Tags to narrow topics, and AI Model selection for different generation behaviors.',
      target: '[data-tour="advanced-settings"]',
      position: "right",
    },
    {
      id: "custom-rules",
      title: "Step 6: Custom Rules (Optional)",
      content:
        "Add specific constraints or requirements for question generation. For example: 'No code snippets' or 'Focus on UE5.3 features'.",
      target: '[data-tour="file-upload"]',
      position: "right",
    },
    {
      id: "generate",
      title: "Step 7: Generate Questions",
      content:
        'Click "Generate Questions" to start the AI process. The button shows a progress indicator while generating.',
      target: '[data-tour="generate-button"]',
      position: "top",
    },
    {
      id: "results",
      title: "Step 8: Review Results",
      content:
        "Generated questions appear in the main area. Each shows the question text, options, and metadata. Click any question to expand details.",
      target: '[data-tour="review-area"]',
      position: "left",
    },
  ],

  // 3. Review Mode Tour - Expanded from 3 to 7 steps
  review: [
    {
      id: "review-nav",
      title: "Step 1: Navigation Controls",
      content:
        "Use the navigation bar to move between questions. The counter shows your current position in the review queue.",
      target: '[data-tour="review-nav"]',
      position: "bottom",
    },
    {
      id: "review-card",
      title: "Step 2: Question Card",
      content:
        "This card displays the current question with all its details: text, options, correct answer, difficulty, and source URL.",
      target: '[data-tour="review-card"]',
      position: "right",
    },
    {
      id: "prev-next",
      title: "Step 3: Previous & Next",
      content:
        "Use the Prev/Next buttons or keyboard arrows to navigate quickly between questions in your review queue.",
      target: '[data-tour="next-button"]',
      position: "bottom",
    },
    {
      id: "critique",
      title: "Step 4: AI Critique",
      content:
        'Click "Critique" to have AI analyze the question quality. It provides a score (0-100) and specific improvement suggestions.',
      target: '[data-tour="critique-button"]',
      position: "bottom",
    },
    {
      id: "verify",
      title: "Step 5: Verify Before Accepting",
      content:
        "Before accepting, verify the source URL and answer accuracy. Click the shield icon to mark as human-verified.",
      target: '[data-tour="review-card"]',
      position: "right",
    },
    {
      id: "actions",
      title: "Step 6: Accept or Reject",
      content:
        "Accept verified questions (score 70+) to move them to the Database. Reject poor questions with a reason for tracking.",
      target: '[data-tour="review-actions"]',
      position: "top",
    },
    {
      id: "edit",
      title: "Step 7: Edit & Improve",
      content:
        "Click the edit icon to manually modify question text, options, or metadata. Apply AI-suggested rewrites with one click.",
      target: '[data-tour="review-card"]',
      position: "right",
    },
  ],

  // 4. Database Mode Tour - Expanded from 2 to 5 steps
  database: [
    {
      id: "db-grid",
      title: "Step 1: Question Bank",
      content:
        "This grid shows all your approved questions. Each row displays key info: question text, type, difficulty, and status.",
      target: '[data-tour="database-grid"]',
      position: "center",
    },
    {
      id: "search",
      title: "Step 2: Search & Filter",
      content:
        "Use the search box to find specific questions. Filter by discipline, difficulty, or status to narrow your view.",
      target: '[data-tour="database-search"]',
      position: "bottom",
    },
    {
      id: "details",
      title: "Step 3: View Details",
      content:
        "Click any question row to expand and see full details including all answer options, source URL, and metadata.",
      target: '[data-tour="database-grid"]',
      position: "center",
    },
    {
      id: "bulk",
      title: "Step 4: Bulk Actions",
      content:
        "Select multiple questions to perform bulk operations like export, delete, or status changes.",
      target: '[data-tour="database-actions"]',
      position: "bottom",
    },
    {
      id: "export",
      title: "Step 5: Export Options",
      content:
        'Click "Export" to download your questions as CSV, sync to Google Sheets, or export in other formats for your LMS.',
      target: '[data-tour="export-menu"]',
      position: "bottom",
    },
  ],

  // 5. Analytics Mode Tour - Expanded from 2 to 5 steps
  analytics: [
    {
      id: "analytics-dashboard",
      title: "Step 1: Dashboard Overview",
      content:
        "The Analytics Dashboard provides insights into your question generation activity, quality metrics, and cost tracking.",
      target: null,
      position: "center",
    },
    {
      id: "disciplines-tab",
      title: "Step 2: Discipline Breakdown",
      content:
        "View question counts by discipline. Click any discipline card to drill down into detailed statistics.",
      target: '[data-tour="disciplines-tab"]',
      position: "bottom",
    },
    {
      id: "quality-tab",
      title: "Step 3: Quality Metrics",
      content:
        "The Quality tab shows score distributions from AI critiques. Use this to identify areas needing improvement.",
      target: '[data-tour="quality-tab"]',
      position: "bottom",
    },
    {
      id: "token-stats",
      title: "Step 4: Token & Cost Tracking",
      content:
        "Monitor your API usage with token counts and estimated costs. Track trends over time to optimize your workflow.",
      target: '[data-tour="token-stats"]',
      position: "top",
    },
    {
      id: "trends",
      title: "Step 5: Generation Trends",
      content:
        "Charts show your generation activity over time. Identify patterns and optimize your question creation strategy.",
      target: null,
      position: "center",
    },
  ],
};

// Default export for backward compatibility
export const TUTORIAL_STEPS = TUTORIAL_SCENARIOS.welcome;
