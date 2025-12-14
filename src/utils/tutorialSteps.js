export const TUTORIAL_SCENARIOS = {
  // 1. Welcome Tour (Landing Page) - Simplified to 3 steps
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
      title: "Choose Your Mode",
      content:
        'Select **Creation** to generate new questions with AI, **Review** to verify and improve questions, or **Database** to view your question bank.',
      target: '[data-tour="create-mode"]',
      position: "bottom",
    },
    {
      id: "get-started",
      title: "Ready to Start!",
      content:
        'Click **Creation** to start generating questions. Use the **Tutorial** button in the header anytime you need help.',
      target: null,
      position: "center",
    },
  ],

  // 2. Creation Mode Tour - Simplified to 5 steps
  create: [
    {
      id: "settings",
      title: "Step 1: Configure Your Questions",
      content:
        "Choose **Discipline** (e.g., Blueprints, C++), **Difficulty** (Beginner/Expert), and **Type** (Multiple Choice or True/False).",
      target: '[data-tour="discipline-selector"]',
      position: "right",
    },
    {
      id: "inventory",
      title: "Step 2: Check Your Inventory",
      content:
        "This chart shows your current question bank by difficulty and type. Use it to identify gaps.",
      target: '[data-tour="inventory-chart"]',
      position: "right",
    },
    {
      id: "advanced",
      title: "Step 3: Advanced Options (Optional)",
      content:
        'Expand **Focus & Model** to narrow topics with tags or select different AI models.',
      target: '[data-tour="advanced-settings"]',
      position: "right",
    },
    {
      id: "generate",
      title: "Step 4: Generate Questions",
      content:
        'Click **Generate Questions** to start. The AI will create questions based on your settings.',
      target: '[data-tour="generate-button"]',
      position: "top",
    },
    {
      id: "results",
      title: "Step 5: Review Results",
      content:
        "Generated questions appear here. Click any question to see details. Move to **Review Mode** to verify them.",
      target: '[data-tour="review-area"]',
      position: "left",
    },
  ],

  // 3. Review Mode Tour - Simplified to 5 steps
  review: [
    {
      id: "review-card",
      title: "Step 1: Question Card",
      content:
        "This shows the current question with all details: text, options, correct answer, difficulty, and source URL.",
      target: '[data-tour="review-card"]',
      position: "right",
    },
    {
      id: "navigation",
      title: "Step 2: Navigate Questions",
      content:
        "Use **Prev/Next** buttons or keyboard arrows (← →) to move between questions. Press **Esc** to close this tutorial.",
      target: '[data-tour="next-button"]',
      position: "bottom",
    },
    {
      id: "critique",
      title: "Step 3: AI Quality Check",
      content:
        'Click **Critique** to have AI analyze the question. It provides a score (0-100) and improvement suggestions.',
      target: '[data-tour="critique-button"]',
      position: "bottom",
    },
    {
      id: "reject",
      title: "Step 4: Reject Poor Questions",
      content:
        "Click **REJECT** for low-quality questions. Choose a reason (Too Easy, Incorrect, etc.) to improve future AI generation.",
      target: '[data-tour="review-actions"]',
      position: "top",
    },
    {
      id: "accept",
      title: "Step 5: Accept Verified Questions",
      content:
        "Click **ACCEPT** for questions that pass verification. Accepted questions move to your Database.",
      target: '[data-tour="review-actions"]',
      position: "top",
    },
  ],

  // 4. Database Mode Tour - Simplified to 4 steps
  database: [
    {
      id: "db-grid",
      title: "Step 1: Your Question Bank",
      content:
        "This grid shows all approved questions. Each row displays question text, type, difficulty, and status.",
      target: '[data-tour="database-grid"]',
      position: "center",
    },
    {
      id: "search",
      title: "Step 2: Search & Filter",
      content:
        "Use the search box to find specific questions. Filter by discipline, difficulty, or status.",
      target: '[data-tour="database-search"]',
      position: "bottom",
    },
    {
      id: "details",
      title: "Step 3: View Details",
      content:
        "Click any row to expand and see full details including all options and metadata.",
      target: '[data-tour="database-grid"]',
      position: "center",
    },
    {
      id: "export",
      title: "Step 4: Export Your Questions",
      content:
        'Click **Export** to download as CSV, sync to Google Sheets, or export for your LMS.',
      target: '[data-tour="export-menu"]',
      position: "bottom",
    },
  ],

  // 5. Analytics Mode Tour - Simplified to 4 steps
  analytics: [
    {
      id: "analytics-dashboard",
      title: "Step 1: Dashboard Overview",
      content:
        "View insights into your generation activity, quality metrics, and cost tracking.",
      target: null,
      position: "center",
    },
    {
      id: "disciplines-tab",
      title: "Step 2: Discipline Breakdown",
      content:
        "See question counts by discipline. Click any card to drill down into detailed statistics.",
      target: '[data-tour="disciplines-tab"]',
      position: "bottom",
    },
    {
      id: "quality-tab",
      title: "Step 3: Quality & Cost Tracking",
      content:
        "View score distributions from AI critiques and monitor API costs. Use this to optimize your workflow.",
      target: '[data-tour="quality-tab"]',
      position: "bottom",
    },
    {
      id: "trends",
      title: "Step 4: Generation Trends",
      content:
        "Charts show your generation activity over time. Identify patterns and optimize your strategy.",
      target: null,
      position: "center",
    },
  ],
};

// Default export for backward compatibility
export const TUTORIAL_STEPS = TUTORIAL_SCENARIOS.welcome;
